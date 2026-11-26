@component('layouts.app', ['title' => 'Jobs - Open POS Printer Emulator'])
<div class="panel">
    <div style="display:flex; justify-content:space-between; align-items:end; gap:16px; margin-bottom:16px;">
        <div>
            <h1 style="margin:0;">Job History</h1>
            <p class="muted" style="margin:8px 0 0;">Recent ESC/POS jobs ingested by the sidecar. Refresh to see new jobs in Sprint 1.</p>
        </div>
        <div class="muted">Total shown: {{ $jobs->count() }}</div>
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
            <tbody>
            @forelse ($jobs as $job)
                <tr>
                    <td>#{{ $job->id }}<div class="muted">{{ $job->external_id }}</div></td>
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
                <tr>
                    <td colspan="7" class="muted">No jobs yet. Send an ESC/POS payload to TCP port 9100.</td>
                </tr>
            @endforelse
            </tbody>
        </table>
    </div>
</div>
@endcomponent
