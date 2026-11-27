---
title: Technical guide
description: Architecture, setup, configuration, commands, and operational notes for developers and integrators.
section: Reference
eyebrow: For developers
---

## Architecture

```text
POS / Client
  -> raw ESC/POS over TCP (default 9100)
  -> Node.js sidecar (apps/sidecar)
  -> internal HTTP ingest (Laravel API, token-auth)
  -> Laravel stores print_jobs + broadcasts events
  -> Inertia React UI (Jobs, Listeners, Printer Profiles)
```

## Stack

- **Backend**: Laravel 12, PHP 8.4+
- **Frontend**: Inertia.js v2, React 19, TypeScript, Tailwind, shadcn/ui
- **Realtime**: Laravel Reverb + Laravel Echo
- **Parser/Listener**: Node.js TypeScript sidecar
- **DB**: PostgreSQL (dev/prod), SQLite `:memory:` for tests

## Local Setup

```bash
cp apps/web/.env.example apps/web/.env
cp apps/sidecar/.env.example apps/sidecar/.env
make up           # or: make up ENGINE=docker
kiri compose exec web composer install
kiri compose exec web php artisan key:generate
kiri compose exec web php artisan migrate --seed
```

## Make Targets

| Target | Description |
| --- | --- |
| `make up` | Start stack (build) |
| `make down` | Stop stack |
| `make logs` | Follow logs |
| `make ps` | Show services |
| `make test` | Web + sidecar tests |
| `make lint` | Pint + TS lint/checks |
| `make e2e` | Playwright smoke tests |

Use `ENGINE=docker` to run with Docker Compose.

## Configuration

### Web (`apps/web/.env`)

- `DB_*` — database
- `REVERB_*`, `VITE_REVERB_*` — realtime
- `SIDECAR_INTERNAL_URL` — web to sidecar
- `SIDECAR_SHARED_TOKEN` — internal auth
- `LARAVEL_CONTROL_TOKEN` — sidecar to Laravel control
- `PRINT_JOBS_RETENTION_DAYS` — prune retention (default 30)

### Sidecar (`apps/sidecar/.env`)

- Listener bind/port settings
- Laravel ingest URL/token
- Parser/runtime settings

## Key Routes

- `/jobs` — Jobs workspace
- `/jobs/{id}` — Job detail
- `/jobs/feed` — polling feed
- `/listeners` — listener management
- `/printer-profiles` — printer profiles
- `/jobs?ui=blade` — Blade fallback

## Internal Behavior

- Print jobs stored in `print_jobs`.
- Ingest is idempotent by `external_id`.
- Raw payload preserved, including parse failures.
- Internal endpoints validate sidecar token.
- Job/listener/profile queries scoped to authenticated user.

## Testing

```bash
make test
make lint
make e2e
```

Manual:

```bash
kiri compose exec web php artisan test
kiri compose exec web ./vendor/bin/pint --test
kiri compose exec sidecar npm test
kiri compose exec sidecar npm run lint
kiri compose exec web npm run build
```

## TCP Smoke Test

```bash
printf "\x1B\x40Hello ESC/POS\n\x1D\x56\x00" | nc 127.0.0.1 9100
```
