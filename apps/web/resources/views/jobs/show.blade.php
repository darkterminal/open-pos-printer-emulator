@component('layouts.app', ['title' => 'Job #' . $job->id . ' - Open POS Printer Emulator'])
<style>
    .detail-grid { display:grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); gap:16px; align-items:start; }
    @media (max-width: 960px) { .detail-grid { grid-template-columns: 1fr; } }
    .meta-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; }
    .meta-item { background:#0f1620; border:1px solid var(--border); border-radius:8px; padding:10px 12px; }
    .meta-item .k { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.06em; }
    .meta-item .v { margin-top:4px; font-size:14px; word-break:break-all; }
    .receipt-wrap { background:#0a0e13; border:1px solid var(--border); border-radius:12px; padding:20px; display:flex; justify-content:center; }
    .receipt { width: 302px; background:#f7f4ec; color:#1a1a1a; font-family: "Courier New", ui-monospace, monospace; font-size:13px; line-height:1.45; padding:18px 16px 24px; border-radius:4px; box-shadow: 0 12px 40px rgba(0,0,0,.45); }
    .receipt .line { min-height: 1.45em; white-space: pre-wrap; word-break: break-word; }
    .receipt .line.empty { min-height: 1.45em; }
    .receipt .cut { border-top: 2px dashed #9a9a9a; margin-top: 14px; padding-top: 6px; text-align:center; font-size:10px; letter-spacing:.3em; color:#7a7a7a; }
    .receipt .placeholder { border:1px dashed #8d8a80; border-radius:3px; padding:8px 6px; font-size:11px; color:#4a4a4a; background:repeating-linear-gradient(45deg,#efece3,#efece3 6px,#e7e3d8 6px,#e7e3d8 12px); word-break:break-word; }
    .receipt .placeholder .kind { display:block; font-weight:700; letter-spacing:.2em; font-size:9px; color:#3d3d3d; margin-bottom:2px; }
    .receipt .head { text-align:center; font-weight:700; letter-spacing:.18em; font-size:11px; color:#555; margin-bottom:10px; }
    .cmd-table td { font-family: ui-monospace, monospace; font-size:12px; }
    .cmd-hex { color:#8fa3b8; white-space:nowrap; }
    .cmd-args { color:#9ecbff; word-break:break-all; }
    .warn-list { margin:0; padding-left:18px; }
    .warn-list li { margin:4px 0; color:#ffd166; }
    details.raw summary { cursor:pointer; color:var(--accent); font-size:14px; }
    pre.raw-pre { background:#0f1620; border:1px solid var(--border); border-radius:8px; padding:12px; overflow:auto; max-height:260px; font-size:12px; color:#c8d3de; }
    .section-title { margin:0 0 12px; font-size:16px; }
</style>
<div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
    <div>
        <a href="{{ route('jobs.index') }}" class="muted">&larr; Back to job history</a>
        <h1 style="margin:6px 0 0;">Job #{{ $job->id }}</h1>
        <div class="muted" style="margin-top:4px;">{{ $job->external_id }}</div>
    </div>
    <div style="display:flex; gap:8px; align-items:center;">
        @php
            $class = match($job->status) {
                'parsed', 'ok' => 'badge-ok',
                'partial' => 'badge-warn',
                default => 'badge-err',
            };
        @endphp
        <span class="badge {{ $class }}">{{ $job->status }}</span>
        <span class="muted">{{ number_format($job->size_bytes) }} B</span>
    </div>
</div>

<div class="detail-grid">
    <div class="panel">
        <h2 class="section-title">Receipt Preview</h2>
        @php
            $model = $job->render_model_json ?? [];
            $lines = $model['lines'] ?? [];
            $actions = $model['actions'] ?? [];
        @endphp
        <div class="receipt-wrap">
            <div class="receipt">
                <div class="head">ESC/POS PREVIEW</div>
                @forelse ($lines as $line)
                    @php
                        $text = (string) ($line['text'] ?? '');
                        $align = $line['align'] ?? 'left';
                        $kind = $line['kind'] ?? 'text';
                        $segments = $line['segments'] ?? [];
                        $style = 'text-align:' . $align . ';';
                        if (!empty($line['bold'])) $style .= 'font-weight:700;';
                        if (!empty($line['underline'])) $style .= 'text-decoration:underline;';
                        $width = (int) ($line['width'] ?? 1);
                        $height = (int) ($line['height'] ?? 1);
                        if ($width > 1) $style .= 'font-size:' . (13 * $width) . 'px;';
                        if ($height > 1) $style .= 'line-height:' . (1.45 * $height) . ';';
                    @endphp
                    @if ($kind !== 'text')
                        <div class="placeholder" style="text-align: {{ $align }};">
                            <span class="kind">{{ strtoupper($kind) }}</span>
                            {{ $line['label'] ?? $text }}
                            @if (!empty($line['raster']['data_base64']))
                                <canvas
                                    class="raster-preview"
                                    data-raster-b64="{{ $line['raster']['data_base64'] }}"
                                    data-raster-width="{{ (int) ($line['raster']['width_dots'] ?? 0) }}"
                                    data-raster-height="{{ (int) ($line['raster']['height'] ?? 0) }}"
                                    style="display:block; margin-top:8px; width:100%; max-width:100%; height:auto; image-rendering:pixelated; background:#fff; border:1px solid #cfcabf;"
                                ></canvas>
                                <div class="muted" style="margin-top:4px; font-size:10px; color:#6b6b6b;">{{ (int) ($line['raster']['width_dots'] ?? 0) }}x{{ (int) ($line['raster']['height'] ?? 0) }} dots</div>
                            @endif
                        </div>
                    @elseif (!empty($segments))
                        <div class="line" style="text-align: {{ $align }};">@foreach ($segments as $segment)@php $sStyle = ''; if (!empty($segment['bold'])) $sStyle .= 'font-weight:700;'; if (!empty($segment['underline'])) $sStyle .= 'text-decoration:underline;'; $sw = (int) ($segment['width'] ?? 1); $sh = (int) ($segment['height'] ?? 1); if ($sw > 1) $sStyle .= 'font-size:' . (13 * $sw) . 'px;'; if ($sh > 1) $sStyle .= 'line-height:' . (1.45 * $sh) . ';'; @endphp<span style="{{ $sStyle }}">{{ $segment['text'] }}</span>@endforeach</div>
                    @else
                        <div class="line {{ $text === '' ? 'empty' : '' }}" style="{{ $style }}">{{ $text === '' ? "\u{00A0}" : $text }}</div>
                    @endif
                @empty
                    <div class="line empty">&nbsp;</div>
                    <div class="line" style="text-align:center;color:#777;">No renderable text</div>
                @endforelse
                @if (in_array('cut', $actions, true))
                    <div class="cut">CUT</div>
                @endif
            </div>
        </div>
        <div class="muted" style="margin-top:12px; font-size:12px;">
            Width: {{ $model['width_dots'] ?? 576 }} dots &middot;
            Lines: {{ count($lines) }} &middot;
            Actions: {{ empty($actions) ? 'none' : implode(', ', $actions) }}
        </div>
    </div>

    <div class="grid">
        <div class="panel">
            <h2 class="section-title">Metadata</h2>
            <div class="meta-grid">
                <div class="meta-item"><div class="k">Listener</div><div class="v">{{ $job->listener?->name ?? '-' }}<br><span class="muted">{{ $job->listener?->external_id }}</span></div></div>
                <div class="meta-item"><div class="k">Source</div><div class="v">{{ $job->source_ip }}{{ $job->source_port ? ':' . $job->source_port : '' }}</div></div>
                <div class="meta-item"><div class="k">Received</div><div class="v">{{ optional($job->received_at)->toIso8601String() }}</div></div>
                <div class="meta-item"><div class="k">Completed</div><div class="v">{{ optional($job->completed_at)->toIso8601String() ?? '-' }}</div></div>
                <div class="meta-item"><div class="k">Correlation ID</div><div class="v">{{ $job->correlation_id }}</div></div>
                <div class="meta-item"><div class="k">SHA-256</div><div class="v">{{ $job->checksum_sha256 ?? '-' }}</div></div>
            </div>
            @if ($job->error_message)
                <div class="error" style="margin-top:12px;">{{ $job->error_message }}</div>
            @endif
        </div>

        <div class="panel">
            <h2 class="section-title">Warnings ({{ $job->warnings_count }})</h2>
            @php
                $warnings = $job->warnings_json ?? [];
            @endphp
            @if (empty($warnings))
                <p class="muted" style="margin:0;">No warnings reported.</p>
            @else
                <ul class="warn-list">
                    @foreach ($warnings as $warning)
                        <li>{{ $warning }}</li>
                    @endforeach
                </ul>
            @endif
        </div>
    </div>
</div>

<div class="panel" style="margin-top:16px;">
    <h2 class="section-title">Command Inspector ({{ count($job->commands_json ?? []) }})</h2>
    @php
        $commands = $job->commands_json ?? [];
    @endphp
    @if (empty($commands))
        <p class="muted" style="margin:0;">No parsed commands recorded for this job.</p>
    @else
        <div style="overflow:auto; max-height:420px;">
            <table class="cmd-table">
                <thead>
                <tr>
                    <th>#</th>
                    <th>Offset</th>
                    <th>Hex</th>
                    <th>Command</th>
                    <th>Args</th>
                </tr>
                </thead>
                <tbody>
                @foreach ($commands as $i => $command)
                    <tr>
                        <td>{{ $i + 1 }}</td>
                        <td>{{ $command['offset'] ?? '-' }}</td>
                        <td class="cmd-hex">{{ $command['hex'] ?? '-' }}</td>
                        <td>{{ $command['name'] ?? 'UNKNOWN' }}</td>
                        <td class="cmd-args">{{ isset($command['args']) ? json_encode($command['args']) : '-' }}</td>
                    </tr>
                @endforeach
                </tbody>
            </table>
        </div>
    @endif
</div>

<div class="panel" style="margin-top:16px;">
    <h2 class="section-title">Raw Data Viewer</h2>
    @php
        $rawBase64 = $job->rawPayload?->content_base64;
        $bytes = $rawBase64 ? base64_decode($rawBase64, true) : null;
        $maxBytes = 65536;
        $slice = is_string($bytes) ? substr($bytes, 0, $maxBytes) : '';
        $lines = [];
        $len = strlen($slice);
        for ($offset = 0; $offset < $len; $offset += 16) {
            $chunk = substr($slice, $offset, 16);
            $hexParts = [];
            $ascii = '';
            $chunkLen = strlen($chunk);
            for ($i = 0; $i < 16; $i++) {
                if ($i < $chunkLen) {
                    $byte = ord($chunk[$i]);
                    $hexParts[] = sprintf('%02X', $byte);
                    $ascii .= ($byte >= 32 && $byte <= 126) ? $chunk[$i] : '.';
                } else {
                    $hexParts[] = '  ';
                    $ascii .= ' ';
                }
                if ($i === 7) $hexParts[] = '';
            }
            $lines[] = sprintf('%08X  %s  |%s|', $offset, implode(' ', $hexParts), $ascii);
        }
        if (is_string($bytes) && strlen($bytes) > $maxBytes) {
            $lines[] = sprintf('... truncated, showing first %d bytes of %d ...', $maxBytes, strlen($bytes));
        }
    @endphp
    @if ($rawBase64)
        <div class="muted" style="margin-bottom:8px; font-size:12px;">SHA-256: {{ $job->rawPayload?->content_sha256 ?? $job->checksum_sha256 ?? '-' }}</div>
        <div style="margin-bottom:12px;">
            <div class="muted" style="font-size:12px; margin-bottom:6px;">Hex + ASCII</div>
            <pre class="raw-pre" style="max-height:360px; white-space:pre; overflow:auto;">{{ implode("\n", $lines) }}</pre>
        </div>
        <details class="raw">
            <summary>Raw payload (base64)</summary>
            <pre class="raw-pre">{{ $rawBase64 }}</pre>
        </details>
    @else
        <p class="muted" style="margin:0;">Raw payload record is missing for this job.</p>
    @endif
</div>
<script>
(() => {
    const canvases = document.querySelectorAll('canvas.raster-preview');
    canvases.forEach((canvas) => {
        const b64 = canvas.dataset.rasterB64 || '';
        const width = parseInt(canvas.dataset.rasterWidth || '0', 10);
        const height = parseInt(canvas.dataset.rasterHeight || '0', 10);
        if (!b64 || !width || !height) return;

        const raw = atob(b64);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const image = ctx.createImageData(width, height);
        const rowBytes = Math.ceil(width / 8);

        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                const byteIndex = y * rowBytes + Math.floor(x / 8);
                const bit = (bytes[byteIndex] >> (7 - (x % 8))) & 1;
                const pixel = (y * width + x) * 4;
                const color = bit ? 0 : 255;
                image.data[pixel] = color;
                image.data[pixel + 1] = color;
                image.data[pixel + 2] = color;
                image.data[pixel + 3] = 255;
            }
        }
        ctx.putImageData(image, 0, 0);
    });
})();
</script>
@endcomponent
