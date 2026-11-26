# Contributing to Open POS Printer Emulator

Terima kasih sudah tertarik berkontribusi. Proyek ini masih tahap awal (Sprint 1/Foundation), jadi kontribusi kecil yang rapi sangat membantu.

## Ground Rules

- Gunakan **Kiri** sebagai runtime container default (`kiri compose ...`). Docker hanya fallback eksplisit.
- **Jangan pakai shell heredoc** untuk menulis file; gunakan tool/editor yang aman. Setelah menulis file penting, verifikasi isinya.
- Ikuti Conventional Commits: `feat(scope): ...`, `fix(scope): ...`, `docs: ...`, dll.
- Jaga PR tetap kecil dan fokus. Sertakan alasan perubahan dan cara verifikasi.

## Local Setup

```bash
cp apps/web/.env.example apps/web/.env
cp apps/sidecar/.env.example apps/sidecar/.env
kiri compose up -d --build
kiri compose exec web php artisan key:generate
kiri compose exec web php artisan migrate --seed
```

Web: http://localhost:8080  
TCP listener: `localhost:9100`

Quick test:

```bash
printf "\x1B\x40Hello ESC/POS\n\x1D\x56\x00" | nc 127.0.0.1 9100
```

## Development Workflow

1. Buat branch dari `main`: `feat/...`, `fix/...`, `docs/...`.
2. Kerjakan perubahan fokus.
3. Jalankan tes/lint yang relevan:

```bash
kiri compose exec web php artisan test
kiri compose exec web ./vendor/bin/pint --test
kiri compose exec sidecar npm run lint
kiri compose exec sidecar npm test
```

4. Buka PR dengan deskripsi, alasan, cara uji, dan screenshot untuk perubahan UI.

## Pull Request Checklist

- [ ] Scope jelas dan terkait issue.
- [ ] Tes ditambah/diperbarui jika relevan.
- [ ] Tidak ada secret/token/`.env` yang ter-commit.
- [ ] Dokumentasi diperbarui jika kontrak/behavior berubah.
- [ ] Perubahan UI disertakan bukti (screenshot/Playwright MCP).

## Reporting Bugs / Security

- Bug: buka GitHub Issue dengan langkah reproduksi, payload/contoh ESC/POS bila ada, dan log relevan.
- Security issue sensitif: jangan buka issue publik dulu; hubungi maintainer melalui kanal privat yang akan dicantumkan. (Sementara, gunakan GitHub Security Advisory jika tersedia.)

## Code of Conduct

Dengan berpartisipasi, Anda diharapkan menjaga interaksi yang profesional dan respektif. Detail akan ditambahkan di `CODE_OF_CONDUCT.md`.
