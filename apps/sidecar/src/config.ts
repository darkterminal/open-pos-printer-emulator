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

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: number('PORT', 3001),
  tcpHost: process.env.TCP_HOST ?? '0.0.0.0',
  tcpPort: number('TCP_PORT', 9100),
  laravelInternalUrl: required('LARAVEL_INTERNAL_URL', 'http://web:8080/internal/v1'),
  sidecarSharedToken: required('SIDECAR_SHARED_TOKEN', 'dev-sidecar-token'),
  logLevel: process.env.LOG_LEVEL ?? 'debug',
  jobIdleTimeoutMs: number('JOB_IDLE_TIMEOUT_MS', 1500),
  maxPayloadBytes: number('MAX_PAYLOAD_BYTES', 1024 * 1024),
  listenerExternalId: process.env.LISTENER_EXTERNAL_ID ?? 'lst_default_9100',
};
