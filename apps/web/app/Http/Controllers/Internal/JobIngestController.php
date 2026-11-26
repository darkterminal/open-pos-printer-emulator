<?php

namespace App\Http\Controllers\Internal;

use App\Events\JobIngested;
use App\Http\Controllers\Controller;
use App\Models\Listener;
use App\Models\PrintJob;
use App\Models\RawPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class JobIngestController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $expected = (string) config('services.sidecar.shared_token');
        $provided = (string) $request->header('X-Sidecar-Token', '');

        if ($expected === '' || ! hash_equals($expected, $provided)) {
            return response()->json([
                'error' => [
                    'code' => 'UNAUTHORIZED',
                    'message' => 'Invalid sidecar token',
                ],
            ], 401);
        }

        $maxBytes = (int) config('services.sidecar.max_payload_bytes', 1048576);
        $validated = $request->validate([
            'schema_version' => ['required', 'string', Rule::in(['1.0'])],
            'correlation_id' => ['required', 'string', 'max:64'],
            'external_id' => ['required', 'string', 'max:128'],
            'listener_external_id' => ['required', 'string', 'max:128'],
            'received_at' => ['required', 'date'],
            'completed_at' => ['required', 'date'],
            'source.ip' => ['required', 'string', 'max:45'],
            'source.port' => ['nullable', 'integer', 'between:0,65535'],
            'connection.status' => ['required', 'string', 'max:64'],
            'connection.bytes_received' => ['required', 'integer', 'min:0', 'max:'.$maxBytes],
            'raw.encoding' => ['required', 'string', Rule::in(['base64'])],
            'raw.data' => ['present', 'string'],
            'raw.sha256' => ['required', 'string', 'size:64'],
            'parse.status' => ['required', 'string', Rule::in(['ok', 'partial', 'parse_error'])],
            'parse.profile' => ['required', 'string', 'max:64'],
            'parse.warnings' => ['present', 'array'],
            'parse.commands' => ['present', 'array'],
            'parse.render_model' => ['nullable', 'array'],
        ]);

        $decoded = base64_decode($validated['raw']['data'], true);
        if ($decoded === false) {
            return response()->json([
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'Invalid base64 raw payload',
                ],
            ], 422);
        }

        $actualSha = hash('sha256', $decoded);
        if (! hash_equals($validated['raw']['sha256'], $actualSha)) {
            return response()->json([
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'Raw payload sha256 mismatch',
                ],
            ], 422);
        }

        if (strlen($decoded) > $maxBytes) {
            return response()->json([
                'error' => [
                    'code' => 'PAYLOAD_TOO_LARGE',
                    'message' => 'Raw payload exceeds configured limit',
                ],
            ], 413);
        }

        $existing = PrintJob::query()->where('external_id', $validated['external_id'])->first();
        if ($existing) {
            return response()->json([
                'data' => [
                    'job_id' => $existing->id,
                    'external_id' => $existing->external_id,
                    'status' => $existing->status,
                    'duplicate' => true,
                ],
            ], 200);
        }

        $listener = Listener::query()
            ->where('external_id', $validated['listener_external_id'])
            ->first();

        if (! $listener) {
            return response()->json([
                'error' => [
                    'code' => 'LISTENER_NOT_FOUND',
                    'message' => 'Listener not found',
                ],
            ], 404);
        }

        $job = DB::transaction(function () use ($validated, $listener) {
            $job = PrintJob::query()->create([
                'listener_id' => $listener->id,
                'external_id' => $validated['external_id'],
                'correlation_id' => $validated['correlation_id'],
                'source_ip' => $validated['source']['ip'],
                'source_port' => $validated['source']['port'] ?? null,
                'received_at' => $validated['received_at'],
                'completed_at' => $validated['completed_at'],
                'size_bytes' => $validated['connection']['bytes_received'],
                'status' => $validated['parse']['status'] === 'ok' ? 'parsed' : $validated['parse']['status'],
                'warnings_count' => count($validated['parse']['warnings'] ?? []),
                'error_message' => $validated['parse']['status'] === 'parse_error' ? 'Parse error reported by sidecar' : null,
                'render_model_json' => $validated['parse']['render_model'] ?? null,
                'warnings_json' => $validated['parse']['warnings'] ?? [],
                'checksum_sha256' => $validated['raw']['sha256'],
            ]);

            RawPayload::query()->create([
                'print_job_id' => $job->id,
                'storage_disk' => 'local',
                'content_base64' => $validated['raw']['data'],
                'content_sha256' => $validated['raw']['sha256'],
            ]);

            $listener->forceFill([
                'status' => 'listening',
                'last_heartbeat_at' => now(),
                'last_error' => null,
            ])->save();

            return $job;
        });

        try {
            event(new JobIngested($job));
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'data' => [
                'job_id' => $job->id,
                'external_id' => $job->external_id,
                'status' => $job->status,
                'duplicate' => false,
            ],
        ], 201);
    }
}
