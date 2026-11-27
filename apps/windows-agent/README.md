# OPPE Windows Agent (MVP)

This is the **Windows distribution target** MVP for Open POS Printer Emulator.

It runs as a single local process with:
- TCP ESC/POS listener (default `9100`)
- Local HTTP UI/API (default `127.0.0.1:8080`)
- SQLite storage (`oppe-windows.db`)
- Basic ESC/POS parsing and receipt preview

> Status: MVP/PoC. It does **not** yet have full parity with the MacOS/Linux Docker/Kiri stack.

## Run (development)

From repo root:

```bash
cargo run --manifest-path apps/windows-agent/Cargo.toml
```

Custom ports/paths:

```bash
cargo run --manifest-path apps/windows-agent/Cargo.toml -- \
  --http-host 127.0.0.1 --http-port 8080 \
  --tcp-host 0.0.0.0 --tcp-port 9100 \
  --db-path ./oppe-windows.db
```

## Build Windows binary

On Windows (MSVC toolchain):

```powershell
cargo build --release --manifest-path apps/windows-agent/Cargo.toml
```

Cross-compile from Linux (requires target + linker configured):

```bash
rustup target add x86_64-pc-windows-msvc
cargo build --release --manifest-path apps/windows-agent/Cargo.toml --target x86_64-pc-windows-msvc
```

The CI workflow `.github/workflows/windows-agent.yml` builds a Windows artifact on `windows-latest`.

## Test TCP ingest

```bash
printf "\x1B\x40Hello OPPE Windows\n\x1D\x56\x00" | nc 127.0.0.1 9100
```

Then open `http://127.0.0.1:8080`.

## API

- `GET /health`
- `GET /api/jobs?limit=50`
- `GET /api/jobs/{id}`

## Scope

Included in MVP:
- TCP ingest, idle-timeout job finalization
- Raw payload + SHA-256 + SQLite persistence
- Basic ESC/POS command parsing (init, align, bold/underline/size, LF/CR, feed, cut, basic raster/image placeholders)
- Simple local web UI for job list and receipt preview

Not yet included:
- Full parser parity with Node sidecar
- Laravel/Inertia full feature parity
- Auth/multi-user
- Reverb realtime websocket
- Printer profile management parity
- Windows installer/service wrapper
- PDF/image export parity
