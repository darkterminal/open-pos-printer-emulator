<?php

namespace App\Http\Controllers;

use App\Models\PrintJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class JobHistoryController extends Controller
{
    public function index(): View
    {
        $jobs = PrintJob::query()
            ->with('listener:id,name,external_id')
            ->latest('id')
            ->limit(100)
            ->get();

        return view('jobs.index', [
            'jobs' => $jobs,
        ]);
    }

    public function show(PrintJob $job): View
    {
        $job->load(['listener:id,name,external_id', 'rawPayload']);

        return view('jobs.show', [
            'job' => $job,
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
