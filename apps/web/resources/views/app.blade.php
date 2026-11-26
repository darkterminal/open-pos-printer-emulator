<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title inertia>Open POS Printer Emulator</title>
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    @inertiaHead
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
        table { width:100%; border-collapse: collapse; }
        th, td { padding:12px 10px; border-bottom:1px solid var(--border); text-align:left; font-size:14px; vertical-align:top; }
        th { color: var(--muted); font-weight:600; }
        .badge { display:inline-block; padding:4px 8px; border-radius:999px; font-size:12px; border:1px solid var(--border); }
        .badge-ok { color:#57d38c; border-color:#28543a; background:#102218; }
        .badge-warn { color:#ffd166; border-color:#5a4a20; background:#211c0d; }
        .badge-err { color:#ff7b72; border-color:#5a2522; background:#211010; }
    </style>
</head>
<body>
@inertia
</body>
</html>
