<?php

namespace App\Http\Controllers;

use App\Models\Listener;
use App\Services\SidecarClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ListenerController extends Controller
{
    public function index(SidecarClient $sidecar): View
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
