<?php

namespace App\Http\Controllers;

use App\Models\PrinterProfile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\View\View;
use Inertia\Inertia;
use Inertia\Response;

class PrinterProfileController extends Controller
{
    public function index(Request $request): View|Response
    {
        $profiles = PrinterProfile::query()
            ->where(function ($q) use ($request) {
                $q->where('is_builtin', true)->orWhere('user_id', $request->user()->id);
            })
            ->withCount(['listeners' => fn ($q) => $q->where('user_id', $request->user()->id)])
            ->orderByDesc('is_builtin')
            ->orderBy('name')
            ->get();

        if (strtolower((string) $request->query('ui', '')) === 'blade') {
            return view('printer-profiles.index', ['profiles' => $profiles]);
        }

        return Inertia::render('PrinterProfiles/Index', [
            'profiles' => $profiles->map(fn (PrinterProfile $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'is_builtin' => (bool) $p->is_builtin,
                'printer_model' => $p->printer_model,
                'paper_width_mm' => $p->paper_width_mm,
                'dpi' => $p->dpi,
                'chars_per_line' => $p->chars_per_line,
                'code_page' => $p->code_page,
                'image_max_width_dots' => $p->image_max_width_dots,
                'image_max_bytes' => $p->image_max_bytes,
                'listeners_count' => $p->listeners_count,
            ])->values(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validated($request);
        $validated['user_id'] = $request->user()?->id;
        $validated['is_builtin'] = false;
        PrinterProfile::query()->create($validated);

        return back()->with('status', 'Printer profile created.');
    }

    public function update(Request $request, PrinterProfile $printerProfile): RedirectResponse
    {
        if ($printerProfile->is_builtin) {
            return back()->withErrors(['profile' => 'Built-in profiles cannot be edited.']);
        }
        abort_unless($printerProfile->user_id === $request->user()->id, 403);

        $validated = $this->validated($request, $printerProfile);
        $printerProfile->update($validated);

        return back()->with('status', 'Printer profile updated.');
    }

    public function destroy(Request $request, PrinterProfile $printerProfile): RedirectResponse
    {
        if ($printerProfile->is_builtin) {
            return back()->withErrors(['profile' => 'Built-in profiles cannot be deleted.']);
        }
        abort_unless($printerProfile->user_id === $request->user()->id, 403);
        if ($printerProfile->listeners()->exists()) {
            return back()->withErrors(['profile' => 'Profile is used by listeners. Reassign listeners before deleting.']);
        }

        $printerProfile->delete();

        return back()->with('status', 'Printer profile deleted.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?PrinterProfile $profile = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:120', Rule::unique('printer_profiles', 'name')->ignore($profile?->id)],
            'printer_model' => ['nullable', 'string', 'max:120'],
            'paper_width_mm' => ['required', 'integer', 'in:58,80'],
            'dpi' => ['required', 'integer', 'min:100', 'max:600'],
            'chars_per_line' => ['required', 'integer', 'min:24', 'max:80'],
            'code_page' => ['required', 'string', 'max:32'],
            'image_max_width_dots' => ['required', 'integer', 'min:128', 'max:1024'],
            'image_max_bytes' => ['required', 'integer', 'min:1024', 'max:8388608'],
        ]);
    }
}
