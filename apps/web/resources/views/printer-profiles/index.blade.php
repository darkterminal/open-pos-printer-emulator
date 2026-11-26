@component('layouts.app', ['title' => 'Printer Profiles - Open POS Printer Emulator'])
<div style="display:flex; justify-content:space-between; align-items:flex-end; gap:12px; margin-bottom:16px;">
    <div>
        <h1 style="margin:0;">Printer Profiles</h1>
        <p class="muted" style="margin:6px 0 0;">Manage ESC/POS printer profiles used by listeners.</p>
    </div>
</div>

<div class="panel" style="margin-bottom:16px;">
    <h2 style="margin:0 0 12px; font-size:16px;">Add Printer Profile</h2>
    <form method="POST" action="{{ route('printer-profiles.store') }}" style="display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; align-items:end;">
        @csrf
        <label>Name<input name="name" required></label>
        <label>Printer model<input name="printer_model" placeholder="generic-escpos"></label>
        <label>Paper (mm)<input name="paper_width_mm" type="number" value="80" required></label>
        <label>DPI<input name="dpi" type="number" value="203" required></label>
        <label>Chars/line<input name="chars_per_line" type="number" value="48" required></label>
        <label>Code page<input name="code_page" value="CP437" required></label>
        <label>Max image dots<input name="image_max_width_dots" type="number" value="576" required></label>
        <label>Max image bytes<input name="image_max_bytes" type="number" value="1048576" required></label>
        <button class="btn" type="submit">Create profile</button>
    </form>
</div>

<div class="panel" style="overflow:auto;">
    <table>
        <thead><tr><th>Name</th><th>Paper/DPI</th><th>Chars</th><th>Code page</th><th>Image</th><th>Listeners</th><th>Actions</th></tr></thead>
        <tbody>
        @forelse ($profiles as $profile)
            <tr>
                <td>
                    <div style="font-weight:600;">{{ $profile->name }}</div>
                    <div class="muted">{{ $profile->printer_model ?? '-' }}</div>
                    @if($profile->is_builtin)<div class="muted">builtin</div>@endif
                </td>
                <td>{{ $profile->paper_width_mm }}mm / {{ $profile->dpi }}dpi</td>
                <td>{{ $profile->chars_per_line }}</td>
                <td>{{ $profile->code_page }}</td>
                <td>{{ $profile->image_max_width_dots }} dots / {{ $profile->image_max_bytes }} B</td>
                <td>{{ $profile->listeners_count }}</td>
                <td>
                    @if($profile->is_builtin)
                        <span class="muted">read-only</span>
                    @else
                        <details style="margin-bottom:8px;">
                            <summary style="cursor:pointer;">Edit</summary>
                            <form method="POST" action="{{ route('printer-profiles.update', $profile) }}" style="display:grid; gap:8px; margin-top:8px; min-width:260px;">
                                @csrf @method('PATCH')
                                <input name="name" value="{{ $profile->name }}" required>
                                <input name="printer_model" value="{{ $profile->printer_model }}">
                                <input name="paper_width_mm" type="number" value="{{ $profile->paper_width_mm }}" required>
                                <input name="dpi" type="number" value="{{ $profile->dpi }}" required>
                                <input name="chars_per_line" type="number" value="{{ $profile->chars_per_line }}" required>
                                <input name="code_page" value="{{ $profile->code_page }}" required>
                                <input name="image_max_width_dots" type="number" value="{{ $profile->image_max_width_dots }}" required>
                                <input name="image_max_bytes" type="number" value="{{ $profile->image_max_bytes }}" required>
                                <button class="btn" type="submit">Save</button>
                            </form>
                        </details>
                        <form method="POST" action="{{ route('printer-profiles.destroy', $profile) }}" onsubmit="return confirm('Delete {{ addslashes($profile->name) }}?')">
                            @csrf @method('DELETE')
                            <button class="btn btn-danger" type="submit">Delete</button>
                        </form>
                    @endif
                </td>
            </tr>
        @empty
            <tr><td colspan="7" class="muted">No printer profiles.</td></tr>
        @endforelse
        </tbody>
    </table>
</div>
@endcomponent
