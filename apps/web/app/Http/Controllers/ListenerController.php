<?php

namespace App\Http\Controllers;

use App\Models\Listener;
use App\Models\PrinterProfile;
use App\Services\SidecarClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\View\View;
use Inertia\Inertia;
use Inertia\Response;

class ListenerController extends Controller
{
    public function index(Request $request, SidecarClient $sidecar): View|Response
    {
        $listeners = Listener::query()
            ->with('printerProfile:id,name')
            ->withCount('printJobs')
            ->latest('id')
            ->get();

        $sidecarById = [];
        try {
            foreach ($sidecar->listeners() as $item) {
                $externalId = (string) ($item['external_id'] ?? '');
                if ($externalId !== '') {
                    $sidecarById[$externalId] = $item;
                }
            }
        } catch (\Throwable $e) {
            report($e);
        }

        $profiles = PrinterProfile::query()->orderBy('name')->get(['id', 'name']);

        if (strtolower((string) $request->query('ui', '')) === 'inertia') {
            return Inertia::render('Listeners/Index', [
                'profiles' => $profiles,
                'listeners' => $listeners->map(fn (Listener $listener) => [
                    'id' => $listener->id,
                    'external_id' => $listener->external_id,
                    'name' => $listener->name,
                    'host' => $listener->host,
                    'port' => $listener->port,
                    'printer_profile_id' => $listener->printer_profile_id,
                    'status' => $listener->status,
                    'last_error' => $listener->last_error,
                    'last_heartbeat_at' => optional($listener->last_heartbeat_at)->toIso8601String(),
                    'print_jobs_count' => $listener->print_jobs_count,
                    'printer_profile' => $listener->printerProfile?->only(['id', 'name']),
                    'sidecar' => $sidecarById[$listener->external_id] ?? null,
                    'fault_config' => $sidecarById[$listener->external_id]['fault_config'] ?? ($listener->fault_config_json ?? []),
                ])->values(),
            ]);
        }

        return view('listeners.index', [
            'listeners' => $listeners,
            'sidecarById' => $sidecarById,
            'profiles' => $profiles,
        ]);
    }

    public function store(Request $request, SidecarClient $sidecar): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'host' => ['required', 'string', 'max:255'],
            'port' => ['required', 'integer', 'between:1,65535', Rule::unique('listeners', 'port')->where(fn ($q) => $q->where('host', $request->input('host')))],
            'printer_profile_id' => ['nullable', 'integer', 'exists:printer_profiles,id'],
        ]);

        $externalId = 'lst_'.Str::lower(Str::ulid()->toBase32());
        $listener = Listener::query()->create([
            'external_id' => $externalId,
            'user_id' => $request->user()->id,
            'name' => $validated['name'],
            'host' => $validated['host'],
            'port' => (int) $validated['port'],
            'printer_profile_id' => $validated['printer_profile_id'] ?? null,
            'status' => 'starting',
            'fault_config_json' => [
                'paper_out' => false,
                'cover_open' => false,
                'cutter_error' => false,
                'offline' => false,
            ],
        ]);

        try {
            $info = $sidecar->ensureListener($listener->external_id, $listener->host, (int) $listener->port);
            $listener->forceFill([
                'status' => $info['status'] ?? 'listening',
                'last_error' => $info['last_error'] ?? null,
                'fault_config_json' => $info['fault_config'] ?? $listener->fault_config_json,
                'last_heartbeat_at' => now(),
            ])->save();
        } catch (\Throwable $e) {
            report($e);
            $listener->forceFill(['status' => 'error', 'last_error' => $e->getMessage()])->save();

            return back()->withErrors(['sidecar' => 'Listener created but sidecar failed to start: '.$e->getMessage()]);
        }

        return back()->with('status', "Listener {$listener->name} created.");
    }

    public function destroy(Listener $listener, SidecarClient $sidecar): RedirectResponse
    {
        try {
            $sidecar->stopListener($listener->external_id);
        } catch (\Throwable $e) {
            report($e);
            // continue with DB delete; sidecar may already be gone
        }

        $name = $listener->name;
        $listener->delete();

        return back()->with('status', "Listener {$name} removed.");
    }

    public function update(Request $request, Listener $listener, SidecarClient $sidecar): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'host' => ['required', 'string', 'max:255'],
            'port' => [
                'required',
                'integer',
                'between:1,65535',
                Rule::unique('listeners', 'port')
                    ->where(fn ($q) => $q->where('host', $request->input('host')))
                    ->ignore($listener->id),
            ],
            'printer_profile_id' => ['nullable', 'integer', 'exists:printer_profiles,id'],
        ]);

        $oldHost = $listener->host;
        $oldPort = (int) $listener->port;
        $newHost = $validated['host'];
        $newPort = (int) $validated['port'];

        $listener->fill([
            'name' => $validated['name'],
            'host' => $newHost,
            'port' => $newPort,
            'printer_profile_id' => $validated['printer_profile_id'] ?? null,
        ])->save();

        $needsRestart = $oldHost !== $newHost || $oldPort !== $newPort;
        try {
            if ($needsRestart) {
                // ensureListener will stop existing and restart on new bind.
                $info = $sidecar->ensureListener($listener->external_id, $newHost, $newPort);
            } else {
                $info = null;
            }

            $listener->forceFill([
                'status' => $info['status'] ?? $listener->status,
                'last_error' => $info['last_error'] ?? null,
                'fault_config_json' => $info['fault_config'] ?? $listener->fault_config_json,
                'last_heartbeat_at' => $needsRestart ? now() : $listener->last_heartbeat_at,
            ])->save();
        } catch (\Throwable $e) {
            report($e);
            $listener->forceFill(['status' => 'error', 'last_error' => $e->getMessage()])->save();

            return back()->withErrors(['sidecar' => 'Listener updated but sidecar failed to restart: '.$e->getMessage()]);
        }

        return back()->with('status', "Listener {$listener->name} updated.");
    }

    public function sync(SidecarClient $sidecar): RedirectResponse
    {
        $listeners = Listener::query()->get();
        $ok = 0;

        foreach ($listeners as $listener) {
            try {
                $info = $sidecar->ensureListener($listener->external_id, $listener->host, (int) $listener->port);
                $listener->forceFill([
                    'status' => $info['status'] ?? $listener->status,
                    'last_error' => $info['last_error'] ?? null,
                    'fault_config_json' => $info['fault_config'] ?? $listener->fault_config_json,
                    'last_heartbeat_at' => now(),
                ])->save();
                $ok++;
            } catch (\Throwable $e) {
                report($e);
                $listener->forceFill(['status' => 'error', 'last_error' => $e->getMessage()])->save();
            }
        }

        return back()->with('status', "Synced {$ok}/{$listeners->count()} listeners from sidecar.");
    }

    public function updateFaults(Request $request, Listener $listener, SidecarClient $sidecar): RedirectResponse
    {
        $validated = $request->validate([
            'paper_out' => ['nullable', 'boolean'],
            'cover_open' => ['nullable', 'boolean'],
            'cutter_error' => ['nullable', 'boolean'],
            'offline' => ['nullable', 'boolean'],
        ]);

        $faults = [
            'paper_out' => (bool) ($validated['paper_out'] ?? false),
            'cover_open' => (bool) ($validated['cover_open'] ?? false),
            'cutter_error' => (bool) ($validated['cutter_error'] ?? false),
            'offline' => (bool) ($validated['offline'] ?? false),
        ];

        try {
            $sidecar->updateFaults($listener->external_id, $faults);
            $listener->forceFill([
                'fault_config_json' => $faults,
                'last_error' => null,
            ])->save();

            return back()->with('status', "Fault config updated for {$listener->name}.");
        } catch (\Throwable $e) {
            report($e);
            $listener->forceFill(['last_error' => $e->getMessage()])->save();

            return back()->withErrors(['sidecar' => 'Failed to update sidecar faults: '.$e->getMessage()]);
        }
    }
}
