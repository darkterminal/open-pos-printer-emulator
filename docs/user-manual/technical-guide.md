---
title: Technical guide
description: Architecture, setup, configuration, commands, and operational notes for developers and integrators.
section: Reference
eyebrow: For developers
---

## Architecture

> Docs: [Jekyll](https://jekyllrb.com/) · [Mermaid](https://mermaid.js.org/) diagrams · [Playwright](https://playwright.dev/) E2E · [Prettier](https://prettier.io/) formatting  
> Windows local mode: see [Windows distribution target](windows-distribution.md).

<div class="mermaid">
flowchart LR
    A["POS / Client"] -->|"Raw ESC/POS<br/>TCP 9100"| B["Node.js sidecar<br/>apps/sidecar"]
    B -->|"Internal HTTP ingest<br/>token-auth"| C["Laravel API"]
    C --> D["Store print_jobs<br/>+ broadcast events"]
    D --> E["Inertia React UI<br/>Jobs / Listeners / Profiles"]
</div>

<p class="diagram-caption">Technical flow: TCP ingest → sidecar parsing → Laravel ingest/storage → realtime UI.</p>

## Stack

- **Backend**: [Laravel](https://laravel.com/) 12, [PHP](https://www.php.net/) 8.4+
- **Frontend**: [Inertia.js](https://inertiajs.com/) v2, [React](https://react.dev/) 19, [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/)
- **Realtime**: [Laravel Reverb](https://reverb.laravel.com/) + [Laravel Echo](https://laravel.com/docs/broadcasting#client-side-installation)
- **Parser/Listener**: [Node.js](https://nodejs.org/) TypeScript sidecar
- **DB**: [PostgreSQL](https://www.postgresql.org/) (dev/prod), [SQLite](https://www.sqlite.org/) `:memory:` for tests

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

Use `ENGINE=docker` to run with [Docker Compose](https://docs.docker.com/compose/). [Kiri](https://runkiri.com/) is the default runtime.

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
