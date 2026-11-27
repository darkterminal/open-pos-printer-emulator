---
title: Windows distribution target
description: Planned Windows distribution path for Open POS Printer Emulator while keeping the current MacOS/Linux stack as the primary development and server mode.
section: Reference
eyebrow: Roadmap
---

## Goal

Keep the **current OPPE stack** as the primary mode for **MacOS/Linux** (and container-based workflows), while defining a separate **Windows distribution target** for POS environments where Docker/Kiri is not practical.

This page is a planning target, not a shipped Windows binary yet.

## Why a separate Windows target

Most POS environments run on Windows, often as a single machine with limited ops tooling. The current stack is optimized for developer/self-hosted container workflows:

- [Laravel](https://laravel.com/) web app
- [Node.js](https://nodejs.org/) TCP/ESC-POS sidecar
- [PostgreSQL](https://www.postgresql.org/) in dev/prod container
- [Laravel Reverb](https://reverb.laravel.com/) for realtime
- [Kiri](https://runkiri.com/) / [Docker Compose](https://docs.docker.com/compose/) orchestration

For Windows POS operators, the target experience should be simpler: install, run, open local UI, receive ESC/POS on TCP `9100`.

## Distribution strategy

<div class="mermaid">
flowchart TD
    A["Current OPPE (MacOS/Linux)"] --> B["Docker/Kiri mode"]
    B --> C["Laravel + Inertia/React"]
    B --> D["Node.js sidecar"]
    B --> E["PostgreSQL + Reverb"]

    A --> F["Windows distribution target"]
    F --> G["Single-machine local mode"]
    G --> H["Installer / ZIP + EXE"]
    G --> I["SQLite local storage"]
    G --> J["Local web UI / tray / service"]
</div>

<p class="diagram-caption">Current container mode stays for MacOS/Linux; Windows gets a dedicated local distribution target.</p>

## Recommended approach

### Keep now (MacOS/Linux/container)

- Keep existing [Laravel](https://laravel.com/) + [Inertia.js](https://inertiajs.com/)/[React](https://react.dev/) app.
- Keep [Node.js](https://nodejs.org/) sidecar as the TCP/parser runtime.
- Keep [Kiri](https://runkiri.com/) as default, [Docker Compose](https://docs.docker.com/compose/) as fallback.
- Keep PostgreSQL/Reverb for full dev/server mode.

### Windows target (phased)

| Phase | Scope | Suggested tech | Outcome |
|---|---|---|---|
| **P0 - PoC** | TCP ingest, parse subset, store jobs, basic local preview | **Rust** agent/binary or small hybrid prototype | Validate single-binary Windows feasibility |
| **P1 - Local MVP** | Local UI, job history, raw/preview, listener config, SQLite | Rust + embedded web UI, or [FrankenPHP](https://frankenphp.dev/) packaging PoC for Laravel subset | Usable Windows local mode |
| **P2 - Productize** | Installer, auto-start, update strategy, logs, diagnostics | Windows service + MSI/NSIS installer | POS-friendly distribution |
| **P3 - Parity** | Selected advanced features (profiles, faults, exports) | Based on PoC result | Feature parity where it matters |

## FrankenPHP vs Rust

| Option | Best use | Pros | Trade-offs |
|---|---|---|---|
| **[FrankenPHP](https://frankenphp.dev/)** | Package Laravel/PHP app with fewer moving parts | Reuses existing Laravel code, routes, views, business logic | Still need to solve Node sidecar, realtime, DB choice, PHP extensions, Windows service lifecycle, asset build, and local storage paths. Needs a PoC. |
| **[Rust](https://www.rust-lang.org/)** | Windows-native local agent/single binary | Small binary, easy distribution, strong service/process control, good fit for TCP/parser | Full rewrite of Laravel/Inertia stack is expensive. Best used for sidecar/engine or a scoped Windows-local product, not a blind full rewrite. |
| **Hybrid (recommended)** | Pragmatic path | Reuse OPPE domain knowledge; isolate TCP/parser core; keep MacOS/Linux container mode intact | Two delivery modes to maintain; requires clear feature boundaries. |

## Recommended MVP boundary for Windows

The Windows target should start with **local operator value**, not full parity:

- Receive raw ESC/POS over TCP `9100`.
- Parse supported subset and preserve raw payload.
- Store jobs locally in [SQLite](https://www.sqlite.org/).
- Show job history + receipt preview + raw/warnings.
- Run as a single Windows process/service with simple logs.

Deferred initially:

- Multi-user/auth complexity
- PostgreSQL/Reverb dependency
- Full Docker/Kiri orchestration
- Every advanced feature from container mode

## Non-goals (for now)

- Replacing the current MacOS/Linux container stack.
- Rewriting all Laravel/React features into Rust before validating demand.
- Promising full hardware-identical ESC/POS rendering on Windows local mode.

## Next actions

1. Create a PoC spike: Windows single-process TCP listener + SQLite + minimal web preview.
2. Measure packaging options: Rust-native vs FrankenPHP-assisted Laravel subset.
3. Define feature parity matrix: container mode vs Windows local mode.
4. Add CI artifact build only after PoC passes basic E2E smoke.

<div class="support-callout">
  <p><strong>Status:</strong> Planning target. Current stable workflow remains MacOS/Linux with <a href="https://runkiri.com/">Kiri</a> / <a href="https://docs.docker.com/compose/">Docker Compose</a>.</p>
</div>
