@component('layouts.app', ['title' => 'Jobs - Open POS Printer Emulator'])
<div class="panel">
    <div style="display:flex; justify-content:space-between; align-items:end; gap:16px; margin-bottom:16px; flex-wrap:wrap;">
        <div>
            <h1 style="margin:0;">Job History</h1>
            <p class="muted" style="margin:8px 0 0;">Recent ESC/POS jobs ingested by the sidecar. Auto-refreshes on new jobs (Reverb) with polling fallback.</p>
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
                <tr data-job-id="{{ $job->id }}">
                    <td><a href="{{ route('jobs.show', $job) }}">#{{ $job->id }}</a><div class="muted">{{ $job->external_id }}</div></td>
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
<script>
(function () {
    const body = document.getElementById('jobs-body');
    const totalEl = document.getElementById('jobs-total');
    const stateEl = document.getElementById('jobs-live-state');
    if (!body) return;
    const params = new URLSearchParams(window.location.search);
    const filters = {
        q: params.get('q') || '',
        status: params.get('status') || '',
        listener_id: params.get('listener_id') || '',
        date_from: params.get('date_from') || '',
        date_to: params.get('date_to') || '',
    };
    const page = parseInt(params.get('page') || '1', 10);
    const canMerge = page === 1;
    let lastId = Math.max(0, ...Array.from(body.querySelectorAll('tr[data-job-id]')).map(tr => parseInt(tr.dataset.jobId || '0', 10)));
    let polling = null;

    function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    function badgeClass(status) { if (status === 'parsed' || status === 'ok') return 'badge-ok'; if (status === 'partial') return 'badge-warn'; return 'badge-err'; }
    function matches(job) {
        const q = filters.q.toLowerCase().trim();
        if (q) {
            const hay = `${job.external_id || ''} ${job.correlation_id || ''} ${job.source_ip || ''}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        if (filters.status && job.status !== filters.status) return false;
        if (filters.listener_id && String(job.listener_id ?? '') !== String(filters.listener_id)) return false;
        const received = (job.received_at || '').slice(0, 10);
        if (filters.date_from && received < filters.date_from) return false;
        if (filters.date_to && received > filters.date_to) return false;
        return true;
    }
    function setState(text) { if (stateEl) stateEl.textContent = text ? `(${text})` : ''; }
    function prependJob(job) {
        if (!canMerge || !matches(job) || body.querySelector(`[data-job-id="${job.id}"]`)) return;
        const empty = document.getElementById('jobs-empty'); if (empty) empty.remove();
        const tr = document.createElement('tr');
        tr.dataset.jobId = String(job.id);
        const source = job.source_port ? `${job.source_ip}:${job.source_port}` : (job.source_ip || '-');
        const listener = job.listener || {};
        const warnings = job.warnings_count > 0 ? `<div class="muted">${job.warnings_count} warning(s)</div>` : '';
        tr.innerHTML = `
            <td><a href="/jobs/${esc(job.id)}">#${esc(job.id)}</a><div class="muted">${esc(job.external_id)}</div></td>
            <td>${esc(job.received_at || '-')}</td>
            <td>${esc(listener.name || '-')}<div class="muted">${esc(listener.external_id || '')}</div></td>
            <td>${esc(source)}</td>
            <td>${Number(job.size_bytes || 0).toLocaleString()} B</td>
            <td><span class="badge ${badgeClass(job.status)}">${esc(job.status)}</span>${warnings}</td>
            <td class="muted">${esc(job.correlation_id || '-')}</td>`;
        body.prepend(tr);
        lastId = Math.max(lastId, Number(job.id || 0));
        if (totalEl) totalEl.textContent = String(Number(totalEl.textContent || '0') + 1);
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

    if (window.Echo) {
        try {
            window.Echo.channel('jobs').listen('.job.ingested', (e) => prependJob(e));
            const pusher = window.Echo.connector?.pusher;
            if (pusher?.connection) {
                pusher.connection.bind('connected', () => setState('live'));
                ['unavailable','failed','disconnected'].forEach(ev => pusher.connection.bind(ev, () => startPolling('polling fallback')));
                if (pusher.connection.state === 'connected') setState('live'); else setState('connecting');
                setTimeout(() => { if (stateEl?.textContent?.includes('connecting')) startPolling('polling fallback'); }, 6000);
            } else {
                setState('live');
            }
        } catch (_) { startPolling('polling fallback'); }
    } else {
        startPolling('polling fallback');
    }
})();
</script>
@endcomponent
