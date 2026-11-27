@component('layouts.app', ['title' => 'Jobs - Open POS Printer Emulator'])
<style>
    .jobs-grid { display:grid; grid-template-columns: minmax(320px, 420px) minmax(0,1fr); gap:16px; align-items:start; }
    @media (max-width: 1100px) { .jobs-grid { grid-template-columns: 1fr; } }
    .receipt-wrap { background:#0a0e13; border:1px solid var(--border); border-radius:12px; padding:20px; display:flex; justify-content:center; min-height:240px; }
    .receipt { width: 302px; background:#f7f4ec; color:#1a1a1a; font-family: "Courier New", ui-monospace, monospace; font-size:13px; line-height:1.45; padding:18px 16px 24px; border-radius:4px; box-shadow: 0 12px 40px rgba(0,0,0,.45); position:relative; }
    .receipt .head { text-align:center; font-weight:700; letter-spacing:.18em; font-size:11px; color:#555; margin-bottom:10px; }
    .receipt .line { min-height:1.45em; white-space:pre-wrap; word-break:break-word; }
    .receipt .cut { border-top:2px dashed #9a9a9a; margin-top:14px; padding-top:6px; text-align:center; font-size:10px; letter-spacing:.3em; color:#7a7a7a; }
    .receipt .placeholder { border:1px dashed #8d8a80; border-radius:3px; padding:8px 6px; font-size:11px; color:#4a4a4a; background:repeating-linear-gradient(45deg,#efece3,#efece3 6px,#e7e3d8 6px,#e7e3d8 12px); word-break:break-word; margin:4px 0; }
    .receipt .placeholder .kind { display:block; font-weight:700; letter-spacing:.2em; font-size:9px; color:#3d3d3d; margin-bottom:2px; }
    .receipt canvas { display:block; max-width:100%; height:auto; image-rendering:pixelated; background:#fff; border:1px solid #cfcabf; }
    .job-row { cursor:pointer; }
    .job-row.selected { background: rgba(74,144,226,.10); }
    .job-row:hover { background: rgba(255,255,255,.03); }
    .meta-mini { margin-top:12px; font-size:12px; color:var(--muted); display:grid; gap:6px; }
    .meta-mini div { display:flex; justify-content:space-between; gap:8px; border-bottom:1px solid var(--border); padding-bottom:4px; }
    .meta-mini div:last-child { border-bottom:0; padding-bottom:0; }
</style>
<div class="jobs-grid">
    <div class="panel" id="preview-panel">
        <div style="display:flex; justify-content:space-between; gap:8px; align-items:center; margin-bottom:12px;">
            <h2 style="margin:0; font-size:18px;">Receipt Preview</h2>
            <span class="muted" id="preview-job-id"></span>
        </div>
        <p class="muted" style="margin-top:0; font-size:13px;">Klik baris job untuk mengganti preview receipt.</p>
        <div class="receipt-wrap"><div class="receipt" id="receipt-preview"><div class="head">ESC/POS PREVIEW</div><div class="line" style="text-align:center;color:#777;">No job selected</div></div></div>
        <div class="meta-mini" id="preview-meta"></div>
        <div style="margin-top:12px;"><a id="preview-open-detail" class="btn btn-secondary" href="#" style="display:none; width:100%; text-align:center;">Open full detail</a></div>
    </div>

    <div class="panel">
        <div style="display:flex; justify-content:space-between; align-items:end; gap:16px; margin-bottom:16px; flex-wrap:wrap;">
            <div>
                <h1 style="margin:0;">Job History</h1>
                <p class="muted" style="margin:8px 0 0;">Klik baris job untuk melihat receipt preview di kiri. Live via Reverb dengan polling fallback.</p>
            </div>
            <div class="muted">Total: <span id="jobs-total">{{ $jobs->total() }}</span> <span id="jobs-live-state" style="margin-left:8px;"></span></div>
        </div>

        <form method="GET" action="{{ route('jobs.index') }}" style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; align-items:end;">
            <input type="hidden" name="ui" value="blade">
            <label>Search<input name="q" value="{{ $filters['q'] ?? '' }}" placeholder="external_id, correlation, IP"></label>
            <label>Status
                <select name="status">
                    <option value="">All</option>
                    @foreach(['parsed','partial','parse_error','received'] as $s)
                        <option value="{{ $s }}" @selected(($filters['status'] ?? '') === $s)>{{ $s }}</option>
                    @endforeach
                </select>
            </label>
            <label>Listener
                <select name="listener_id">
                    <option value="">All</option>
                    @foreach($listeners as $l)
                        <option value="{{ $l->id }}" @selected((string)($filters['listener_id'] ?? '') === (string)$l->id)>{{ $l->name }}</option>
                    @endforeach
                </select>
            </label>
            <label>From<input type="date" name="date_from" value="{{ $filters['date_from'] ?? '' }}"></label>
            <label>To<input type="date" name="date_to" value="{{ $filters['date_to'] ?? '' }}"></label>
            <button class="btn" type="submit">Filter</button>
            <a class="btn btn-secondary" href="{{ route('jobs.index', ['ui' => 'blade']) }}">Reset</a>
        </form>

        <div style="overflow:auto;">
            <table>
                <thead><tr><th>ID</th><th>Received</th><th>Listener</th><th>Source</th><th>Size</th><th>Status</th><th>Correlation</th></tr></thead>
                <tbody id="jobs-body">
                @forelse ($jobs as $job)
                    @php $model = $job->render_model_json ?? ['width_dots'=>576,'lines'=>[],'actions'=>[]]; @endphp
                    <tr class="job-row" data-job-id="{{ $job->id }}" data-job='@json([
                        'id' => $job->id,
                        'external_id' => $job->external_id,
                        'status' => $job->status,
                        'listener' => ['name' => $job->listener?->name, 'external_id' => $job->listener?->external_id],
                        'source_ip' => $job->source_ip,
                        'source_port' => $job->source_port,
                        'size_bytes' => $job->size_bytes,
                        'warnings_count' => $job->warnings_count,
                        'correlation_id' => $job->correlation_id,
                        'received_at' => optional($job->received_at)->toIso8601String(),
                        'render_model' => $model,
                    ])'>
                        <td><div style="font-weight:600;color:var(--accent);">#{{ $job->id }}</div><div class="muted">{{ $job->external_id }}</div></td>
                        <td>{{ optional($job->received_at)->toIso8601String() }}</td>
                        <td>{{ $job->listener?->name ?? '-' }}<div class="muted">{{ $job->listener?->external_id }}</div></td>
                        <td>{{ $job->source_ip }}{{ $job->source_port ? ':' . $job->source_port : '' }}</td>
                        <td>{{ number_format($job->size_bytes) }} B</td>
                        <td>
                            @php $class = match($job->status) { 'parsed','ok' => 'badge-ok', 'partial' => 'badge-warn', default => 'badge-err' }; @endphp
                            <span class="badge {{ $class }}">{{ $job->status }}</span>
                            @if($job->warnings_count > 0)<div class="muted">{{ $job->warnings_count }} warning(s)</div>@endif
                        </td>
                        <td class="muted">{{ $job->correlation_id }}</td>
                    </tr>
                @empty
                    <tr id="jobs-empty"><td colspan="7" class="muted">No jobs found.</td></tr>
                @endforelse
                </tbody>
            </table>
        </div>
        <div style="margin-top:12px;">{{ $jobs->links() }}</div>
    </div>
</div>
<script>
(function () {
    const body = document.getElementById('jobs-body');
    const totalEl = document.getElementById('jobs-total');
    const stateEl = document.getElementById('jobs-live-state');
    const receiptEl = document.getElementById('receipt-preview');
    const previewIdEl = document.getElementById('preview-job-id');
    const previewMetaEl = document.getElementById('preview-meta');
    const previewOpenDetail = document.getElementById('preview-open-detail');
    if (!body || !receiptEl) return;
    const params = new URLSearchParams(window.location.search);
    const filters = { q: params.get('q') || '', status: params.get('status') || '', listener_id: params.get('listener_id') || '', date_from: params.get('date_from') || '', date_to: params.get('date_to') || '' };
    const page = parseInt(params.get('page') || '1', 10);
    const canMerge = page === 1;
    let selectedId = null;
    let lastId = Math.max(0, ...Array.from(body.querySelectorAll('tr[data-job-id]')).map(tr => parseInt(tr.dataset.jobId || '0', 10)));
    let polling = null;

    function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    function badgeClass(status) { if (status === 'parsed' || status === 'ok') return 'badge-ok'; if (status === 'partial') return 'badge-warn'; return 'badge-err'; }
    function matches(job) {
        const q = filters.q.toLowerCase().trim();
        if (q) { const hay = `${job.external_id || ''} ${job.correlation_id || ''} ${job.source_ip || ''}`.toLowerCase(); if (!hay.includes(q)) return false; }
        if (filters.status && job.status !== filters.status) return false;
        if (filters.listener_id && String(job.listener_id ?? '') !== String(filters.listener_id)) return false;
        const received = (job.received_at || '').slice(0, 10);
        if (filters.date_from && received < filters.date_from) return false;
        if (filters.date_to && received > filters.date_to) return false;
        return true;
    }
    function setState(text) { if (stateEl) stateEl.textContent = text ? `(${text})` : ''; }
    function parseJob(tr) { try { return JSON.parse(tr.dataset.job || '{}'); } catch (_) { return {}; } }

    function renderRaster(canvas, raster) {
        const w = Number(raster.width_dots || 0), h = Number(raster.height || 0);
        if (!w || !h) return;
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d'); if (!ctx) return;
        const image = ctx.createImageData(w, h);
        const bytes = Uint8Array.from(atob(raster.data_base64 || ''), c => c.charCodeAt(0));
        const rowBytes = Math.ceil(w / 8);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const byteIndex = y * rowBytes + Math.floor(x / 8);
            const bit = 7 - (x % 8);
            const on = (bytes[byteIndex] & (1 << bit)) !== 0;
            const i = (y * w + x) * 4;
            const v = on ? 26 : 247;
            image.data[i]=v; image.data[i+1]=v; image.data[i+2]=v; image.data[i+3]=255;
        }
        ctx.putImageData(image, 0, 0);
    }

    function renderPreview(job) {
        const model = job.render_model || {};
        const lines = Array.isArray(model.lines) ? model.lines : [];
        const actions = Array.isArray(model.actions) ? model.actions : [];
        const width = Number(model.width_dots || 576) <= 384 ? 302 : 384;
        receiptEl.style.width = width + 'px';
        let html = '<div class="head">ESC/POS PREVIEW</div>';
        if (!lines.length) html += '<div class="line" style="text-align:center;color:#777;">(no render lines)</div>';
        for (const line of lines) {
            const align = line.align === 'center' ? 'center' : line.align === 'right' ? 'right' : 'left';
            if (line.kind === 'image' && line.raster) {
                html += `<div style="text-align:${align};margin:8px 0;"><canvas class="raster-canvas" data-raster='${esc(JSON.stringify(line.raster))}'></canvas><div class="muted" style="font-size:10px;color:#6b6b6b;margin-top:2px;">${esc(line.label || '')}</div></div>`;
                continue;
            }
            if (line.kind && line.kind !== 'text') {
                html += `<div class="placeholder" style="text-align:${align};"><span class="kind">${esc(String(line.kind).toUpperCase())}</span>${esc(line.label || `[${line.kind}]`)}</div>`;
                continue;
            }
            const segments = Array.isArray(line.segments) && line.segments.length ? line.segments : [{ text: line.text || '' }];
            const isEmpty = segments.every(s => !s.text);
            html += `<div class="line" style="text-align:${align};">${isEmpty ? '&nbsp;' : segments.map(seg => {
                let style = '';
                if (seg.bold) style += 'font-weight:700;';
                if (seg.underline) style += 'text-decoration:underline;';
                if (Number(seg.width) === 2 || Number(seg.height) === 2) style += 'font-size:1.15em;';
                return `<span style="${style}">${esc(seg.text || '')}</span>`;
            }).join('')}</div>`;
        }
        if (actions.includes('cut')) html += '<div class="cut">CUT</div>';
        receiptEl.innerHTML = html;
        receiptEl.querySelectorAll('canvas.raster-canvas').forEach(c => {
            try { renderRaster(c, JSON.parse(c.dataset.raster || '{}')); } catch (_) {}
        });
        if (previewIdEl) previewIdEl.textContent = `#${job.id}`;
        if (previewMetaEl) previewMetaEl.innerHTML = `
            <div><span>External ID</span><span>${esc(job.external_id || '-')}</span></div>
            <div><span>Status</span><span>${esc(job.status || '-')}</span></div>
            <div><span>Listener</span><span>${esc(job.listener?.name || '-')}</span></div>
            <div><span>Received</span><span>${esc(job.received_at || '-')}</span></div>`;
        if (previewOpenDetail) { previewOpenDetail.href = `/jobs/${job.id}`; previewOpenDetail.style.display = 'block'; }
    }

    function selectRow(tr) {
        if (!tr) return;
        body.querySelectorAll('tr.job-row.selected').forEach(r => r.classList.remove('selected'));
        tr.classList.add('selected');
        selectedId = parseInt(tr.dataset.jobId || '0', 10);
        renderPreview(parseJob(tr));
    }

    body.addEventListener('click', (e) => {
        const tr = e.target.closest('tr.job-row');
        if (tr) selectRow(tr);
    });

    function prependJob(job) {
        if (!canMerge || !matches(job) || body.querySelector(`[data-job-id="${job.id}"]`)) return;
        const empty = document.getElementById('jobs-empty'); if (empty) empty.remove();
        const tr = document.createElement('tr');
        tr.className = 'job-row';
        tr.dataset.jobId = String(job.id);
        tr.dataset.job = JSON.stringify(job);
        const source = job.source_port ? `${job.source_ip}:${job.source_port}` : (job.source_ip || '-');
        const listener = job.listener || {};
        const warnings = job.warnings_count > 0 ? `<div class="muted">${job.warnings_count} warning(s)</div>` : '';
        tr.innerHTML = `
            <td><div style="font-weight:600;color:var(--accent);">#${esc(job.id)}</div><div class="muted">${esc(job.external_id)}</div></td>
            <td>${esc(job.received_at || '-')}</td>
            <td>${esc(listener.name || '-')}<div class="muted">${esc(listener.external_id || '')}</div></td>
            <td>${esc(source)}</td>
            <td>${Number(job.size_bytes || 0).toLocaleString()} B</td>
            <td><span class="badge ${badgeClass(job.status)}">${esc(job.status)}</span>${warnings}</td>
            <td class="muted">${esc(job.correlation_id || '-')}</td>`;
        body.prepend(tr);
        lastId = Math.max(lastId, Number(job.id || 0));
        if (totalEl) totalEl.textContent = String(Number(totalEl.textContent || '0') + 1);
        if (!selectedId) selectRow(tr);
    }

    async function poll() {
        try {
            const qs = new URLSearchParams({ after_id: String(lastId), ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) });
            const res = await fetch('/jobs/feed?' + qs.toString(), { headers: { 'Accept': 'application/json' } });
            if (!res.ok) return;
            const data = await res.json();
            (data.data || []).slice().reverse().forEach(prependJob);
        } catch (_) {}
    }
    function startPolling(label) {
        setState(label || 'polling fallback');
        if (polling) return;
        poll(); polling = setInterval(poll, 5000);
    }

    const firstRow = body.querySelector('tr.job-row');
    if (firstRow) selectRow(firstRow);

    if (window.Echo) {
        try {
            window.Echo.channel('jobs').listen('.job.ingested', (e) => prependJob(e));
            const pusher = window.Echo.connector?.pusher;
            if (pusher?.connection) {
                pusher.connection.bind('connected', () => setState('live'));
                ['unavailable','failed','disconnected'].forEach(ev => pusher.connection.bind(ev, () => startPolling('polling fallback')));
                if (pusher.connection.state === 'connected') setState('live'); else setState('connecting');
                setTimeout(() => { if (stateEl?.textContent?.includes('connecting')) startPolling('polling fallback'); }, 6000);
            } else { setState('live'); }
        } catch (_) { startPolling('polling fallback'); }
    } else { startPolling('polling fallback'); }
})();
</script>
@endcomponent
