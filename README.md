# Open POS Printer Emulator

Open POS Printer Emulator is a self-hosted open-source web application for testing ESC/POS integrations without physical printers. A POS application can send an ESC/POS byte stream over raw TCP/IP to a configurable port (default `9100`), and developers can inspect a live receipt preview, command inspector, raw hex/ASCII, and job history in the browser.

> Status: **MVP in progress**. The repo stays private until it is ready to be published.

## MVP Goals

- TCP ESC/POS listener (default 9100)
- ESC/POS command subset parsing
- Real-time live receipt preview
- Command inspector and raw data viewer
- Job history per listener
- Printer profiles
- Fault simulation
- PDF/image export
- Simple user authentication

## Stack

- **Backend:** Laravel 12+ (PHP 8.4+)
- **Frontend:** Inertia.js v2 + React 19 + TypeScript + shadcn/ui (default), Blade fallback (`?ui=blade`)
- **Real-time:** Laravel Reverb + Laravel Echo
- **TCP Listener & Parser:** Node.js TypeScript sidecar
- **Database:** PostgreSQL (dev/prod container), SQLite `:memory:` for tests
- **Orchestration:** Kiri Compose (Docker fallback for compatibility)

## Repository Structure

```text
.
├── apps/
│   ├── web/                  # Laravel + Inertia React + shadcn/ui (Blade fallback)
│   └── sidecar/              # Node.js TCP listener + ESC/POS parser
├── docker/                   # Container/runtime configuration
├── .github/workflows/        # CI (lint/test) + E2E smoke workflow
├── .internal/                # Internal planning docs (gitignored)
├── compose.yaml              # Kiri Compose
├── compose.ci.yaml           # CI override for Docker Compose E2E
└── Makefile                  # Task wrapper
```

## Quick Start

Choose your container engine. Both Kiri and Docker Compose are supported.

```bash
cp apps/web/.env.example apps/web/.env
cp apps/sidecar/.env.example apps/sidecar/.env

# Kiri (default)
make up

# Or Docker Compose
make up ENGINE=docker
```

After services are up, install dependencies and initialize the app:

```bash
# Replace `kiri compose` with `docker compose` if using Docker
kiri compose exec web composer install
kiri compose exec web php artisan key:generate
kiri compose exec web php artisan migrate --seed
```

Local endpoints:
- Web: `http://localhost:8080`
- Reverb: `ws://localhost:8081`
- TCP listener: `localhost:9100`
- Sidecar health: `http://localhost:3001/health`

## Quick Verification

```bash
printf "\x1B\x40Hello ESC/POS\n\x1D\x56\x00" | nc 127.0.0.1 9100
```

Open `/jobs` (Inertia default) or `/jobs?ui=blade` for the Blade fallback.

## Current Features

- **TCP ingest:** listener 9100 + finalize on idle timeout/client close; raw payload is preserved even when parsing fails.
- **ESC/POS subset parser:** init, align, bold/underline, text size, line spacing/feed, HT/ESC D tabs, ESC $/ positioning, cut, cash drawer, barcode/QR/image placeholders, DLE EOT status, codepages CP437/CP850/CP858/CP1252/ISO-8859-1.
- **Raster/image:** `GS v 0` and `ESC *` (supported 8-dot/24-dot modes; other modes emit warnings) are rendered as previews; `GS ( L` raster subset is supported best-effort with placeholder/warning fallback for unsupported variants.
- **Internal Laravel ingest:** token auth, payload validation, idempotent `external_id`, SHA-256 checksum.
- **Realtime Jobs:** `/jobs` via Reverb/Echo + `/jobs/feed` polling fallback. Blade fallback also has filter-aware live updates.
- **Job history UX:** filter/search/pagination/date range (`q,status,listener_id,date_from,date_to,per_page,page`) in Inertia and Blade.
- **Job detail:** receipt preview, command inspector, warnings, raw base64, Print/Save PDF and client-side PNG/text export.
- **Listener management:** CRUD/edit/delete listeners, sidecar status, heartbeat, last error, fault simulation toggles (paper_out, cover_open, cutter_error, offline), manual sync.
- **Sidecar control:** ensure/start/stop/update faults. Laravel internal listener status ingest + bootstrap endpoints. `sidecar:sync-listeners` runs on web startup and is scheduled every minute.
- **Printer Profiles MVP:** CRUD profiles (built-in profiles are not editable/deletable; profiles used by listeners are not deletable).
- **Auth/ownership scoping:** listener/job/printer profile queries and mutations are limited to the authenticated user; built-in printer profiles remain readable.
- **Ops hardening:** `print_jobs` indexes for history/feed queries, `jobs:prune --days= --dry-run` command, `PRINT_JOBS_RETENTION_DAYS` env (default 30), daily prune schedule at 03:30.
- **Default UI:** Inertia React + shadcn/ui on `/jobs`, `/jobs/{id}`, `/listeners`, `/printer-profiles`. Blade fallback available via `?ui=blade`.

## Testing & Checks

```bash
# Kiri (default)
make test
make lint

# Docker Compose
make test ENGINE=docker
make lint ENGINE=docker

make e2e   # requires an active stack at localhost:8080
```

Manual checks (replace `kiri compose` with `docker compose` if using Docker):

```bash
kiri compose exec web php artisan test
kiri compose exec web ./vendor/bin/pint --test
kiri compose exec sidecar npm test
kiri compose exec sidecar npm run lint
kiri compose exec web npm run build
```

Committed Playwright E2E smoke:

```bash
cd apps/web
npm ci
npx playwright install chromium
E2E_BASE_URL=http://localhost:8080 npx playwright test
```

Smoke covers: admin login, jobs page, printer profile create, TCP ingest, job detail export controls. Use an ephemeral DB/stack for CI; local smoke may create test data.

## CI

- `.github/workflows/ci.yml`: web Pint + PHPUnit (SQLite `:memory:`), sidecar lint + Vitest.
- `.github/workflows/e2e.yml`: Docker Compose stack (`compose.yaml` + `compose.ci.yaml`), migrate/seed/build, Playwright smoke, upload trace/logs on failure.

## Troubleshooting

- **Kiri BuildKit mirror timeout**: if a build fails due to a local mirror, use a `docker-container` builder without a mirror, build with `--load`, then `kiri compose up -d --no-build`. Docker Compose users are not affected by this Kiri-specific issue.
- **Reverb not live**: check `make ps` (or `make ps ENGINE=docker`) for the `reverb` service and port `8081`; the jobs UI has a polling fallback.
- **Blade fallback stale**: use `/jobs?ui=blade`; the fallback has filter-aware live updates, but still verify with polling/feed fetch.
- **Tests delete dev data**: do not override `phpunit.xml` env; tests must run on SQLite `:memory:`.
- **Sidecar status stale**: run `kiri compose exec web php artisan sidecar:sync-listeners` (or `docker compose exec ...`).
- **Retention/prune**: check `PRINT_JOBS_RETENTION_DAYS`; dry-run safely with `kiri compose exec web php artisan jobs:prune --dry-run` (or `docker compose exec ...`).
- **E2E flakiness**: ensure web/reverb/sidecar/db are healthy, ports 8080/8081/9100/3001 are free, and use the trace in `apps/web/test-results` on failure.

## License

[Apache License 2.0](LICENSE)
