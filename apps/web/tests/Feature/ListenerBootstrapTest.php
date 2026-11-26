<?php

namespace Tests\Feature;

use App\Models\Listener;
use App\Models\PrinterProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListenerBootstrapTest extends TestCase
{
    use RefreshDatabase;

    public function test_sidecar_can_fetch_listener_bootstrap_config(): void
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

        Listener::query()->create([
            'external_id' => 'lst_default_9100',
            'user_id' => $user->id,
            'name' => 'Default 9100',
            'host' => '0.0.0.0',
            'port' => 9100,
            'printer_profile_id' => $profile->id,
            'status' => 'listening',
            'fault_config_json' => ['paper_out' => true, 'cover_open' => false, 'cutter_error' => false, 'offline' => false],
        ]);

        config(['services.sidecar.shared_token' => 'secret']);

        $this->getJson('/api/internal/v1/listeners/bootstrap', ['X-Sidecar-Token' => 'secret'])
            ->assertOk()
            ->assertJsonPath('data.0.external_id', 'lst_default_9100')
            ->assertJsonPath('data.0.port', 9100)
            ->assertJsonPath('data.0.fault_config.paper_out', true);
    }

    public function test_bootstrap_requires_valid_token(): void
    {
        config(['services.sidecar.shared_token' => 'secret']);

        $this->getJson('/api/internal/v1/listeners/bootstrap', ['X-Sidecar-Token' => 'bad'])
            ->assertStatus(401);
    }
}
