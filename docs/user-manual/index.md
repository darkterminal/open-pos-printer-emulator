---
title: Overview
description: What Open POS Printer Emulator is, who it is for, and how it fits into an ESC/POS workflow.
section: Introduction
eyebrow: Product guide
---

## What is Open POS Printer Emulator?

**Open POS Printer Emulator** is a self-hosted open-source web application for testing ESC/POS integrations without physical printers.

It sits between your POS/client and a real printer during development:

1. Your POS/client sends raw ESC/POS bytes over TCP (default `9100`).
2. The emulator sidecar receives and parses the payload.
3. Laravel stores the job and broadcasts updates.
4. The web UI shows receipt preview, command inspector, warnings, and raw data.

## Who Is It For?

### Non-technical users

- View received receipts in a browser.
- Confirm a POS is sending print jobs.
- Share job IDs/screenshots with developers.

### Technical users

- Debug ESC/POS payloads and parser warnings.
- Inspect raw hex/base64 and parsed commands.
- Test listener behavior, fault simulation, and printer profiles.
- Integrate with [ESC/POS Printer Server](https://github.com/darkterminal/escpos-printer-server) before using real hardware.

## Key Features

- **TCP ESC/POS ingest** — default listener on port `9100`.
- **Receipt preview** — visual rendering for supported ESC/POS commands.
- **Command inspector** — parsed command list with offsets/args.
- **Raw data viewer** — hex dump and base64 payload.
- **Realtime updates** — Reverb/Echo with polling fallback.
- **Listeners & printer profiles** — manage ports and printer presets.
- **Fault simulation** — test error conditions like paper out or cover open.
- **Self-hosted** — run locally with Kiri or Docker Compose.

## Quick Flow

```text
POS / Client
  -> TCP :9100 (raw ESC/POS)
  -> Sidecar parser
  -> Laravel ingest/store
  -> Web UI (/jobs)
```

## Next Steps

- [Getting started](getting-started.md) — run the emulator locally.
- [User guide](user-guide.md) — use the web UI.
- [Integration with ESC/POS Printer Server](integration-escpos-printer-server.md) — test a full POS print pipeline.
- [Technical guide](technical-guide.md) — architecture, config, commands, and internals.
