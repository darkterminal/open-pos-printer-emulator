<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class SidecarClient
{
    private function request(): PendingRequest
    {
        $base = rtrim((string) config('services.sidecar.internal_url', 'http://sidecar:3001'), '/');
        $token = (string) config('services.sidecar.shared_token', '');

        return Http::baseUrl($base)
            ->acceptJson()
            ->timeout(5)
            ->withHeaders([
                'X-Sidecar-Token' => $token,
            ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listeners(): array
    {
        $response = $this->request()->get('/health');
        if (! $response->ok()) {
            throw new RuntimeException('Sidecar health request failed: '.$response->status());
        }

        $listeners = $response->json('listeners');

        return is_array($listeners) ? $listeners : [];
    }

    /**
     * @param  array<string, bool>  $faults
     * @return array<string, mixed>
     */
    public function updateFaults(string $externalId, array $faults): array
    {
        $response = $this->request()->patch("/control/v1/listeners/{$externalId}/faults", [
            'faults' => $faults,
        ]);

        if (! $response->ok()) {
            throw new RuntimeException('Sidecar fault update failed: '.$response->status().' '.$response->body());
        }

        $data = $response->json('data');

        return is_array($data) ? $data : [];
    }

    /**
     * @return array<string, mixed>
     */
    public function ensureListener(string $externalId, string $host, int $port): array
    {
        $response = $this->request()->post('/control/v1/listeners', [
            'listener_external_id' => $externalId,
            'host' => $host,
            'port' => $port,
        ]);

        if (! $response->ok()) {
            throw new RuntimeException('Sidecar listener ensure failed: '.$response->status().' '.$response->body());
        }

        $data = $response->json('data');

        return is_array($data) ? $data : [];
    }

    /**
     * @return array<string, mixed>
     */
    public function stopListener(string $externalId): array
    {
        $response = $this->request()->delete("/control/v1/listeners/{$externalId}");

        if (! $response->ok()) {
            throw new RuntimeException('Sidecar listener stop failed: '.$response->status().' '.$response->body());
        }

        $data = $response->json('data');

        return is_array($data) ? $data : [];
    }
}
