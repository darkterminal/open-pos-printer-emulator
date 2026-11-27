# AGENTS.md — Open POS Printer Emulator

Operational guide for agents working in this repository. Follow these instructions before changing code.

## Project Overview

Open POS Printer Emulator is a self-hosted open-source web application for testing ESC/POS integrations without physical printers. A POS client sends an ESC/POS byte stream via raw TCP to a listener (default `9100`), the Node.js sidecar processes the payload, Laravel stores and broadcasts events, and the React/Inertia UI displays preview/inspector/history.

## Stack

- **Backend:** Laravel 12+ (PHP 8.4+)
- **Frontend:** Inertia.js v2 + React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **Real-time:** Laravel Reverb + Laravel Echo
- **TCP Listener/Parser:** Node.js TypeScript sidecar (`apps/sidecar`)
- **Database:** PostgreSQL (dev/prod container), SQLite optional for certain tests
- **Orchestration:** Kiri Compose (default)

## Key Structure

- `apps/web/` — Laravel app
- `apps/sidecar/` — Node.js TCP listener + ESC/POS parser
- `docker/` — container service Dockerfiles
- `compose.yaml` — Kiri Compose stack
- `.internal/` — internal planning documents; **git-excluded**, do not commit
- `.internal/architecture/` — architecture and ADRs
- `.internal/api/internal-sidecar-contract.md` — internal sidecar <-> Laravel contract

## Container Runtime: Kiri or Docker

Contributors may choose their preferred container engine. Both are supported.

- **Kiri** (default): `make up` or `make up ENGINE=kiri`
- **Docker Compose**: `make up ENGINE=docker`
- The `Makefile` `ENGINE` variable selects the runtime (`kiri compose` or `docker compose`). Pass `ENGINE=docker` to any make target.
- Do not rewrite Compose/Dockerfiles for engine preference; keep them compatible with both.
- Do not silently switch runtimes when a command fails; state the reason explicitly if fallback is needed.
- Do not run destructive commands (`down -v`, prune, volume/image delete) without a clear reason and authorization when impactful.

## File Writing Rule: MUST Use Write/Edit Tools

**Never use shell heredocs** to write files (`cat <<EOF`, `<<'EOF'`, or similar heredoc redirects). This has previously caused silent file corruption (`File not found:`).

- Create/overwrite files with the `write` tool.
- Make partial changes with the `edit` tool.
- Use shell only for execution, inspection, git, tests, builds, and verification.
- After writing an important file, verify with `wc -c` and read a snippet (`head`/`sed`) before using it downstream.
- If a file looks suspiciously small or contains `File not found:`, treat it as corrupt and rewrite it via the `write` tool.

## E2E Testing: Playwright MCP

Use **Playwright MCP** for browser E2E testing. Do not rely on visual assumptions without verification.

- Use Playwright MCP for critical UI scenarios: login, job ingress, live preview, command inspector, raw viewer, history, fault simulation.
- Default viewport: **1440 x 775** (per browser environment).
- Ensure services are running via Kiri before E2E: `kiri compose ps`.
- For quick end-to-end verification, send a TCP payload:

```bash
printf "\x1B\x40Hello ESC/POS\n\x1D\x56\x00" | nc 127.0.0.1 9100
```

- Capture evidence when relevant (screenshots/logs) and report actual results, not assumptions.

## Development Conventions

- **Branching:** trunk-based / GitHub Flow; short branches from `main`.
- **Commit:** Conventional Commits (`feat(scope): ...`, `fix(scope): ...`).
- **Internal contract:** follow `.internal/api/internal-sidecar-contract.md`; include `schema_version`, `correlation_id`, ISO 8601 UTC.
- **Idempotency:** job ingest must be idempotent based on `external_id`.
- **Security:** validate `X-Sidecar-Token` for internal endpoints; do not log secrets/tokens.
- **Failures:** keep raw payloads even when parsing fails; do not discard debugging data.
- **DB naming:** use `print_jobs` for print jobs to avoid conflict with Laravel's queue `jobs` table.

## Common Commands

```bash
make up          # kiri compose up -d --build
make down        # kiri compose down
make logs        # kiri compose logs -f
make ps          # kiri compose ps
make test        # web + sidecar tests
make lint        # pint + eslint/tsc checks
```

## Pre-Handoff Checklist

- Changes are focused and in scope.
- No secrets/tokens in code/logs.
- Relevant tests were run; report actual results.
- Internal docs updated if contracts/architecture changed.
- No files were written via shell heredoc.
