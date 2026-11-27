# Open POS Printer Emulator Documentation

This directory contains user and technical documentation for Open POS Printer Emulator.

## Documents

| Document | Audience | Description |
| --- | --- | --- |
| [User Manual Overview](./user-manual/index.md) | All users | Product overview and documentation map. |
| [Getting Started](./user-manual/getting-started.md) | Technical users / developers | Install, run, and send your first test print. |
| [User Guide](./user-manual/user-guide.md) | Non-technical users | Step-by-step web UI guide from login to receipt preview. |
| [Technical Guide](./user-manual/technical-guide.md) | Technical users / developers | Setup, architecture, configuration, APIs, troubleshooting, and operational commands. |
| [Integration: ESC/POS Printer Server](./user-manual/integration-escpos-printer-server.md) | Both | How to send print jobs from [ESC/POS Printer Server](https://github.com/darkterminal/escpos-printer-server) to this emulator for testing. |
| [Troubleshooting](./user-manual/troubleshooting.md) | All users | Common issues and fixes. |

## What This Tool Does

Open POS Printer Emulator is a self-hosted web application for testing ESC/POS integrations without a physical thermal printer.

> **Development only:** intended for local development, QA, and integration testing. Not recommended for production deployment.

Basic flow:

1. A POS/client sends raw ESC/POS bytes to the emulator's TCP listener (default port `9100`).
2. The sidecar receives, parses, and forwards the job to Laravel.
3. Laravel stores the job and broadcasts updates.
4. The web UI shows job history, receipt preview, command inspector, raw data, and diagnostics.

## Documentation stack

The docs site is built with [Jekyll](https://jekyllrb.com/) (compatible with [GitHub Pages](https://pages.github.com/)), uses [Mermaid](https://mermaid.js.org/) for diagrams, and [Prettier](https://prettier.io/) + [`@shopify/prettier-plugin-liquid`](https://github.com/Shopify/prettier-plugin-liquid) for formatting.

## Quick Links

- Project README: [../README.md](../README.md)
- Contributing: [../CONTRIBUTING.md](../CONTRIBUTING.md)
- ESC/POS Printer Server: [darkterminal/escpos-printer-server](https://github.com/darkterminal/escpos-printer-server)
