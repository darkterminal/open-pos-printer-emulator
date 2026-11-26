# Open POS Printer Emulator

Open POS Printer Emulator adalah aplikasi web open source self-hosted untuk menguji integrasi ESC/POS tanpa printer fisik. Aplikasi POS dapat mengirim byte stream ESC/POS melalui TCP/IP mentah ke port yang dapat dikonfigurasi (default `9100`), lalu pengembang dapat melihat live preview struk, command inspector, raw hex/ASCII, dan riwayat job di browser.

> Status: **Phase 1 / Sprint 1 - Foundation**. Repositori ini sedang dibangun dari nol.

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
- **Frontend:** Inertia.js v2 + React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **Real-time:** Laravel Reverb + Laravel Echo
- **TCP Listener & Parser:** Node.js TypeScript sidecar
- **Database:** PostgreSQL (produksi/dev container), SQLite (opsional untuk test lokal tertentu)
- **Orchestration:** Kiri Compose (Docker tetap fallback kompatibilitas, bukan default)

## Struktur Repositori

```text
.
├── apps/
│   ├── web/                  # Laravel + Inertia + React
│   └── sidecar/              # Node.js TCP listener + ESC/POS parser
├── docker/                   # Konfigurasi container/runtime
├── .internal/                # Dokumen internal planning (excluded dari git)
│   ├── architecture/         # Arsitektur dan ADR
│   ├── api/                  # Kontrak internal sidecar <-> Laravel
│   ├── guides/               # Panduan setup dan troubleshooting
│   └── contributing/         # Panduan kontribusi
├── .github/workflows/        # CI/CD GitHub Actions
├── compose.yaml              # Kiri Compose
└── Makefile                  # Task wrapper
```

## Prasyarat

- Kiri (`command -v kiri`)
- Git
- Opsional untuk development di luar container: PHP 8.4+, Composer, Node.js 20+

## Quick Start (Kiri)

```bash
# 1. Clone
git clone <repo-url>
cd open-pos-printer-emulator

# 2. Salin environment
cp apps/web/.env.example apps/web/.env
cp apps/sidecar/.env.example apps/sidecar/.env

# 3. Jalankan service
kiri compose up -d --build

# 4. Setup Laravel (setelah service web tersedia)
kiri compose exec web composer install
kiri compose exec web php artisan key:generate
kiri compose exec web php artisan migrate --seed

# 5. Buka aplikasi
# Web: http://localhost:8080
# Reverb: ws://localhost:8081
# TCP listener: localhost:9100
```

> Catatan Kiri: jika build gagal karena mirror BuildKit `172.17.0.1:47391` timeout, gunakan builder sementara `kiri-nomirror` (lihat `.internal/notes/kiri-buildkit-diagnosis.md`, gitignored) untuk build image dengan `--load`, lalu jalankan `kiri compose up -d --no-build`.

## Verifikasi Cepat

Kirim payload ESC/POS sederhana ke listener:

```bash
printf "\x1B\x40Hello ESC/POS\n\x1D\x56\x00" | nc 127.0.0.1 9100
```

Ekspektasi Sprint 1: job tercatat di log sidecar dan/atau tersimpan di database, lalu tampil di halaman riwayat job.

## Pengembangan

Gunakan `Makefile` untuk task umum:

```bash
make up
make down
make logs
make test
make lint
```

## Dokumentasi Internal

Dokumen perencanaan internal disimpan di `.internal/` dan tidak di-commit ke git:

- `.internal/architecture/ARCHITECTURE.md`
- `.internal/architecture/adr/0001-sidecar-node-for-tcp-parser.md`
- `.internal/api/internal-sidecar-contract.md`

## Kontribusi

Proyek ini akan menggunakan trunk-based development, Conventional Commits, dan PR dengan squash merge. Lihat `CONTRIBUTING.md` (akan dilengkapi) dan issue tracker untuk pekerjaan yang bisa diambil.

## Lisensi

Proyek ini dilisensikan di bawah [Apache License 2.0](LICENSE).
