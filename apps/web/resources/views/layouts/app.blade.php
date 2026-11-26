<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title ?? 'Open POS Printer Emulator' }}</title>
    <style>
        :root { --bg:#0b0f14; --panel:#141b24; --muted:#8fa3b8; --text:#e6edf3; --accent:#57d38c; --border:#243142; --danger:#ff7b72; }
        * { box-sizing: border-box; }
        body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; background: linear-gradient(180deg,#0b0f14,#101720); color:var(--text); }
        a { color: var(--accent); text-decoration: none; }
        .shell { max-width: 1200px; margin: 0 auto; padding: 24px; }
        .nav { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; background:rgba(20,27,36,.9); border:1px solid var(--border); border-radius:12px; margin-bottom:24px; }
        .brand { font-weight:700; letter-spacing:.02em; }
        .muted { color: var(--muted); }
        .panel { background:rgba(20,27,36,.92); border:1px solid var(--border); border-radius:12px; padding:20px; }
        .btn { background:var(--accent); color:#082012; border:0; padding:10px 14px; border-radius:8px; font-weight:600; cursor:pointer; }
        .btn-secondary { background:transparent; color:var(--text); border:1px solid var(--border); }
        input { width:100%; padding:10px 12px; border-radius:8px; border:1px solid var(--border); background:#0f1620; color:var(--text); }
        label { display:block; margin-bottom:6px; color:var(--muted); font-size:14px; }
        table { width:100%; border-collapse: collapse; }
        th, td { padding:12px 10px; border-bottom:1px solid var(--border); text-align:left; font-size:14px; vertical-align:top; }
        th { color: var(--muted); font-weight:600; }
        .badge { display:inline-block; padding:4px 8px; border-radius:999px; font-size:12px; border:1px solid var(--border); }
        .badge-ok { color:#57d38c; border-color:#28543a; background:#102218; }
        .badge-warn { color:#ffd166; border-color:#5a4a20; background:#211c0d; }
        .badge-err { color:#ff7b72; border-color:#5a2522; background:#211010; }
        .error { color: var(--danger); font-size: 14px; margin-top: 8px; }
        .grid { display:grid; gap:16px; }
    </style>
</head>
<body>
<div class="shell">
    <div class="nav">
        <div>
            <div class="brand">Open POS Printer Emulator</div>
            <div class="muted">Sprint 1 foundation — TCP ingest to job history</div>
        </div>
        <div>
            @auth
                <form method="POST" action="{{ route('logout') }}">
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
