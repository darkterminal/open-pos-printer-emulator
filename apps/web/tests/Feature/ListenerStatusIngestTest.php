<?php

namespace Tests\Feature;

use App\Models\Listener;
use App\Models\PrinterProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListenerStatusIngestTest extends TestCase
{
    use RefreshDatabase;

    private function seedListener(): Listener
    {
        $user = User::factory()->create();
        $profile = PrinterProfile::query()->create([
            'user_id' => null,
            'name' => 'Generic ESC/POS',
            'is_builtin' => true,
            'printer_model' => 'generic-escpos',
            'paper_width_mm' => 80,
            'dpi' => 203,
            'chars_per_line' => 48,
            'code_page' => 'CP437',
            'image_max_width_dots' => 576,
            'image_max_bytes' => 1048576,
        ]);

        return Listener::query()->create([
            'external_id' => 'lst_default_9100',
            'user_id' => $user->id,
            'name' => 'Default 9100',
            'host' => '0.0.0.0',
            'port' => 9100,
            'printer_profile_id' => $profile->id,
            'status' => 'stopped',
            'fault_config_json' => [],
        ]);
    }

    public function test_sidecar_can_report_listener_status(): void
    {
        $listener = $this->seedListener();
        config(['services.sidecar.shared_token' => 'secret']);

        $response = $this->postJson('/api/internal/v1/listeners/lst_default_9100/status', [
            'schema_version' => '1.0',
            'status' => 'listening',
            'host' => '0.0.0.0',
            'port' => 9100,
            'last_heartbeat_at' => '2026-11-26T08:15:30Z',
            'error' => null,
            'fault_config' => ['paper_out' => true, 'cover_open' => false, 'cutter_error' => false, 'offline' => false],
        ], [
            'X-Sidecar-Token' => 'secret',
        ]);

        $response->assertOk()->assertJsonPath('data.status', 'listening');
        $listener->refresh();
        $this->assertSame('listening', $listener->status);
        $this->assertTrue((bool) $listener->fault_config_json['paper_out']);
        $this->assertNotNull($listener->last_heartbeat_at);
    }

    public function test_invalid_token_rejected(): void
    {
        $this->seedListener();
        config(['services.sidecar.shared_token' => 'secret']);

        $this->postJson('/api/internal/v1/listeners/lst_default_9100/status', [
            'schema_version' => '1.0',
            'status' => 'listening',
        ], ['X-Sidecar-Token' => 'bad'])->assertStatus(401);
    }
}
