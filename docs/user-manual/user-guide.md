---
title: User guide
description: How to use the Open POS Printer Emulator web UI for daily testing and receipt inspection.
section: Guide
eyebrow: For users
---

## Sign In

Open the emulator URL and sign in with your credentials. In local seeded development, the default account is:

- **Email:** `admin@example.com`
- **Password:** `password`

## Jobs Workspace

The **Jobs** page is the main workspace. It has three panels:

- **Left — Job History**: received print jobs, search/filter, scroll to load more.
- **Center — Receipt Preview**: visual preview of the selected job.
- **Right — Job Detail**: metadata, warnings, command inspector, and raw data.

### Selecting a Job

Click a job in the left list. The center preview and right detail panel update to that job.

### Filtering Jobs

Use the filters above the job list:

- **Search**: external ID, correlation ID, or source IP.
- **Status**: `parsed`, `partial`, `parse_error`, etc.
- **Listener**: filter by TCP listener.

Click **Filter** to apply, or **Reset** to clear.

### Status Meanings

| Status | Meaning |
| --- | --- |
| `parsed` | Payload parsed successfully. |
| `partial` | Parsed with warnings/unsupported commands. |
| `parse_error` | Parsing failed or was incomplete; raw payload is still stored. |

### Export / Print

Use **Print / Save PDF** above the receipt preview to print or save the selected receipt from your browser.

## Job Detail Information

The right panel includes:

- **Metadata**: IDs, listener, source, timestamps, size, correlation, SHA-256, parser profile.
- **Warnings**: parser warnings for unsupported or unusual commands.
- **Command Inspector**: parsed commands with offsets and args.
- **Raw Data Viewer**: hex dump and base64 payload; copy buttons for debugging.

## Listeners

The **Listeners** page manages TCP ports that receive ESC/POS data.

Common tasks:

- Check listener status and last error.
- Create/edit/delete listeners (as permitted).
- Configure fault simulation (paper out, cover open, cutter error, offline).
- Sync sidecar listener state.

> Most users only need the correct listener host/port. Default is `9100`.

## Printer Profiles

The **Printer Profiles** page manages printer presets used by listeners/emulation.

- View built-in and custom profiles.
- Create/edit custom profiles.
- Built-in profiles may be read-only.
- Profiles in use by listeners may be protected from deletion.

## Dark Mode

Use the sun/moon icon in the top navigation to switch themes. The preference is saved in your browser.

## Tips

- If a receipt looks wrong, check **Warnings** first.
- If a command is unsupported, inspect **Command Inspector** and **Raw Data Viewer**.
- Share Job ID, external ID, received time, and screenshot when reporting issues.
