import express from 'express';
import { pinoHttp } from 'pino-http';
import { config } from './config.js';
import { logger } from './logger.js';
import { createTcpServer } from './tcp-server.js';

const startedAt = Date.now();
const tcp = createTcpServer();

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));

app.get('/health', (_req, res) => {
  const tcpStatus = tcp.getStatus();
  res.json({
    status: 'ok',
    service: 'escpos-sidecar',
    version: '0.1.0',
    uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
    listeners: [
      {
        external_id: config.listenerExternalId,
        host: tcpStatus.host,
        port: tcpStatus.port,
        status: tcpStatus.listening ? 'listening' : 'stopped',
      },
    ],
  });
});

app.post('/control/v1/listeners', (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Sprint 1: single default listener only' } });
});

app.delete('/control/v1/listeners/:externalId', (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Sprint 1: single default listener only' } });
});

app.patch('/control/v1/listeners/:externalId/faults', (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Fault simulation planned for Phase 3' } });
});

tcp.server.listen(config.tcpPort, config.tcpHost, () => {
  logger.info({ host: config.tcpHost, port: config.tcpPort }, 'tcp listener started');
});

app.listen(config.port, '0.0.0.0', () => {
  logger.info({ port: config.port }, 'sidecar http server started');
});

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down sidecar');
  void tcp.close().finally(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
