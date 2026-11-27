# Security Policy

## Supported Versions

Open POS Printer Emulator is currently a development-focused project. Security fixes are applied to the latest `main` branch and the latest release when releases are available.

| Version        | Supported   |
| -------------- | ----------- |
| Latest release | Yes         |
| `main`         | Best effort |
| Older releases | No          |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Use GitHub's private vulnerability reporting / Security Advisory flow for this repository when available. If private reporting is not available, contact the maintainer through a private channel before disclosing details publicly.

When reporting, include:

- A clear description of the issue and impact
- Steps to reproduce or a proof of concept
- Affected version/commit
- Any suggested mitigation, if known

## Security Notes

This project is intended for **local development and testing only**. It is **not recommended for production deployment**.

- Do not expose the emulator, sidecar, or internal ingest endpoints to untrusted networks.
- Treat ESC/POS payloads, uploaded data, and external inputs as untrusted.
- Keep `SIDECAR_SHARED_TOKEN` and other secrets private.
- Use Docker/Kiri network isolation and firewall rules when running in shared environments.
