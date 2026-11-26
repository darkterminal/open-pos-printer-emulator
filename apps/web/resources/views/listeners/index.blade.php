@component('layouts.app', ['title' => 'Listeners - Open POS Printer Emulator'])
<style>
    .fault-form { display:flex; gap:12px; flex-wrap:wrap; align-items:center; }
    .fault-form label { display:inline-flex; gap:6px; align-items:center; margin:0; color:var(--text); font-size:13px; }
    .fault-form input[type="checkbox"] { width:auto; }
    .status-pill { display:inline-block; padding:4px 10px; border-radius:999px; font-size:12px; border:1px solid var(--border); }
    .status-listening { color:#57d38c; border-color:#28543a; background:#102218; }
    .status-stopped { color:#8fa3b8; border-color:#31465f; background:#111923; }
    .status-error { color:#ff7b72; border-color:#5a2522; background:#211010; }
</style>

<div style="display:flex; justify-content:space-between; align-items:flex-end; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
    <div>
        <a href="{{ route('jobs.index') }}" class="muted">&larr; Job history</a>
        <h1 style="margin:6px 0 0;">Listeners</h1>
        <p class="muted" style="margin:6px 0 0;">Manage TCP listener status and fault simulation.</p>
    </div>
    <form method="POST" action="{{ route('listeners.sync') }}">
        @csrf
        <button class="btn btn-secondary" type="submit">Sync from sidecar</button>
    </form>
</div>

<div class="panel" style="margin-bottom:16px;">
    <h2 style="margin:0 0 12px; font-size:16px;">Add Listener</h2>
    <form method="POST" action="{{ route('listeners.store') }}" style="display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px; align-items:end;">
        @csrf
        <label>Name
            <input name="name" value="{{ old('name') }}" required placeholder="Warehouse 9101">
        </label>
        <label>Host
            <input name="host" value="{{ old('host', '0.0.0.0') }}" required>
        </label>
        <label>Port
            <input name="port" type="number" min="1" max="65535" value="{{ old('port', '9101') }}" required>
        </label>
        <label>Printer Profile
            <select name="printer_profile_id">
                <option value="">(none)</option>
                @foreach ($profiles ?? [] as $profile)
                    <option value="{{ $profile->id }}" @selected((string) old('printer_profile_id') === (string) $profile->id)>{{ $profile->name }}</option>
                @endforeach
            </select>
        </label>
        <div>
            <button class="btn" type="submit">Create & Start</button>
        </div>
    </form>
</div>

@if (session('status'))
    <div class="panel" style="margin-bottom:16px; border-color:#28543a; color:#57d38c;">{{ session('status') }}</div>
@endif
@if ($errors->any())
    <div class="panel" style="margin-bottom:16px; border-color:#5a2522; color:#ff7b72;">
        {{ $errors->first() }}
    </div>
@endif

<div class="panel">
    <table>
        <thead>
        <tr>
            <th>Listener</th>
            <th>Bind</th>
            <th>Profile</th>
            <th>DB Status</th>
            <th>Sidecar</th>
            <th>Jobs</th>
            <th>Fault Simulation</th>
            <th>Actions</th>
        </tr>
        </thead>
        <tbody>
        @forelse ($listeners as $listener)
            @php
                $sidecar = $sidecarById[$listener->external_id] ?? null;
                $scStatus = $sidecar['status'] ?? 'unknown';
                $scClass = match($scStatus) {
                    'listening' => 'status-listening',
                    'stopped' => 'status-stopped',
                    'error' => 'status-error',
                    default => 'status-stopped',
                };
                $faults = $sidecar['fault_config'] ?? ($listener->fault_config_json ?? []);
            @endphp
            <tr>
                <td>
                    <div style="font-weight:600;">{{ $listener->name }}</div>
                    <div class="muted">{{ $listener->external_id }}</div>
                </td>
                <td>{{ $listener->host }}:{{ $listener->port }}</td>
                <td>{{ $listener->printerProfile?->name ?? '-' }}</td>
                <td><span class="badge">{{ $listener->status }}</span></td>
                <td>
                    <span class="status-pill {{ $scClass }}">{{ $scStatus }}</span>
                    @php $heartbeat = $listener->last_heartbeat_at; @endphp
                    @if ($heartbeat)
                        <div class="muted" style="margin-top:4px;">Heartbeat: {{ $heartbeat->diffForHumans() }}</div>
                    @endif
                    @if (!empty($sidecar['last_error']) || !empty($listener->last_error))
                        <div class="muted" style="margin-top:4px; color:#ff7b72;">{{ $sidecar['last_error'] ?? $listener->last_error }}</div>
                    @endif
                </td>
                <td>{{ $listener->print_jobs_count }}</td>
                <td>
                    <form method="POST" action="{{ route('listeners.faults.update', $listener) }}" class="fault-form">
                        @csrf
                        @method('PATCH')
                        <label><input type="checkbox" name="paper_out" value="1" @checked(!empty($faults['paper_out']))> Paper out</label>
                        <label><input type="checkbox" name="cover_open" value="1" @checked(!empty($faults['cover_open']))> Cover open</label>
                        <label><input type="checkbox" name="cutter_error" value="1" @checked(!empty($faults['cutter_error']))> Cutter error</label>
                        <label><input type="checkbox" name="offline" value="1" @checked(!empty($faults['offline']))> Offline</label>
                        <button class="btn btn-secondary" type="submit">Apply</button>
                    </form>
                </td>
                <td>
                    <details>
                        <summary class="muted" style="cursor:pointer; margin-bottom:8px;">Edit</summary>
                        <form method="POST" action="{{ route('listeners.update', $listener) }}" style="display:grid; gap:8px; margin-bottom:8px;">
                            @csrf
                            @method('PATCH')
                            <input name="name" value="{{ old('name', $listener->name) }}" required placeholder="Name">
                            <input name="host" value="{{ old('host', $listener->host) }}" required placeholder="Host">
                            <input name="port" type="number" min="1" max="65535" value="{{ old('port', $listener->port) }}" required placeholder="Port">
                            <select name="printer_profile_id">
                                <option value="">(none)</option>
                                @foreach ($profiles ?? [] as $profile)
                                    <option value="{{ $profile->id }}" @selected((string) old('printer_profile_id', $listener->printer_profile_id) === (string) $profile->id)>{{ $profile->name }}</option>
                                @endforeach
                            </select>
                            <button class="btn btn-secondary" type="submit">Save</button>
                        </form>
                    </details>
                    <form method="POST" action="{{ route('listeners.destroy', $listener) }}" onsubmit="return confirm('Remove listener {{ $listener->name }}?');">
                        @csrf
                        @method('DELETE')
                        <button class="btn btn-secondary" type="submit" style="border-color:#5a2522; color:#ff7b72;">Delete</button>
                    </form>
                </td>
            </tr>
        @empty
            <tr>
                <td colspan="8" class="muted">No listeners configured.</td>
            </tr>
        @endforelse
        </tbody>
    </table>
</div>
@endcomponent
