<?php

namespace App\Http\Controllers;

use App\Models\Listener;
use App\Services\SidecarClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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

        if ($request->boolean('ui') === true && $request->query('ui') === 'inertia') {
            return Inertia::render('Listeners/Index', [
                'listeners' => $listeners->map(fn (Listener $listener) => [
                    'id' => $listener->id,
                    'external_id' => $listener->external_id,
                    'name' => $listener->name,
                    'host' => $listener->host,
                    'port' => $listener->port,
                    'status' => $listener->status,
                    'last_error' => $listener->last_error,
                    'last_heartbeat_at' => optional($listener->last_heartbeat_at)->toIso8601String(),
                    'print_jobs_count' => $listener->print_jobs_count,
                    'printer_profile' => $listener->printerProfile?->only(['name']),
                    'sidecar' => $sidecarById[$listener->external_id] ?? null,
                    'fault_config' => $sidecarById[$listener->external_id]['fault_config'] ?? ($listener->fault_config_json ?? []),
                ])->values(),
            ]);
        }

        return view('listeners.index', [
            'listeners' => $listeners,
            'sidecarById' => $sidecarById,
        ]);
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
