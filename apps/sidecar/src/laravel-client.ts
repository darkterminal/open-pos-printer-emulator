import { config } from './config.js';
import { logger } from './logger.js';
import type { JobPayload } from './types.js';

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
