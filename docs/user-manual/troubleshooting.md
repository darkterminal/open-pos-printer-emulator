---
title: Troubleshooting
description: Common issues when running or integrating Open POS Printer Emulator and how to fix them.
section: Reference
eyebrow: Operations
---

## No Jobs Appear in UI

Check:

- Stack is running: `make ps` (or `make ps ENGINE=docker`).
- TCP listener port is correct (default `9100`).
- Sender is reaching the emulator host/port (not `127.0.0.1` inside another container).
- Sidecar logs: `make logs`.

Quick test:

```bash
printf "\x1B\x40Hello ESC/POS\n\x1D\x56\x00" | nc 127.0.0.1 9100
```

## Realtime Not Updating

- Confirm `reverb` service is up and port `8081` is exposed.
- Verify `VITE_REVERB_*` and `REVERB_*` env values.
- UI should fall back to polling; refresh `/jobs` and check browser console/network.

## Parse Error / Partial Status

- Open job detail and inspect **Warnings** and **Command Inspector**.
- Check **Raw Data Viewer** (hex/base64).
- Some ESC/POS commands are rendered as placeholders or best-effort.

## Sidecar Listener Status Stale

```bash
kiri compose exec web php artisan sidecar:sync-listeners
# Docker: docker compose exec web php artisan sidecar:sync-listeners
```

## Prune / Retention

Dry run:

```bash
kiri compose exec web php artisan jobs:prune --dry-run
```

Configure `PRINT_JOBS_RETENTION_DAYS` in `apps/web/.env`.

## E2E Fails

- Ensure stack is healthy at `localhost:8080`.
- Ports `8080/8081/9100/3001` free.
- Check [Playwright](https://playwright.dev/) traces in `apps/web/test-results`.

## Docker/Kiri Networking Confusion

If using [Docker Compose](https://docs.docker.com/compose/) or [Kiri](https://runkiri.com/), remember container networking differs from host networking.

- `127.0.0.1` means "this same container/machine". From inside a container, it does not point to your host unless specially mapped.
- For container-to-host access, use the runtime-appropriate host alias (often `host.docker.internal`) or attach services to the same network and use service names.
