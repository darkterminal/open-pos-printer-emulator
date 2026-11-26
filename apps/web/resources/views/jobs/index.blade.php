@component('layouts.app', ['title' => 'Jobs - Open POS Printer Emulator'])
<div class="panel">
    <div style="display:flex; justify-content:space-between; align-items:end; gap:16px; margin-bottom:16px; flex-wrap:wrap;">
        <div>
            <h1 style="margin:0;">Job History</h1>
            <p class="muted" style="margin:8px 0 0;">Recent ESC/POS jobs ingested by the sidecar. Auto-refreshes on new jobs (Reverb) with polling fallback.</p>
        </div>
        <div class="muted">Total: {{ $jobs->total() }}</div>
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
@endcomponent
