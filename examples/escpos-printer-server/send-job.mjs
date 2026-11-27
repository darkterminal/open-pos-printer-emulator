#!/usr/bin/env node
/**
 * Sends a sample receipt payload to ESC/POS Printer Server WebSocket.
 * ESC/POS Printer Server then forwards ESC/POS bytes to Open POS Printer Emulator.
 *
 * Usage:
 *   node examples/escpos-printer-server/send-job.mjs [ws-url] [payload-json]
 *
 * Defaults:
 *   ws-url:       ws://127.0.0.1:1945
 *   payload-json: ./sample-receipt.json (next to this script)
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const wsUrl = process.argv[2] || process.env.EPS_WS_URL || 'ws://127.0.0.1:1945';
const payloadPath = resolve(process.argv[3] || process.env.EPS_PAYLOAD || resolve(__dirname, 'sample-receipt.json'));

if (typeof WebSocket === 'undefined') {
  console.error('Global WebSocket is not available. Use Node.js 21+ or a WS client like wscat.');
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(readFileSync(payloadPath, 'utf8'));
} catch (err) {
  console.error(`Failed to read payload: ${payloadPath}`);
  console.error(err.message);
  process.exit(1);
}

console.log(`Connecting to ${wsUrl}`);
console.log(`Payload: ${payloadPath}`);

const ws = new WebSocket(wsUrl);

const timeout = setTimeout(() => {
  console.error('Timeout waiting for ESC/POS Printer Server response (10s).');
  try { ws.close(); } catch {}
  process.exit(1);
}, 10_000);

ws.onopen = () => {
  console.log('ws open, sending payload');
  ws.send(JSON.stringify(payload));
};

ws.onmessage = (event) => {
  const data = typeof event.data === 'string' ? event.data : String(event.data);
  console.log('response:', data);
  clearTimeout(timeout);
  ws.close();
  // Give socket a moment to close cleanly.
  setTimeout(() => process.exit(0), 100);
};

ws.onerror = (event) => {
  console.error('WebSocket error. Is ESC/POS Printer Server running on', wsUrl, '?');
  if (event?.message) console.error(event.message);
  clearTimeout(timeout);
  process.exit(1);
};

ws.onclose = (event) => {
  if (event.code !== 1000) {
    console.error(`WebSocket closed: code=${event.code} reason=${event.reason || '(none)'}`);
  }
};
