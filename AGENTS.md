# AGENTS.md — Open POS Printer Emulator

Panduan operasional untuk agent yang bekerja di repositori ini. Ikuti instruksi ini sebelum mengubah kode.

## Gambaran Proyek

Open POS Printer Emulator adalah aplikasi web open source self-hosted untuk menguji integrasi ESC/POS tanpa printer fisik. POS client mengirim byte stream ESC/POS via RAW TCP ke listener (default `9100`), sidecar Node.js memproses payload, Laravel menyimpan dan menyiarkan event, dan UI React/Inertia menampilkan preview/inspector/history.

## Stack

- **Backend:** Laravel 12+ (PHP 8.4+)
- **Frontend:** Inertia.js v2 + React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **Real-time:** Laravel Reverb + Laravel Echo
- **TCP Listener/Parser:** Node.js TypeScript sidecar (`apps/sidecar`)
- **Database:** PostgreSQL (dev/prod container), SQLite opsional untuk test tertentu
- **Orchestration:** Kiri Compose (default)

## Struktur Penting

- `apps/web/` — Laravel app
- `apps/sidecar/` — Node.js TCP listener + ESC/POS parser
- `docker/` — Dockerfile untuk service
- `compose.yaml` — Kiri Compose stack
- `.internal/` — dokumen planning internal; **excluded dari git**, jangan commit
- `.internal/architecture/` — arsitektur dan ADR
- `.internal/api/internal-sidecar-contract.md` — kontrak internal sidecar <-> Laravel

## Aturan Runtime: Kiri First

Gunakan **Kiri** sebagai runtime container default. Docker **bukan** deprecated, tapi hanya fallback eksplisit.

- Gunakan `kiri compose ...`, bukan `docker compose ...` untuk workflow normal.
- Gunakan `kiri compose up -d --build`, `kiri compose ps`, `kiri compose logs -f`, `kiri compose exec ...`.
- Jangan menulis ulang Compose/Dockerfile hanya karena ganti runtime.
- Jangan beralih runtime diam-diam saat command gagal; jika perlu Docker fallback, sebutkan alasannya eksplisit.
- Jangan jalankan perintah destruktif (`down -v`, prune, volume/image delete) tanpa alasan jelas dan otorisasi jika berdampak.

## Aturan Menulis File: WAJIB Pakai Write/Edit Tools

**Jangan pernah menggunakan shell heredoc** untuk menulis file (`cat <<EOF`, `<<'EOF'`, redirect heredoc serupa). Ini pernah menyebabkan korupsi file (`File not found:`) secara diam-diam.

- Buat/overwrite file dengan tool `write`.
- Perubahan parsial dengan tool `edit`.
- Shell hanya untuk eksekusi, inspeksi, git, test, build, dan verifikasi.
- Setelah menulis file penting, verifikasi dengan `wc -c` dan baca cuplikan (`head`/`sed`) sebelum file dipakai downstream.
- Jika file mencurigakan kecil atau berisi `File not found:`, anggap corrupt dan tulis ulang via `write` tool.

## E2E Testing: Playwright MCP

Gunakan **Playwright MCP** untuk E2E testing alur browser. Jangan mengandalkan asumsi visual tanpa verifikasi.

- Gunakan Playwright MCP untuk skenario UI kritis: login, job masuk, live preview, command inspector, raw viewer, history, fault simulation.
- Viewport default: **1440 x 775** (sesuai environment browser).
- Pastikan service berjalan via Kiri sebelum E2E: `kiri compose ps`.
- Untuk verifikasi cepat end-to-end, kirim payload TCP:

```bash
printf "\x1B\x40Hello ESC/POS\n\x1D\x56\x00" | nc 127.0.0.1 9100
```

- Tangkap bukti saat relevan (screenshot/log) dan laporkan hasil aktual, bukan asumsi.

## Konvensi Pengembangan

- **Branching:** trunk-based / GitHub Flow; branch pendek dari `main`.
- **Commit:** Conventional Commits (`feat(scope): ...`, `fix(scope): ...`).
- **Kontrak internal:** patuhi `.internal/api/internal-sidecar-contract.md`; sertakan `schema_version`, `correlation_id`, ISO 8601 UTC.
- **Idempotency:** job ingest harus idempotent berdasarkan `external_id`.
- **Keamanan:** validasi `X-Sidecar-Token` untuk endpoint internal; jangan log secret/token.
- **Kegagalan:** raw payload tetap disimpan meski parsing gagal; jangan buang data debugging.
- **Naming DB:** gunakan `print_jobs` untuk job cetak agar tidak bentrok dengan tabel queue Laravel `jobs`.

## Perintah Umum

```bash
make up          # kiri compose up -d --build
make down        # kiri compose down
make logs        # kiri compose logs -f
make ps          # kiri compose ps
make test        # web + sidecar tests
make lint        # pint + eslint/tsc checks
```

## Checklist Sebelum Handoff

- Perubahan fokus dan sesuai scope.
- Tidak ada secret/token di kode/log.
- Tes relevan dijalankan; laporkan hasil nyata.
- Dokumen internal diperbarui jika kontrak/arsitektur berubah.
- Tidak ada file ditulis lewat shell heredoc.
