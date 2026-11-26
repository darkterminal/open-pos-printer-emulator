@component('layouts.app', ['title' => 'Jobs - Open POS Printer Emulator'])
<div class="panel">
    <div style="display:flex; justify-content:space-between; align-items:end; gap:16px; margin-bottom:16px;">
        <div>
            <h1 style="margin:0;">Job History</h1>
            <p class="muted" style="margin:8px 0 0;">Recent ESC/POS jobs ingested by the sidecar. This page auto-refreshes on new jobs (Reverb) with polling fallback.</p>
        </div>
        <div class="muted">Total shown: <span id="jobs-count">{{ $jobs->count() }}</span></div>
    </div>

    <div style="overflow:auto;">
        <table>
            <thead>
            <tr>
                <th>ID</th>
                <th>Received</th>
                <th>Listener</th>
                <th>Source</th>
                <th>Size</th>
                <th>Status</th>
                <th>Correlation</th>
            </tr>
            </thead>
            <tbody id="jobs-body">
            @forelse ($jobs as $job)
                <tr data-job-id="{{ $job->id }}">
                    <td><a href="{{ route('jobs.show', $job) }}">#{{ $job->id }}</a><div class="muted">{{ $job->external_id }}</div></td>
                    <td>{{ optional($job->received_at)->toIso8601String() }}</td>
                    <td>{{ $job->listener?->name ?? '-' }}<div class="muted">{{ $job->listener?->external_id }}</div></td>
                    <td>{{ $job->source_ip }}{{ $job->source_port ? ':' . $job->source_port : '' }}</td>
                    <td>{{ number_format($job->size_bytes) }} B</td>
                    <td>
                        @php
                            $class = match($job->status) {
                                'parsed', 'ok' => 'badge-ok',
                                'partial' => 'badge-warn',
                                default => 'badge-err',
                            };
                        @endphp
                        <span class="badge {{ $class }}">{{ $job->status }}</span>
                        @if($job->warnings_count > 0)
                            <div class="muted">{{ $job->warnings_count }} warning(s)</div>
                        @endif
                    </td>
                    <td class="muted">{{ $job->correlation_id }}</td>
                </tr>
            @empty
                <tr id="jobs-empty">
                    <td colspan="7" class="muted">No jobs yet. Send an ESC/POS payload to TCP port 9100.</td>
                </tr>
            @endforelse
            </tbody>
        </table>
    </div>
</div>
<script>
(function () {
    const body = document.getElementById('jobs-body');
    const count = document.getElementById('jobs-count');
    if (!body) return;

    function badgeClass(status) {
        if (status === 'parsed' || status === 'ok') return 'badge-ok';
        if (status === 'partial') return 'badge-warn';
        return 'badge-err';
    }

    function esc(value) {
        return String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    function prependJob(job) {
        const empty = document.getElementById('jobs-empty');
        if (empty) empty.remove();
        if (body.querySelector(`[data-job-id="${job.id}"]`)) return;
        const tr = document.createElement('tr');
        tr.dataset.jobId = job.id;
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
            <td class="muted">${esc(job.correlation_id || '-')}</td>
        `;
        body.prepend(tr);
        if (count) count.textContent = String(body.querySelectorAll('tr[data-job-id]').length);
    }

    if (window.Echo) {
        window.Echo.channel('jobs').listen('.job.ingested', (e) => prependJob(e));
    }

    setInterval(async () => {
        try {
            const res = await fetch('/jobs/feed', {headers: {'Accept': 'application/json'}});
            if (!res.ok) return;
            const data = await res.json();
            (data.data || []).slice().reverse().forEach(prependJob);
        } catch (_) {}
    }, 5000);
})();
</script>
@endcomponent
