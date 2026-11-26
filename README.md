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
- **Frontend:** Blade (stabil) + Inertia.js v2 + React 19 + TypeScript skeleton (incremental migration)
- **Real-time:** Laravel Reverb + Laravel Echo
- **TCP Listener & Parser:** Node.js TypeScript sidecar
- **Database:** PostgreSQL (dev/prod container), SQLite `:memory:` untuk test
- **Orchestration:** Kiri Compose (Docker fallback kompatibilitas)

## Struktur Repositori

```text
.
├── apps/
│   ├── web/                  # Laravel + Blade + Inertia skeleton
│   └── sidecar/              # Node.js TCP listener + ESC/POS parser
├── docker/                   # Konfigurasi container/runtime
├── .internal/                # Dokumen internal planning (gitignored)
├── compose.yaml              # Kiri Compose
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

Buka `/jobs` atau `/jobs?ui=inertia` untuk melihat job.

## Fitur Saat Ini

- TCP listener 9100 + finalize idle timeout/client close.
- Parser ESC/POS subset: init, align, bold/underline, text size, line spacing/feed, HT/ESC D tabs, ESC $/\\ positioning, cut, cash drawer, barcode/QR/raster image placeholders, DLE EOT status, CP437/CP850/CP858/CP1252/ISO-8859-1 decode.
- Ingest internal Laravel: token auth, payload validation, idempotent `external_id`, raw payload persisted on parse error.
- Realtime `/jobs` via Reverb/Echo + polling fallback `/jobs/feed`.
- Job detail `/jobs/{id}`: receipt preview, command inspector, warnings, raw base64. Raster image preview rendered as monochrome canvas.
- Listener management `/listeners`: sidecar status, heartbeat, last error, fault simulation toggles (paper_out, cover_open, cutter_error, offline).
- Sidecar control endpoints: ensure/start listener, stop, update faults. Laravel internal listener status ingest endpoint.
- Listener sync command: `php artisan sidecar:sync-listeners` (also run on web startup and scheduled every minute).
- Inertia skeleton pages: `/jobs?ui=inertia`, `/jobs/{id}?ui=inertia`, `/listeners?ui=inertia`.

## Testing & Checks

```bash
make test
make lint
```

Manual checks:

```bash
kiri compose exec web php artisan test
kiri compose exec web ./vendor/bin/pint --test
kiri compose exec sidecar npm test
kiri compose exec sidecar npm run lint
kiri compose exec web npm run build
```

> Aturan agent/dev: selalu double-check implementasi lokal (test, lint, build, smoke path relevan) sebelum push ke GitHub untuk mengurangi bug setelah push.

## Troubleshooting

- **Kiri BuildKit mirror timeout**: jika build gagal karena `172.17.0.1:47391`, gunakan builder `docker-container` tanpa mirror, build `--load`, lalu `kiri compose up -d --no-build`.
- **Reverb tidak live**: cek `kiri compose ps` untuk service `reverb` dan port `8081`; UI `/jobs` punya polling fallback.
- **Test menghapus data dev**: jangan override `phpunit.xml` env; test harus jalan di SQLite `:memory:`.
- **Sidecar status stale**: jalankan `kiri compose exec web php artisan sidecar:sync-listeners`.

## Lisensi

[Apache License 2.0](LICENSE)
