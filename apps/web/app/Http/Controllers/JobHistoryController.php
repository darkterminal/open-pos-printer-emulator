<?php

namespace App\Http\Controllers;

use App\Models\PrintJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class JobHistoryController extends Controller
{
    public function index(Request $request): View|InertiaResponse
    {
        $jobs = PrintJob::query()
            ->with('listener:id,name,external_id')
            ->latest('id')
            ->limit(100)
            ->get();

        if (strtolower((string) $request->query('ui', '')) === 'blade') {
            return view('jobs.index', [
                'jobs' => $jobs,
            ]);
        }

        return Inertia::render('Jobs/Index', [
            'jobs' => $jobs->map(fn (PrintJob $job) => [
                'id' => $job->id,
                'external_id' => $job->external_id,
                'status' => $job->status,
                'listener' => $job->listener?->only(['name', 'external_id']),
                'source_ip' => $job->source_ip,
                'source_port' => $job->source_port,
                'size_bytes' => $job->size_bytes,
                'warnings_count' => $job->warnings_count,
                'correlation_id' => $job->correlation_id,
                'received_at' => optional($job->received_at)->toIso8601String(),
            ])->values(),
        ]);
    }

    public function show(Request $request, PrintJob $job): View|InertiaResponse
    {
        $job->load(['listener:id,name,external_id', 'rawPayload']);

        if (strtolower((string) $request->query('ui', '')) === 'blade') {
            return view('jobs.show', [
                'job' => $job,
            ]);
        }

        return Inertia::render('Jobs/Show', [
            'job' => [
                'id' => $job->id,
                'external_id' => $job->external_id,
                'correlation_id' => $job->correlation_id,
                'status' => $job->status,
                'source_ip' => $job->source_ip,
                'source_port' => $job->source_port,
                'size_bytes' => $job->size_bytes,
                'received_at' => optional($job->received_at)->toIso8601String(),
                'completed_at' => optional($job->completed_at)->toIso8601String(),
                'connection_status' => $job->connection_status,
                'parser_profile' => $job->parser_profile,
                'parser_warnings' => $job->warnings_json ?? [],
                'warnings_count' => $job->warnings_count,
                'render_model' => $job->render_model_json ?? ['lines' => [], 'actions' => [], 'width_dots' => 576],
                'commands' => $job->commands_json ?? [],
                'raw_base64' => $job->rawPayload?->payload_base64,
                'listener' => $job->listener?->only(['name', 'external_id']),
            ],
        ]);
    }

    public function feed(Request $request): JsonResponse
    {
        $afterId = max(0, (int) $request->integer('after_id', 0));

        $jobs = PrintJob::query()
            ->with('listener:id,name,external_id')
            ->when($afterId > 0, fn ($q) => $q->where('id', '>', $afterId))
            ->latest('id')
            ->limit(100)
            ->get()
            ->map(fn (PrintJob $job) => [
                'id' => $job->id,
                'external_id' => $job->external_id,
                'status' => $job->status,
                'listener' => $job->listener?->only(['name', 'external_id']),
                'source_ip' => $job->source_ip,
                'source_port' => $job->source_port,
                'size_bytes' => $job->size_bytes,
                'warnings_count' => $job->warnings_count,
                'correlation_id' => $job->correlation_id,
                'received_at' => optional($job->received_at)->toIso8601String(),
            ])
            ->values();

        return response()->json(['data' => $jobs]);
    }
}
