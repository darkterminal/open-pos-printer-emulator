# User Guide

This guide is for non-technical users who want to test receipt printing without a physical printer.

## What You Need

- The Open POS Printer Emulator running (ask your developer/admin if you do not have the URL).
- A web browser.
- Login credentials.

Default local development credentials (if seeded):

- Email: `admin@example.com`
- Password: `password`

> If you are using a shared or production-like environment, use the credentials provided by your administrator.

## 1. Sign In

1. Open the emulator URL in your browser.
2. Enter your email and password.
3. Click **Sign in**.

After signing in, you will land on the **Jobs** page.

## 2. Jobs Workspace

The Jobs page is the main screen. It has three areas:

- **Left: Job History** — a list of received print jobs. You can search/filter and scroll to load more.
- **Center: Receipt Preview** — a visual preview of the selected receipt.
- **Right: Job Detail** — technical and diagnostic information for the selected job.

### Viewing a Job

1. Click a job in the left list.
2. The receipt preview updates in the center.
3. The right panel shows details such as status, listener, source, warnings, parsed commands, and raw data.

### Filtering Jobs

Use the filter fields above the job list:

- **Search** — search by external/correlation/source IP.
- **Status** — filter by job status (for example `parsed`, `partial`, `parse_error`).
- **Listener** — filter by the TCP listener that received the job.
- Click **Filter** to apply, or **Reset** to clear.

### Job Statuses

| Status | Meaning |
| --- | --- |
| `parsed` | The ESC/POS payload was parsed successfully. |
| `partial` | The payload was parsed, but some commands were unsupported or generated warnings. |
| `parse_error` | The parser could not fully parse the payload. The raw payload is still kept. |

### Exporting / Printing

When a job is selected, you can use **Print / Save PDF** in the preview area to print or save the receipt preview from your browser.

On the Job Detail page (open a job detail route if needed), export controls may include copy/export actions depending on the UI.

## 3. Listeners

The **Listeners** page shows TCP listener ports that receive ESC/POS data.

What you can do:

- View listener name, host, port, status, and last error.
- Create a new listener (if you have permission/access in your environment).
- Start/stop/update listeners as provided by the UI.
- Review fault simulation settings (used for testing printer error conditions).

> Most non-technical users only need to know which listener/port their POS should send to. Default is usually `9100`.

## 4. Printer Profiles

The **Printer Profiles** page contains printer presets. Profiles define printer characteristics used by listeners/emulation behavior.

What you can do:

- View available profiles.
- Create or edit custom profiles (if allowed).
- Use profiles when configuring listeners.

Built-in profiles may be read-only.

## 5. Dark Mode

Use the sun/moon icon in the top navigation to switch between light and warm dark mode. Your preference is saved in the browser.

## 6. Common Questions

### I sent a print job, but I don't see it

- Confirm the POS/client is sending to the correct host and port (default `9100`).
- Check with your admin that the emulator services are running.
- Click **Filter/Reset** or refresh the Jobs page.
- If realtime is not connected, the UI may fall back to polling; wait a moment and check again.

### The receipt looks different from the physical printer

The emulator renders a preview based on supported ESC/POS commands. Some commands may be rendered as placeholders or produce warnings. Check the **Warnings** and **Command Inspector** in the right panel.

### Can this replace a real printer?

No. It is a testing/emulation tool. It helps validate integration, payloads, and receipt layout before using real hardware.

## 7. Getting Help

If something looks wrong, capture:

- Job ID / external ID
- Time received
- Screenshot of the receipt preview and warnings
- Raw/base64 data if requested by a developer

Then share it with your technical team or open an issue in the repository.
