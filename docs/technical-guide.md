# Technical Guide

This guide is for developers, integrators, and operators.

## Architecture

```text
POS / Client
  -> raw ESC/POS over TCP (default 9100)
  -> Node.js sidecar (apps/sidecar)
  -> internal HTTP ingest (Laravel API, token-auth)
  -> Laravel stores print_jobs + broadcasts events
  -> Inertia React UI (Jobs, Listeners, Printer Profiles)
```

## Repository Layout

- `apps/web/` — Laravel 12 app, Inertia React UI, auth, jobs/listeners/profiles.
- `apps/sidecar/` — Node.js TypeScript TCP listener and ESC/POS parser.
- `docker/` — Dockerfiles for services.
- `compose.yaml` — local development stack.
- `compose.ci.yaml` — CI overrides.
- `docs/` — user and technical documentation.
- `.internal/` — internal planning docs (gitignored).

## Prerequisites

- Kiri or Docker Compose
- Node/npm available in containers (provided by compose stack)
- Ports available: `8080`, `8081`, `9100`, `3001`, `5432` (defaults)

## Local Setup

```bash
cp apps/web/.env.example apps/web/.env
cp apps/sidecar/.env.example apps/sidecar/.env

# Kiri (default)
make up

# or Docker Compose
make up ENGINE=docker
```

Initialize app (replace `kiri compose` with `docker compose` when using Docker):

```bash
kiri compose exec web composer install
kiri compose exec web php artisan key:generate
kiri compose exec web php artisan migrate --seed
```

## Services / Ports

| Service | Default | Purpose |
| --- | --- | --- |
| Web app | `http://localhost:8080` | Laravel + Inertia UI |
| Reverb | `http://localhost:8081` | Realtime websocket server |
| TCP listener | `localhost:9100` | Raw ESC/POS ingest |
| Sidecar health | `http://localhost:3001/health` | Sidecar health endpoint |
| PostgreSQL | `localhost:5432` | Dev database |

## Common Commands

```bash
# default engine: kiri
make up
make down
make logs
make ps
make test
make lint
make e2e

# Docker Compose
make up ENGINE=docker
make test ENGINE=docker
make lint ENGINE=docker
```

## Configuration

### Web (`apps/web/.env`)

Important keys:

- `DB_*` — database connection.
- `REVERB_*`, `VITE_REVERB_*` — realtime config.
- `SIDECAR_INTERNAL_URL` — web-to-sidecar control URL.
- `SIDECAR_SHARED_TOKEN` — internal sidecar auth token.
- `LARAVEL_CONTROL_TOKEN` — sidecar-to-Laravel internal auth token.
- `PRINT_JOBS_RETENTION_DAYS` — prune retention (default 30).

### Sidecar (`apps/sidecar/.env`)

Important keys:

- Listener host/port configuration.
- Laravel internal ingest URL/token.
- Parser/runtime settings as defined in sidecar config.

> Keep tokens secret. Do not commit `.env` files.

## Data Model Notes

- Print jobs are stored in `print_jobs` (not Laravel queue `jobs`).
- Ingest should be idempotent by `external_id`.
- Raw payload is preserved for debugging, including parse-failure cases.

## Internal Ingest Contract

The sidecar posts parsed job payloads to Laravel internal endpoints. Contract details live in:

- `.internal/api/internal-sidecar-contract.md` (internal, gitignored in this repo workflow)
- Code: `apps/web/app/Http/Controllers/Internal/*`, `apps/web/app/Actions/Jobs/*`, `apps/sidecar/src/*`

Operational expectations:

- `X-Sidecar-Token` (or configured internal token header) must be valid.
- Payload includes schema/version/correlation metadata as defined by contract.
- Invalid payloads should be rejected with clear errors; valid duplicates should be idempotent.

## UI Routes

Authenticated:

- `/jobs` — jobs workspace (Inertia default).
- `/jobs/{id}` — job detail.
- `/jobs/feed` — polling feed endpoint.
- `/listeners` — listener management.
- `/printer-profiles` — printer profile management.

Fallback:

- `/jobs?ui=blade` — Blade fallback UI.

## Testing

### Application tests

```bash
make test
# or make test ENGINE=docker
```

### Lint/static checks

```bash
make lint
# or make lint ENGINE=docker
```

### E2E smoke (Playwright)

```bash
make e2e
```

Requirements: stack running at `localhost:8080`, ports free, services healthy.

## Manual TCP Smoke Test

Send a simple ESC/POS payload directly to the listener:

```bash
printf "\x1B\x40Hello ESC/POS\n\x1D\x56\x00" | nc 127.0.0.1 9100
```

Then check `/jobs` for a new job.

## Retention / Prune

Dry run:

```bash
kiri compose exec web php artisan jobs:prune --dry-run
# or docker compose exec web php artisan jobs:prune --dry-run
```

Prune uses `PRINT_JOBS_RETENTION_DAYS` by default. Scheduler runs daily (see Laravel scheduler config).

## Troubleshooting

### No jobs appear

- Confirm listener is running: `make ps`.
- Confirm TCP port `9100` reachable from sender.
- Check sidecar logs: `make logs` or `kiri compose logs -f sidecar`.
- Check web logs and Laravel logs.

### Realtime not updating

- Confirm `reverb` service is healthy and port `8081` is exposed.
- Verify `VITE_REVERB_*` settings.
- The UI should fall back to polling; if not, inspect browser console/network.

### Parse errors / warnings

- Open job detail and inspect **Command Inspector** and **Warnings**.
- Raw payload is preserved; use hex/base64 for debugging.
- Unsupported commands may be placeholders by design.

### Sidecar listener status stale

```bash
kiri compose exec web php artisan sidecar:sync-listeners
```

### Tests affect local dev data

Do not override test DB env. PHPUnit should use SQLite `:memory:` as configured in `phpunit.xml`.

## Security Notes

- Treat TCP payloads and external content as untrusted input.
- Keep internal tokens private.
- Do not expose internal ingest endpoints publicly without proper controls.
- Validate/authorize user access to jobs/listeners/profiles.
