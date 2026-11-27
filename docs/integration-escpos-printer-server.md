# Integration: ESC/POS Printer Server

This guide explains how to use **Open POS Printer Emulator** with **[ESC/POS Printer Server](https://github.com/darkterminal/escpos-printer-server)**.

## Why Integrate Them

- **ESC/POS Printer Server** receives print jobs (usually via WebSocket from a POS/web app) and sends ESC/POS commands to a printer interface.
- **Open POS Printer Emulator** receives raw ESC/POS over TCP and visualizes the result in a web UI.

Together, you can test the full print flow without a physical thermal printer:

```text
POS/Web App
  -> WebSocket JSON print job
  -> ESC/POS Printer Server
  -> raw ESC/POS over TCP (ethernet interface)
  -> Open POS Printer Emulator (:9100)
  -> Web UI preview / inspector / diagnostics
```

## Prerequisites

1. Open POS Printer Emulator running.
   - Web UI: `http://localhost:8080`
   - TCP listener: `localhost:9100`
2. ESC/POS Printer Server installed/running.
   - Web GUI: `http://localhost:1100` (default)
   - WebSocket: `ws://localhost:1945` (default)

> Ports may differ if you changed configuration.

## Integration Concept

ESC/POS Printer Server supports an `ethernet` printer interface with `printer_host` and `printer_port`. Point that interface to the emulator's TCP listener.

In other words: **treat the emulator as a network ESC/POS printer**.

## Step-by-Step

### Step 1 — Start the Emulator

In the emulator repository:

```bash
make up
# or: make up ENGINE=docker
```

Confirm listener is available on port `9100` and open `http://localhost:8080/jobs`.

### Step 2 — Start ESC/POS Printer Server

Follow the ESC/POS Printer Server installation guide. Typical local run:

```bash
./eps --role http
```

Confirm:

- `http://localhost:1100` is accessible
- `ws://localhost:1945` accepts connections

### Step 3 — Configure Printer Target to Emulator

When sending a print job to ESC/POS Printer Server, set `printer_settings` to use the emulator as an ethernet target:

- `interface`: `"ethernet"`
- `printer_host`: host where emulator listener is reachable
- `printer_port`: emulator listener port (default `9100`)

#### If both run on the same host (native/local)

Use:

```json
"printer_settings": {
  "interface": "ethernet",
  "printer_host": "127.0.0.1",
  "printer_port": 9100,
  "template": "epson"
}
```

#### If ESC/POS Printer Server runs in Docker/container and emulator runs on host

Use a host-reachable address from inside that container, commonly:

```json
"printer_host": "host.docker.internal"
```

> `host.docker.internal` behavior depends on container runtime/platform. Verify in your environment.

#### If both run in the same Docker/Kiri compose network

Use the emulator sidecar service name/host as resolvable inside that network, and port `9100` (or mapped internal port as appropriate). This depends on your compose setup.

## Example: Send a Receipt via ESC/POS Printer Server

Send this JSON to `ws://localhost:1945` (ESC/POS Printer Server WebSocket). You can use any WebSocket client.

```json
{
  "from": "posclient",
  "printer_name": "EMULATOR-9100",
  "printer_settings": {
    "interface": "ethernet",
    "printer_host": "127.0.0.1",
    "printer_port": 9100,
    "template": "epson",
    "pull_cash_drawer": false
  },
  "receipt_data": {
    "app_name": "Coffee POS",
    "store_address": "Jl. Industrial No. 1",
    "full_name": "Operator Name",
    "transaction": {
      "date_transaction": "2026-11-27",
      "transaction": "INV-00123",
      "tax": 0,
      "total_transaction": 15000,
      "paid": 20000,
      "paid_return": 5000,
      "payment": "Cash"
    },
    "cart": [
      {
        "item_name": "Espresso",
        "price": 5000,
        "qty": 2,
        "sub_total": 10000
      },
      {
        "item_name": "Mineral Water",
        "price": 5000,
        "qty": 1,
        "sub_total": 5000
      }
    ]
  }
}
```

## End-to-End Example (Included in This Repo)

This repository includes a runnable example in `examples/escpos-printer-server/`:

```bash
# 1) Start emulator
make up

# 2) Start ESC/POS Printer Server (in escpos-printer-server repo)
php eps --role ws --host 127.0.0.1 --port 1945 --log-dir /tmp/eps-logs start

# 3) Send sample job (in this repo)
node examples/escpos-printer-server/send-job.mjs
```

Files:

- `examples/escpos-printer-server/sample-receipt.json`
- `examples/escpos-printer-server/send-job.mjs`
- `examples/escpos-printer-server/run-demo.sh`
- `examples/escpos-printer-server/README.md`

## Expected Result

1. ESC/POS Printer Server accepts the WebSocket job.
2. It renders/sends ESC/POS bytes to `127.0.0.1:9100` (or your configured host).
3. Open POS Printer Emulator receives the TCP payload.
4. A new job appears in `http://localhost:8080/jobs`.
5. You can inspect receipt preview, parsed commands, warnings, and raw hex/base64.

## Quick WebSocket Test Clients

### Using `wscat`

```bash
npm install -g wscat
wscat -c ws://localhost:1945
```

Then paste the JSON payload as one line/message.

### Using browser console (simple test)

If CORS/origin and WS access allow it in your environment, you can test from browser devtools:

```js
const ws = new WebSocket('ws://localhost:1945');
ws.onopen = () => ws.send(JSON.stringify({
  from: 'posclient',
  printer_name: 'EMULATOR-9100',
  printer_settings: { interface: 'ethernet', printer_host: '127.0.0.1', printer_port: 9100, template: 'epson' },
  receipt_data: {
    app_name: 'Coffee POS',
    full_name: 'Operator',
    transaction: { date_transaction: '2026-11-27', transaction: 'INV-001', tax: 0, total_transaction: 10000, paid: 10000, payment: 'Cash' },
    cart: [{ item_name: 'Espresso', price: 10000, qty: 1, sub_total: 10000 }]
  }
}));
ws.onmessage = (e) => console.log(e.data);
```

## Troubleshooting

### Job not visible in emulator

- Check emulator sidecar/listener is running: `make ps`.
- Confirm ESC/POS Printer Server `printer_host`/`printer_port` points to emulator listener.
- If running across containers/VMs, `127.0.0.1` may point to the wrong machine; use the correct reachable host.
- Check emulator logs: `make logs`.

### ESC/POS Printer Server cannot connect

- Verify network reachability to emulator port `9100`.
- Test with `nc` from the same environment as ESC/POS Printer Server:

```bash
printf "\x1B@PING\n" | nc <emulator-host> 9100
```

- Check firewalls/security groups/local port bindings.

### Receipt preview differs from real printer

This is expected for unsupported/partially supported ESC/POS commands. Use emulator warnings and command inspector to debug. Validate final output on real hardware before production rollout.

## Recommended Workflow

1. Develop POS print payloads against ESC/POS Printer Server.
2. Route ESC/POS Printer Server ethernet output to Open POS Printer Emulator.
3. Inspect preview/warnings/raw commands in emulator.
4. Fix formatting/payload issues.
5. Test on physical printer for final acceptance.
