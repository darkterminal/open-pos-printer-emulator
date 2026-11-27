# Open POS Printer Emulator Documentation

This directory contains user and technical documentation for Open POS Printer Emulator.

## Documents

| Document | Audience | Description |
| --- | --- | --- |
| [User Guide](./user-guide.md) | Non-technical users | How to use the web UI to view print jobs, receipts, listeners, and printer profiles. |
| [Technical Guide](./technical-guide.md) | Technical users / developers | Setup, architecture, configuration, APIs, troubleshooting, and operational commands. |
| [Integration: ESC/POS Printer Server](./integration-escpos-printer-server.md) | Both | How to send print jobs from [ESC/POS Printer Server](https://github.com/darkterminal/escpos-printer-server) to this emulator for testing. |

## What This Tool Does

Open POS Printer Emulator is a self-hosted web application for testing ESC/POS integrations without a physical thermal printer.

Basic flow:

1. A POS/client sends raw ESC/POS bytes to the emulator's TCP listener (default port `9100`).
2. The sidecar receives, parses, and forwards the job to Laravel.
3. Laravel stores the job and broadcasts updates.
4. The web UI shows job history, receipt preview, command inspector, raw data, and diagnostics.

## Quick Links

- Project README: [../README.md](../README.md)
- Contributing: [../CONTRIBUTING.md](../CONTRIBUTING.md)
- ESC/POS Printer Server: [darkterminal/escpos-printer-server](https://github.com/darkterminal/escpos-printer-server)
