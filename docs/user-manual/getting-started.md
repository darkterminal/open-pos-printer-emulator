---
title: Getting started
description: Run Open POS Printer Emulator locally with Kiri or Docker Compose and send your first test print.
section: Guide
eyebrow: First run
---

## Requirements

- **Kiri** (default) or **Docker Compose**
- Ports available: `8080`, `8081`, `9100`, `3001`, `5432` (defaults)
- `nc` (netcat) for the quick TCP smoke test (optional)

## Install and Run

### 1. Prepare environment files

```bash
cp apps/web/.env.example apps/web/.env
cp apps/sidecar/.env.example apps/sidecar/.env
```

### 2. Start the stack

Kiri (default):

```bash
make up
```

Docker Compose:

```bash
make up ENGINE=docker
```

### 3. Initialize Laravel app

Use the same engine you started with. For Kiri:

```bash
kiri compose exec web composer install
kiri compose exec web php artisan key:generate
kiri compose exec web php artisan migrate --seed
```

For Docker Compose, replace `kiri compose` with `docker compose`.

## Access the App

| Service | URL |
| --- | --- |
| Web UI | `http://localhost:8080` |
| Jobs page | `http://localhost:8080/jobs` |
| Reverb | `http://localhost:8081` |
| TCP listener | `localhost:9100` |
| Sidecar health | `http://localhost:3001/health` |

Default seeded credentials (local dev):

- **Email:** `admin@example.com`
- **Password:** `password`

## Send a Test Print

```bash
printf "\x1B\x40Hello ESC/POS\n\x1D\x56\x00" | nc 127.0.0.1 9100
```

Open `http://localhost:8080/jobs` — you should see a new job.

## Common Commands

```bash
make ps
make logs
make test
make lint
make e2e
make down
```

Docker Compose variant:

```bash
make ps ENGINE=docker
make logs ENGINE=docker
make test ENGINE=docker
make lint ENGINE=docker
```

## Next Steps

- [User guide](user-guide.md) — learn the Jobs, Listeners, and Printer Profiles screens.
- [Integration with ESC/POS Printer Server](integration-escpos-printer-server.md) — route real POS print jobs to the emulator.
