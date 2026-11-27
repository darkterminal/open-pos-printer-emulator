<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <link rel="icon" href="/favicon.ico" sizes="any">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <title>{{ $title ?? 'Open POS Printer Emulator' }}</title>
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <style>
        :root { --bg:#F7F4EF; --panel:#FFFDFC; --muted:#7A746C; --text:#2A2724; --accent:#D9653B; --border:#D8D1C7; --danger:#C4554D; --ok:#5A8A6A; }
        * { box-sizing: border-box; }
        body { margin:0; font-family: 'Space Grotesk', ui-sans-serif, system-ui, -apple-system, sans-serif; background: var(--bg); color:var(--text); }
        a { color: var(--accent); text-decoration: none; }
        .shell { max-width: 1200px; margin: 0 auto; padding: 24px; }
        .nav { display:flex; justify-content:space-between; align-items:center; padding:14px 18px; background:var(--panel); border:1px solid var(--border); border-radius:2px; margin-bottom:24px; }
        .brand { font-weight:700; letter-spacing:.01em; display:flex; align-items:center; gap:10px; }
        .brand img { width:32px; height:32px; border-radius:3px; object-fit:contain; }
        .muted { color: var(--muted); }
        .panel { background:var(--panel); border:1px solid var(--border); border-radius:2px; padding:20px; box-shadow: 0 1px 2px rgba(42,39,36,.04); }
        .btn { background:var(--accent); color:#FFFDFC; border:1px solid rgba(217,101,59,.4); padding:10px 14px; border-radius:2px; font-weight:600; cursor:pointer; font-family: 'IBM Plex Mono', monospace; font-size:12px; text-transform:uppercase; letter-spacing:.04em; }
        .btn-secondary { background:transparent; color:var(--text); border:1px solid var(--border); }
        input { width:100%; padding:10px 12px; border-radius:2px; border:1px solid var(--border); background:#fff; color:var(--text); }
        label { display:block; margin-bottom:6px; color:var(--muted); font-size:14px; }
        table { width:100%; border-collapse: collapse; }
        th, td { padding:12px 10px; border-bottom:1px solid var(--border); text-align:left; font-size:14px; vertical-align:top; }
        th { color: var(--muted); font-weight:600; font-family: 'IBM Plex Mono', monospace; font-size:11px; text-transform:uppercase; letter-spacing:.06em; }
        .badge { display:inline-block; padding:4px 8px; border-radius:2px; font-size:11px; border:1px solid var(--border); font-family:'IBM Plex Mono', monospace; text-transform:uppercase; }
        .badge-ok { color:var(--ok); border-color:rgba(90,138,106,.3); background:rgba(90,138,106,.12); }
        .badge-warn { color:var(--accent); border-color:rgba(217,101,59,.3); background:rgba(217,101,59,.1); }
        .badge-err { color:var(--danger); border-color:rgba(196,85,77,.3); background:rgba(196,85,77,.1); }
        .error { color: var(--danger); font-size: 14px; margin-top: 8px; }
        .grid { display:grid; gap:16px; }
    </style>
</head>
<body>
<div class="shell">
    <div class="nav">
        <div>
            <div class="brand"><img src="/oppe.png" alt="OPPE logo"> Open POS Printer Emulator</div>
            <div class="muted" style="margin-left:42px;font-size:13px;">TCP ingest to job history</div>
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
            @auth
                <a href="{{ route('jobs.index') }}" class="muted">Jobs</a>
                <a href="{{ route('listeners.index') }}" class="muted">Listeners</a>
                <form method="POST" action="{{ route('logout') }}" style="margin:0;">
                    @csrf
                    <button class="btn btn-secondary" type="submit">Logout</button>
                </form>
            @endauth
        </div>
    </div>
    {{ $slot }}
</div>
</body>
</html>
