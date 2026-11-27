import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function number(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) throw new Error(`Invalid number for ${name}: ${raw}`);
  return parsed;
}

function portRange(name: string, fallback: string): { min: number; max: number } {
  const raw = (process.env[name] ?? fallback).trim();
  const m = raw.match(/^(\d{1,5})\s*-\s*(\d{1,5})$/);
  if (!m) throw new Error(`Invalid ${name}: "${raw}". Expected format "9100-9199".`);
  const min = Number(m[1]);
  const max = Number(m[2]);
  if (min < 1 || max > 65535 || min > max) {
    throw new Error(`Invalid ${name}: "${raw}". Range must be 1-65535 and min <= max.`);
  }
  return { min, max };
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: number('PORT', 3001),
  tcpHost: process.env.TCP_HOST ?? '0.0.0.0',
  tcpPort: number('TCP_PORT', 9100),
  tcpPortRange: portRange('TCP_PORT_RANGE', '9100-9199'),
  laravelInternalUrl: required('LARAVEL_INTERNAL_URL', 'http://web:8080/internal/v1'),
  sidecarSharedToken: required('SIDECAR_SHARED_TOKEN', 'dev-sidecar-token'),
  logLevel: process.env.LOG_LEVEL ?? 'debug',
  jobIdleTimeoutMs: number('JOB_IDLE_TIMEOUT_MS', 1500),
  maxPayloadBytes: number('MAX_PAYLOAD_BYTES', 1024 * 1024),
  listenerExternalId: process.env.LISTENER_EXTERNAL_ID ?? 'lst_default_9100',
};
