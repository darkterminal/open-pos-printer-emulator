import { config } from './config.js';
import { logger } from './logger.js';
import type { FaultConfig, JobPayload } from './types.js';

export async function postJob(payload: JobPayload): Promise<void> {
  const url = `${config.laravelInternalUrl.replace(/\/$/, '')}/jobs`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-sidecar-token': config.sidecarSharedToken,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.error(
      { status: res.status, body, correlation_id: payload.correlation_id, external_id: payload.external_id },
      'failed to post job to laravel',
    );
    throw new Error(`Laravel ingest failed: ${res.status}`);
  }

  logger.info(
    { correlation_id: payload.correlation_id, external_id: payload.external_id, status: res.status },
    'job posted to laravel',
  );
}

export async function postListenerStatus(payload: {
  external_id: string;
  status: 'starting' | 'listening' | 'stopped' | 'error' | 'offline';
  host: string;
  port: number;
  last_heartbeat_at: string;
  error: string | null;
  fault_config: FaultConfig;
}): Promise<void> {
  const url = `${config.laravelInternalUrl.replace(/\/$/, '')}/listeners/${encodeURIComponent(payload.external_id)}/status`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-sidecar-token': config.sidecarSharedToken,
    },
    body: JSON.stringify({
      schema_version: '1.0',
      ...payload,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.warn({ status: res.status, body, external_id: payload.external_id }, 'failed to post listener status');
  }
}

export interface BootstrapListener {
  external_id: string;
  host: string;
  port: number;
  status?: string;
  fault_config?: Partial<FaultConfig>;
  last_error?: string | null;
}

export async function fetchBootstrapListeners(): Promise<BootstrapListener[]> {
  const url = `${config.laravelInternalUrl.replace(/\/$/, '')}/listeners/bootstrap`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'x-sidecar-token': config.sidecarSharedToken,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Bootstrap fetch failed: ${res.status} ${body}`);
  }

  const payload = await res.json().catch(() => ({}));
  return Array.isArray(payload?.data) ? payload.data as BootstrapListener[] : [];
}
