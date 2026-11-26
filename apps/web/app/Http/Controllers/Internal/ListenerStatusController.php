<?php

namespace App\Http\Controllers\Internal;

use App\Http\Controllers\Controller;
use App\Models\Listener;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ListenerStatusController extends Controller
{
    public function store(Request $request, string $externalId): JsonResponse
    {
        $expected = (string) config('services.sidecar.shared_token');
        $provided = (string) $request->header('X-Sidecar-Token', '');

        if ($expected === '' || ! hash_equals($expected, $provided)) {
            return response()->json([
                'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Invalid sidecar token'],
            ], 401);
        }

        $validated = $request->validate([
            'schema_version' => ['required', 'string', Rule::in(['1.0'])],
            'correlation_id' => ['nullable', 'string', 'max:64'],
            'status' => ['required', 'string', Rule::in(['starting', 'listening', 'stopped', 'error', 'offline'])],
            'host' => ['nullable', 'string', 'max:255'],
            'port' => ['nullable', 'integer', 'between:1,65535'],
            'last_heartbeat_at' => ['nullable', 'date'],
            'error' => ['nullable', 'string'],
            'fault_config' => ['nullable', 'array'],
        ]);

        $listener = Listener::query()->where('external_id', $externalId)->first();
        if (! $listener) {
            return response()->json([
                'error' => ['code' => 'LISTENER_NOT_FOUND', 'message' => 'Listener not found'],
            ], 404);
        }

        $listener->forceFill([
            'status' => $validated['status'],
            'host' => $validated['host'] ?? $listener->host,
            'port' => $validated['port'] ?? $listener->port,
            'last_heartbeat_at' => $validated['last_heartbeat_at'] ?? now(),
            'last_error' => $validated['error'] ?? null,
            'fault_config_json' => array_key_exists('fault_config', $validated)
                ? $validated['fault_config']
                : $listener->fault_config_json,
        ])->save();

        return response()->json([
            'data' => [
                'external_id' => $listener->external_id,
                'status' => $listener->status,
                'last_heartbeat_at' => optional($listener->last_heartbeat_at)->toIso8601String(),
            ],
        ]);
    }
}
