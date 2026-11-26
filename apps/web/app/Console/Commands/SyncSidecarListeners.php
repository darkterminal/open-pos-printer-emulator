<?php

namespace App\Console\Commands;

use App\Models\Listener;
use App\Services\SidecarClient;
use Illuminate\Console\Command;
use Throwable;

class SyncSidecarListeners extends Command
{
    protected $signature = 'sidecar:sync-listeners';

    protected $description = 'Sync DB listeners to sidecar control plane and refresh status';

    public function handle(SidecarClient $sidecar): int
    {
        $listeners = Listener::query()->get();

        if ($listeners->isEmpty()) {
            $this->info('No listeners to sync.');

            return self::SUCCESS;
        }

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
            } catch (Throwable $e) {
                report($e);
                $listener->forceFill([
                    'status' => 'error',
                    'last_error' => $e->getMessage(),
                ])->save();
                $this->warn("Failed syncing {$listener->external_id}: {$e->getMessage()}");
            }
        }

        $this->info("Synced {$ok}/{$listeners->count()} listeners.");

        return self::SUCCESS;
    }
}
