import net from 'node:net';
import crypto from 'node:crypto';
import { ulid } from 'ulid';
import { config } from './config.js';
import { logger } from './logger.js';
import { postJob } from './laravel-client.js';
import type { ConnectionStatus, JobPayload } from './types.js';

export interface TcpServerHandle {
  server: net.Server;
  close: () => Promise<void>;
  getStatus: () => { host: string; port: number; listening: boolean };
}

export function createTcpServer(): TcpServerHandle {
  const server = net.createServer((socket) => {
    const correlationId = ulid();
    const externalId = `job_${correlationId}`;
    const receivedAt = new Date().toISOString();
    const chunks: Buffer[] = [];
    let bytesReceived = 0;
    let finalized = false;
    const remoteIp = socket.remoteAddress ?? 'unknown';
    const remotePort = socket.remotePort ?? null;

    logger.info({ correlation_id: correlationId, remoteIp, remotePort }, 'tcp connection accepted');

    const idleTimer = setTimeout(() => finalize('idle_timeout'), config.jobIdleTimeoutMs);

    function resetIdleTimer() {
      idleTimer.refresh();
    }

    async function finalize(status: ConnectionStatus) {
      if (finalized) return;
      finalized = true;
      clearTimeout(idleTimer);

      const rawBuffer = Buffer.concat(chunks);
      const completedAt = new Date().toISOString();
      const payload: JobPayload = {
        schema_version: '1.0',
        correlation_id: correlationId,
        external_id: externalId,
        listener_external_id: config.listenerExternalId,
        received_at: receivedAt,
        completed_at: completedAt,
        source: { ip: remoteIp, port: remotePort },
        connection: { status, bytes_received: bytesReceived },
        raw: {
          encoding: 'base64',
          data: rawBuffer.toString('base64'),
          sha256: crypto.createHash('sha256').update(rawBuffer).digest('hex'),
        },
        parse: {
          status: rawBuffer.length > 0 ? 'partial' : 'parse_error',
          profile: 'generic-escpos',
          warnings: status === 'idle_timeout' ? ['idle_timeout_finalize'] : [],
          commands: [],
          render_model: { width_dots: 576, lines: [], actions: [] },
        },
      };

      logger.info(
        { correlation_id: correlationId, external_id: externalId, bytes: bytesReceived, status },
        'finalizing tcp job',
      );

      if (rawBuffer.length === 0) {
        logger.warn({ correlation_id: correlationId }, 'empty payload, skipping ingest');
        return;
      }

      try {
        await postJob(payload);
      } catch (err) {
        logger.error({ err, correlation_id: correlationId }, 'failed to ingest job');
      }
    }

    socket.on('data', (chunk: Buffer) => {
      bytesReceived += chunk.length;
      if (bytesReceived > config.maxPayloadBytes) {
        chunks.push(chunk.subarray(0, Math.max(0, config.maxPayloadBytes - (bytesReceived - chunk.length))));
        logger.warn({ correlation_id: correlationId, bytesReceived }, 'max payload exceeded');
        void finalize('max_size_exceeded');
        socket.destroy();
        return;
      }
      chunks.push(chunk);
      resetIdleTimer();
    });

    socket.on('close', () => {
      void finalize('closed_by_client');
    });

    socket.on('error', (err) => {
      logger.error({ err, correlation_id: correlationId }, 'tcp socket error');
      void finalize('socket_error');
    });
  });

  return {
    server,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
    getStatus: () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : config.tcpPort;
      return { host: config.tcpHost, port, listening: server.listening };
    },
  };
}
