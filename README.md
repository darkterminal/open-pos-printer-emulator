# Open POS Printer Emulator

Open POS Printer Emulator adalah aplikasi web open source self-hosted untuk menguji integrasi ESC/POS tanpa printer fisik. Aplikasi POS dapat mengirim byte stream ESC/POS melalui TCP/IP mentah ke port yang dapat dikonfigurasi (default `9100`), lalu pengembang dapat melihat live preview struk, command inspector, raw hex/ASCII, dan riwayat job di browser.

> Status: **MVP in progress**. Repo private sampai siap dipublikasikan.

## Tujuan MVP

- TCP listener ESC/POS (default 9100)
- Parsing subset perintah ESC/POS
- Live receipt preview real-time
- Command inspector dan raw data viewer
- Job history per listener
- Printer profiles
- Fault simulation
- Export PDF/gambar
- Autentikasi pengguna sederhana

## Stack

- **Backend:** Laravel 12+ (PHP 8.4+)
- **Frontend:** Inertia.js v2 + React 19 + TypeScript + shadcn/ui (default), Blade fallback (`?ui=blade`)
- **Real-time:** Laravel Reverb + Laravel Echo
- **TCP Listener & Parser:** Node.js TypeScript sidecar
- **Database:** PostgreSQL (dev/prod container), SQLite `:memory:` untuk test
- **Orchestration:** Kiri Compose (Docker fallback kompatibilitas)

## Struktur Repositori

```text
.
├── apps/
│   ├── web/                  # Laravel + Inertia React + shadcn/ui (Blade fallback)
│   └── sidecar/              # Node.js TCP listener + ESC/POS parser
├── docker/                   # Konfigurasi container/runtime
├── .github/workflows/        # CI (lint/test) + E2E smoke workflow
├── .internal/                # Dokumen internal planning (gitignored)
├── compose.yaml              # Kiri Compose
├── compose.ci.yaml           # CI override untuk Docker Compose E2E
└── Makefile                  # Task wrapper
```

## Quick Start (Kiri)

```bash
cp apps/web/.env.example apps/web/.env
cp apps/sidecar/.env.example apps/sidecar/.env

kiri compose up -d --build
kiri compose exec web composer install
kiri compose exec web php artisan key:generate
kiri compose exec web php artisan migrate --seed
```

Endpoints lokal:
- Web: `http://localhost:8080`
- Reverb: `ws://localhost:8081`
- TCP listener: `localhost:9100`
- Sidecar health: `http://localhost:3001/health`

## Verifikasi Cepat

```bash
printf "\x1B\x40Hello ESC/POS\n\x1D\x56\x00" | nc 127.0.0.1 9100
```

Buka `/jobs` (Inertia default) atau `/jobs?ui=blade` untuk fallback Blade.

## Fitur Saat Ini

- **TCP ingest:** listener 9100 + finalize idle timeout/client close; raw payload tetap disimpan meski parsing gagal.
- **Parser ESC/POS subset:** init, align, bold/underline, text size, line spacing/feed, HT/ESC D tabs, ESC $/\ positioning, cut, cash drawer, barcode/QR/image placeholders, DLE EOT status, codepages CP437/CP850/CP858/CP1252/ISO-8859-1.
- **Raster/image:** `GS v 0` dan `ESC *` (mode 8-dot/24-dot yang didukung, mode lain diberi warning) dirender sebagai preview; `GS ( L` raster subset didukung best-effort dengan fallback placeholder/warning untuk varian tidak didukung.
- **Ingest internal Laravel:** token auth, payload validation, idempotent `external_id`, checksum SHA-256.
- **Realtime Jobs:** `/jobs` via Reverb/Echo + polling fallback `/jobs/feed`. Blade fallback juga punya live update filter-aware.
- **Job history UX:** filter/search/pagination/date range (`q,status,listener_id,date_from,date_to,per_page,page`) di Inertia dan Blade.
- **Job detail:** receipt preview, command inspector, warnings, raw base64, export Print/Save PDF dan client-side PNG/text.
- **Listener management:** CRUD/edit/delete listener, sidecar status, heartbeat, last error, fault simulation toggles (paper_out, cover_open, cutter_error, offline), manual sync.
- **Sidecar control:** ensure/start/stop/update faults. Laravel internal listener status ingest + bootstrap endpoints. `sidecar:sync-listeners` berjalan saat startup web dan terjadwal tiap menit.
- **Printer Profiles MVP:** CRUD profile (builtin tidak editable/deletable; profile yang dipakai listener tidak deletable).
- **Auth/ownership scoping:** listener/job/printer profile query dan mutasi dibatasi ke user terautentikasi; builtin printer profile tetap readable.
- **Ops hardening:** index `print_jobs` untuk query history/feed, command `jobs:prune --days= --dry-run`, env `PRINT_JOBS_RETENTION_DAYS` (default 30), schedule prune harian 03:30.
- **UI default:** Inertia React + shadcn/ui di `/jobs`, `/jobs/{id}`, `/listeners`, `/printer-profiles`. Blade fallback tersedia via `?ui=blade`.

## Testing & Checks

```bash
make test
make lint
make e2e   # butuh stack aktif di localhost:8080
```

Manual checks:

```bash
kiri compose exec web php artisan test
kiri compose exec web ./vendor/bin/pint --test
kiri compose exec sidecar npm test
kiri compose exec sidecar npm run lint
kiri compose exec web npm run build
```

E2E Playwright smoke (committed):

```bash
cd apps/web
npm ci
npx playwright install chromium
E2E_BASE_URL=http://localhost:8080 npx playwright test
```

Smoke mencakup: login admin, jobs page, printer profile create, TCP ingest, job detail export controls. Gunakan DB/stack ephemeral untuk CI; smoke lokal dapat membuat data test.

## CI

- `.github/workflows/ci.yml`: web Pint + PHPUnit (SQLite `:memory:`), sidecar lint + Vitest.
- `.github/workflows/e2e.yml`: Docker Compose stack (`compose.yaml` + `compose.ci.yaml`), migrate/seed/build, Playwright smoke, upload trace/logs on failure.

## Troubleshooting

- **Kiri BuildKit mirror timeout**: jika build gagal karena mirror lokal, gunakan builder `docker-container` tanpa mirror, build `--load`, lalu `kiri compose up -d --no-build`.
- **Reverb tidak live**: cek `kiri compose ps` untuk service `reverb` dan port `8081`; UI jobs punya polling fallback.
- **Blade fallback stale**: gunakan `/jobs?ui=blade`; fallback punya live update filter-aware, tapi tetap verifikasi dengan polling/fetch feed.
- **Test menghapus data dev**: jangan override `phpunit.xml` env; test harus jalan di SQLite `:memory:`.
- **Sidecar status stale**: jalankan `kiri compose exec web php artisan sidecar:sync-listeners`.
- **Retention/prune**: cek `PRINT_JOBS_RETENTION_DAYS`; dry-run aman dengan `kiri compose exec web php artisan jobs:prune --dry-run`.
- **E2E flakiness**: pastikan web/reverb/sidecar/db sehat, port 8080/8081/9100/3001 free, dan gunakan trace `apps/web/test-results` saat gagal.

## Lisensi

[Apache License 2.0](LICENSE)
