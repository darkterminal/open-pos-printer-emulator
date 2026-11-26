<?php

namespace App\Http\Controllers\Internal;

use App\Http\Controllers\Controller;
use App\Models\Listener;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ListenerBootstrapController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $expected = (string) config('services.sidecar.shared_token');
        $provided = (string) $request->header('X-Sidecar-Token', '');

        if ($expected === '' || ! hash_equals($expected, $provided)) {
            return response()->json([
                'error' => ['code' => 'UNAUTHORIZED', 'message' => 'Invalid sidecar token'],
            ], 401);
        }

        $listeners = Listener::query()
            ->orderBy('id')
            ->get(['external_id', 'host', 'port', 'status', 'fault_config_json', 'last_error'])
            ->map(fn (Listener $listener) => [
                'external_id' => $listener->external_id,
                'host' => $listener->host,
                'port' => $listener->port,
                'status' => $listener->status,
                'fault_config' => $listener->fault_config_json ?? (object) [],
                'last_error' => $listener->last_error,
            ])
            ->values();

        return response()->json(['data' => $listeners]);
    }
}
