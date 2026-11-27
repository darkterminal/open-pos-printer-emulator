# End-to-End Example: ESC/POS Printer Server + Open POS Printer Emulator

This example shows a full print flow without a physical printer:

```text
POS/Web App (sample payload)
  -> WebSocket JSON
  -> ESC/POS Printer Server (ws://127.0.0.1:1945)
  -> raw ESC/POS over TCP
  -> Open POS Printer Emulator (127.0.0.1:9100)
  -> Jobs UI (http://localhost:8080/jobs)
```

## Prerequisites

- Open POS Printer Emulator running locally (`make up` or `make up ENGINE=docker`).
- ESC/POS Printer Server installed/cloned locally.
- Node.js 21+ (for `send-job.mjs`, uses global `WebSocket`) **or** any WebSocket client.
- `php` with required extensions for ESC/POS Printer Server.

## 1. Start Open POS Printer Emulator

From the emulator repo root:

```bash
cp apps/web/.env.example apps/web/.env
cp apps/sidecar/.env.example apps/sidecar/.env
make up
# Docker: make up ENGINE=docker
```

Verify:

- Web UI: `http://localhost:8080/jobs`
- TCP listener: `127.0.0.1:9100`

## 2. Start ESC/POS Printer Server (WebSocket role)

From your ESC/POS Printer Server checkout:

```bash
php eps --role ws --host 127.0.0.1 --port 1945 --log-dir /tmp/eps-logs start
```

This starts the WebSocket server on `ws://127.0.0.1:1945`.

To stop it later:

```bash
php eps --role ws --host 127.0.0.1 --port 1945 --log-dir /tmp/eps-logs stop
```

## 3. Send the Sample Print Job

From this emulator repo:

```bash
node examples/escpos-printer-server/send-job.mjs
```

The script sends [`sample-receipt.json`](./sample-receipt.json) to ESC/POS Printer Server, which forwards ESC/POS bytes to the emulator TCP listener.

Expected console output:

```text
ws open, sending payload
response: [timestamp][SUCCESS] Receipt printed successfully
```

## 4. Verify in Emulator

1. Open `http://localhost:8080/jobs`.
2. Find the newest job (source should be the EPS sender).
3. Inspect:
   - **Receipt Preview** - rendered receipt
   - **Warnings / Command Inspector** - parser diagnostics
   - **Raw Data Viewer** - hex/base64 payload

## Files

| File | Purpose |
| --- | --- |
| `sample-receipt.json` | Example WebSocket payload for ESC/POS Printer Server |
| `send-job.mjs` | Node.js script that sends the payload over WebSocket |
| `run-demo.sh` | Convenience script with prerequisite checks and guided run |

## Payload Notes

The key integration field is `printer_settings`:

```json
{
  "printer_settings": {
    "interface": "ethernet",
    "printer_host": "127.0.0.1",
    "printer_port": 9100,
    "template": "epson"
  }
}
```

- `interface: "ethernet"` tells ESC/POS Printer Server to send via TCP.
- `printer_host`/`printer_port` must point to the emulator listener **as reachable from the EPS process**.
- If EPS runs in a container, `127.0.0.1` usually points to that container; use `host.docker.internal` or a reachable network host instead.

## Troubleshooting

- **`ECONNREFUSED` on ws://127.0.0.1:1945**: ESC/POS Printer Server WS is not running.
- **EPS says printed, no job in emulator**: check `printer_host/printer_port` reachability from EPS process; check `make logs`.
- **Node script fails with WebSocket undefined**: use Node 21+ or send payload with another WS client.
- **Preview looks different from real printer**: emulator rendering is best-effort; validate final output on physical hardware.
