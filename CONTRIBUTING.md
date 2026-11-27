# Contributing to Open POS Printer Emulator

Thank you for your interest in contributing. Open POS Printer Emulator is an open-source **development tool** for testing ESC/POS integrations without physical printers. Contributions that improve parser accuracy, developer experience, docs, tests, and debugging workflows are welcome.

## Ground Rules

- You can use **Kiri** (default) or **Docker Compose** as the container runtime. Pick the engine you prefer via `make ... ENGINE=kiri|docker`.
- **Do not use shell heredocs** to write files; use a safe tool/editor. After writing an important file, verify its contents.
- Follow Conventional Commits: `feat(scope): ...`, `fix(scope): ...`, `docs: ...`, etc.
- Keep PRs small and focused. Include the reason for the change and how to verify it.

## Local Setup

```bash
cp apps/web/.env.example apps/web/.env
cp apps/sidecar/.env.example apps/sidecar/.env

# Kiri (default) or Docker Compose
make up
# make up ENGINE=docker

# Replace `kiri compose` with `docker compose` if using Docker
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

1. Create a branch from `main`: `feat/...`, `fix/...`, `docs/...`.
2. Work on a focused change.
3. Run relevant tests/lint:

```bash
make test
make lint
# Or with Docker: make test ENGINE=docker && make lint ENGINE=docker
```

4. Open a PR with description, rationale, test steps, and screenshots for UI changes.

## Pull Request Checklist

- [ ] Scope is clear and related to an issue.
- [ ] Tests added/updated when relevant.
- [ ] No secrets/tokens/`.env` committed.
- [ ] Documentation updated if contracts/behavior changed.
- [ ] UI changes include evidence (screenshot/Playwright MCP).

## Reporting Bugs / Security

- Bug: open a GitHub Issue with reproduction steps, ESC/POS payload/sample if available, and relevant logs.
- Sensitive security issue: do not open a public issue first; contact the maintainer through a private channel to be listed. (For now, use GitHub Security Advisory if available.)

## Code of Conduct

By participating, you are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
