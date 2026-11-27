# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Open-source community files: Code of Conduct, Security Policy, Support guide, and Changelog.
- Development installer script for quick local setup.

### Changed

- Documentation refreshed for public open-source use and clarified development-only scope.

## [0.1.0] - 2026-11-28

Initial public open-source release. Open POS Printer Emulator is intended for local development, QA, and ESC/POS integration testing — not for production deployment.

### Added

- TCP ESC/POS listener and Node.js sidecar parser.
- Laravel ingest API with token auth, idempotent `external_id`, and raw payload preservation.
- Realtime Jobs UI with receipt preview, command inspector, raw viewer, and polling fallback.
- Listener management, printer profiles, fault simulation, and job history filters.
- Docker/Kiri local development stack, CI, E2E smoke tests, and user documentation.
