import express from 'express';
import { pinoHttp } from 'pino-http';
import { config } from './config.js';
import { logger } from './logger.js';
import { ListenerRegistry } from './listener-registry.js';

const startedAt = Date.now();
const registry = new ListenerRegistry();

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const expected = config.sidecarSharedToken;
  const provided = String(req.header('x-sidecar-token') ?? '');
  if (!expected || !provided || provided !== expected) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid sidecar token' } });
    return;
  }
  next();
}

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'escpos-sidecar',
    version: '0.1.0',
    uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
    listeners: registry.list(),
  });
});

app.post('/control/v1/listeners', authMiddleware, async (req, res) => {
  const externalId = String(req.body?.listener_external_id ?? '').trim();
  const host = String(req.body?.host ?? '0.0.0.0').trim();
  const port = Number(req.body?.port ?? 9100);
  if (!externalId || !Number.isInteger(port) || port < 1 || port > 65535) {
    res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid listener payload' } });
    return;
  }

  try {
    const listener = await registry.ensureListener(externalId, host, port);
    res.status(200).json({ data: listener });
  } catch (err) {
    logger.error({ err, externalId, host, port }, 'failed to ensure listener');
    res.status(409).json({ error: { code: 'LISTENER_ERROR', message: err instanceof Error ? err.message : 'Failed to start listener' } });
  }
});

app.delete('/control/v1/listeners/:externalId', authMiddleware, async (req, res) => {
  const externalId = String(req.params.externalId);
  const listener = await registry.stopListener(externalId);
  if (!listener) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Listener not found' } });
    return;
  }
  res.status(200).json({ data: listener });
});

app.patch('/control/v1/listeners/:externalId/faults', authMiddleware, (req, res) => {
  const externalId = String(req.params.externalId);
  const listener = registry.setFaults(externalId, req.body?.faults ?? {});
  if (!listener) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Listener not found' } });
    return;
  }
  res.status(200).json({ data: listener });
});

void registry.startDefault().catch((err) => {
  logger.error({ err }, 'failed to start default listener');
});

app.listen(config.port, '0.0.0.0', () => {
  logger.info({ port: config.port }, 'sidecar http server started');
});

function shutdown(signal: string) {
  logger.info({ signal }, 'shutting down sidecar');
  void registry.closeAll().finally(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
