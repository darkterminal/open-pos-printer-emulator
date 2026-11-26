import net from 'node:net';
import { config } from './config.js';
import { logger } from './logger.js';
import { postListenerStatus } from './laravel-client.js';
import { createTcpServer, type TcpServerHandle } from './tcp-server.js';
import { DEFAULT_FAULT_CONFIG, type FaultConfig } from './types.js';

export interface ListenerInfo {
  external_id: string;
  host: string;
  port: number;
  status: 'listening' | 'stopped' | 'error';
  fault_config: FaultConfig;
  last_error: string | null;
  last_heartbeat_at: string | null;
}

interface ManagedListener {
  info: ListenerInfo;
  tcp: TcpServerHandle | null;
}

function isLoopback(host: string): boolean {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

function normalizeFaults(input: Partial<FaultConfig> | undefined): FaultConfig {
  return {
    paper_out: Boolean(input?.paper_out),
    cover_open: Boolean(input?.cover_open),
    cutter_error: Boolean(input?.cutter_error),
    offline: Boolean(input?.offline),
  };
}

export class ListenerRegistry {
  private readonly listeners = new Map<string, ManagedListener>();

  constructor() {
    const externalId = config.listenerExternalId;
    const tcp = createTcpServer(() => this.getFaults(externalId));
    this.listeners.set(externalId, {
      info: {
        external_id: externalId,
        host: config.tcpHost,
        port: config.tcpPort,
        status: 'stopped',
        fault_config: { ...DEFAULT_FAULT_CONFIG },
        last_error: null,
        last_heartbeat_at: null,
      },
      tcp,
    });
  }

  list(): ListenerInfo[] {
    return Array.from(this.listeners.values()).map((entry) => ({ ...entry.info }));
  }

  get(externalId: string): ListenerInfo | null {
    const entry = this.listeners.get(externalId);
    return entry ? { ...entry.info } : null;
  }

  getFaults(externalId: string): FaultConfig {
    return { ...(this.listeners.get(externalId)?.info.fault_config ?? DEFAULT_FAULT_CONFIG) };
  }

  private async report(entry: ManagedListener): Promise<void> {
    try {
      await postListenerStatus({
        external_id: entry.info.external_id,
        status: entry.info.status,
        host: entry.info.host,
        port: entry.info.port,
        last_heartbeat_at: entry.info.last_heartbeat_at ?? new Date().toISOString(),
        error: entry.info.last_error,
        fault_config: entry.info.fault_config,
      });
    } catch (err) {
      logger.warn({ err, external_id: entry.info.external_id }, 'listener status report failed');
    }
  }

  async startDefault(): Promise<void> {
    const externalId = config.listenerExternalId;
    const entry = this.listeners.get(externalId);
    if (!entry?.tcp) return;

    await new Promise<void>((resolve, reject) => {
      entry.tcp!.server.once('error', reject);
      entry.tcp!.server.listen(entry.info.port, entry.info.host, () => {
        entry.tcp!.server.off('error', reject);
        entry.info.status = 'listening';
        entry.info.last_error = null;
        entry.info.last_heartbeat_at = new Date().toISOString();
        logger.info({ host: entry.info.host, port: entry.info.port, external_id: externalId }, 'tcp listener started');
        resolve();
      });
    });

    void this.report(entry);
  }

  async bootstrapFromLaravel(fetcher: () => Promise<Array<{ external_id: string; host: string; port: number; fault_config?: Partial<FaultConfig> }>>): Promise<void> {
    try {
      const listeners = await fetcher();
      for (const item of listeners) {
        if (!item?.external_id || !item.host || !Number.isInteger(item.port)) continue;
        try {
          const info = await this.ensureListener(item.external_id, item.host, item.port);
          if (item.fault_config) this.setFaults(item.external_id, item.fault_config);
          logger.info({ external_id: info.external_id, port: info.port }, 'listener bootstrapped from laravel');
        } catch (err) {
          logger.warn({ err, external_id: item.external_id }, 'failed to bootstrap listener');
        }
      }
    } catch (err) {
      logger.warn({ err }, 'failed to fetch listener bootstrap config');
    }
  }

  async ensureListener(externalId: string, host: string, port: number): Promise<ListenerInfo> {
    const existing = this.listeners.get(externalId);
    if (existing) {
      if (existing.info.host === host && existing.info.port === port && existing.info.status === 'listening') {
        return { ...existing.info };
      }
      await this.stopListener(externalId).catch(() => undefined);
    }

    const entry: ManagedListener = {
      info: {
        external_id: externalId,
        host,
        port,
        status: 'stopped',
        fault_config: existing?.info.fault_config ?? { ...DEFAULT_FAULT_CONFIG },
        last_error: null,
        last_heartbeat_at: existing?.info.last_heartbeat_at ?? null,
      },
      tcp: null,
    };

    // Safety: only bind loopback or 0.0.0.0 in dev by default.
    const allowAll = config.nodeEnv !== 'production';
    if (!allowAll && !isLoopback(host) && host !== '0.0.0.0') {
      entry.info.status = 'error';
      entry.info.last_error = 'Host not allowed in production';
      this.listeners.set(externalId, entry);
      throw new Error(entry.info.last_error);
    }

    const tcp = createTcpServer(() => this.getFaults(externalId));
    entry.tcp = tcp;
    this.listeners.set(externalId, entry);

    await new Promise<void>((resolve, reject) => {
      tcp.server.once('error', (err) => {
        entry.info.status = 'error';
        entry.info.last_error = err.message;
        reject(err);
      });
      tcp.server.listen(port, host, () => {
        tcp.server.off('error', reject);
        entry.info.status = 'listening';
        entry.info.last_error = null;
        entry.info.last_heartbeat_at = new Date().toISOString();
        logger.info({ host, port, external_id: externalId }, 'dynamic tcp listener started');
        resolve();
      });
    });

    void this.report(entry);
    return { ...entry.info };
  }

  async stopListener(externalId: string): Promise<ListenerInfo | null> {
    const entry = this.listeners.get(externalId);
    if (!entry) return null;

    if (entry.tcp) {
      await entry.tcp.close().catch((err) => {
        logger.warn({ err, external_id: externalId }, 'error closing tcp listener');
      });
      entry.tcp = null;
    }

    entry.info.status = 'stopped';
    entry.info.last_heartbeat_at = new Date().toISOString();
    void this.report(entry);
    return { ...entry.info };
  }

  setFaults(externalId: string, faults: Partial<FaultConfig>): ListenerInfo | null {
    const entry = this.listeners.get(externalId);
    if (!entry) return null;
    entry.info.fault_config = normalizeFaults(faults);
    entry.info.last_heartbeat_at = new Date().toISOString();
    void this.report(entry);
    return { ...entry.info };
  }

  heartbeat(externalId: string, patch?: { status?: ListenerInfo['status']; last_error?: string | null }): ListenerInfo | null {
    const entry = this.listeners.get(externalId);
    if (!entry) return null;
    if (patch?.status) entry.info.status = patch.status;
    if (patch && 'last_error' in patch) entry.info.last_error = patch.last_error ?? null;
    entry.info.last_heartbeat_at = new Date().toISOString();
    return { ...entry.info };
  }

  async closeAll(): Promise<void> {
    await Promise.all(Array.from(this.listeners.keys()).map((id) => this.stopListener(id)));
  }
}
