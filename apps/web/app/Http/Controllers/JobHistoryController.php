<?php

namespace App\Http\Controllers;

use App\Models\Listener;
use App\Models\PrintJob;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class JobHistoryController extends Controller
{
    public function index(Request $request): View|InertiaResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:200'],
            'status' => ['nullable', 'string', 'max:40'],
            'listener_id' => ['nullable', 'integer', 'exists:listeners,id'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'per_page' => ['nullable', 'integer', 'in:25,50,100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $perPage = (int) ($validated['per_page'] ?? 25);
        $query = PrintJob::query()
            ->with('listener:id,name,external_id')
            ->latest('id');

        $this->applyFilters($query, $validated);

        $jobs = $query->paginate($perPage)->withQueryString();
        $listeners = Listener::query()->orderBy('name')->get(['id', 'name', 'external_id']);
        $filters = [
            'q' => (string) ($validated['q'] ?? ''),
            'status' => (string) ($validated['status'] ?? ''),
            'listener_id' => isset($validated['listener_id']) ? (string) $validated['listener_id'] : '',
            'date_from' => (string) ($validated['date_from'] ?? ''),
            'date_to' => (string) ($validated['date_to'] ?? ''),
            'per_page' => (string) $perPage,
        ];

        if (strtolower((string) $request->query('ui', '')) === 'blade') {
            return view('jobs.index', [
                'jobs' => $jobs,
                'listeners' => $listeners,
                'filters' => $filters,
            ]);
        }

        return Inertia::render('Jobs/Index', [
            'jobs' => $jobs->through(fn (PrintJob $job) => $this->jobSummary($job)),
            'listeners' => $listeners->map(fn (Listener $l) => $l->only(['id', 'name', 'external_id']))->values(),
            'filters' => $filters,
            'pagination' => [
                'current_page' => $jobs->currentPage(),
                'last_page' => $jobs->lastPage(),
                'per_page' => $jobs->perPage(),
                'total' => $jobs->total(),
                'from' => $jobs->firstItem(),
                'to' => $jobs->lastItem(),
            ],
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
        $validated = $request->validate([
            'after_id' => ['nullable', 'integer', 'min:0'],
            'q' => ['nullable', 'string', 'max:200'],
            'status' => ['nullable', 'string', 'max:40'],
            'listener_id' => ['nullable', 'integer', 'exists:listeners,id'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
        ]);

        $afterId = max(0, (int) ($validated['after_id'] ?? 0));

        $query = PrintJob::query()
            ->with('listener:id,name,external_id')
            ->when($afterId > 0, fn ($q) => $q->where('id', '>', $afterId))
            ->latest('id')
            ->limit(100);

        $this->applyFilters($query, $validated);

        $jobs = $query->get()
            ->map(fn (PrintJob $job) => $this->jobSummary($job))
            ->values();

        return response()->json(['data' => $jobs]);
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function applyFilters(Builder $query, array $filters): void
    {
        $q = trim((string) ($filters['q'] ?? ''));
        $status = trim((string) ($filters['status'] ?? ''));
        $listenerId = $filters['listener_id'] ?? null;
        $dateFrom = trim((string) ($filters['date_from'] ?? ''));
        $dateTo = trim((string) ($filters['date_to'] ?? ''));

        if ($q !== '') {
            $query->where(function (Builder $inner) use ($q) {
                $inner->where('external_id', 'like', '%'.$q.'%')
                    ->orWhere('correlation_id', 'like', '%'.$q.'%')
                    ->orWhere('source_ip', 'like', '%'.$q.'%');
            });
        }
        if ($status !== '') {
            $query->where('status', $status);
        }
        if ($listenerId !== null && $listenerId !== '') {
            $query->where('listener_id', (int) $listenerId);
        }
        if ($dateFrom !== '') {
            $query->whereDate('received_at', '>=', $dateFrom);
        }
        if ($dateTo !== '') {
            $query->whereDate('received_at', '<=', $dateTo);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function jobSummary(PrintJob $job): array
    {
        return [
            'id' => $job->id,
            'external_id' => $job->external_id,
            'status' => $job->status,
            'listener' => $job->listener?->only(['name', 'external_id']),
            'listener_id' => $job->listener_id,
            'source_ip' => $job->source_ip,
            'source_port' => $job->source_port,
            'size_bytes' => $job->size_bytes,
            'warnings_count' => $job->warnings_count,
            'correlation_id' => $job->correlation_id,
            'received_at' => optional($job->received_at)->toIso8601String(),
        ];
    }
}
