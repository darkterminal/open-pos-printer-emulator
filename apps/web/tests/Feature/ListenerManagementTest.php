<?php

namespace Tests\Feature;

use App\Models\Listener;
use App\Models\PrinterProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ListenerManagementTest extends TestCase
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
            'status' => 'listening',
            'fault_config_json' => [],
        ]);
    }

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get(route('listeners.index'))->assertRedirect(route('login'));
    }

    public function test_listener_index_renders_sidecar_status(): void
    {
        $listener = $this->seedListener();
        $user = $listener->user;

        Http::fake([
            'http://sidecar:3001/health' => Http::response([
                'status' => 'ok',
                'listeners' => [
                    [
                        'external_id' => 'lst_default_9100',
                        'host' => '0.0.0.0',
                        'port' => 9100,
                        'status' => 'listening',
                        'fault_config' => ['paper_out' => false, 'cover_open' => false, 'cutter_error' => false, 'offline' => false],
                    ],
                ],
            ], 200),
        ]);

        $response = $this->actingAs($user)->get(route('listeners.index'));

        $response->assertOk();
        $response->assertSee('Listeners');
        $response->assertSee('Default 9100');
        $response->assertSee('lst_default_9100');
        $response->assertSee('listening');
    }

    public function test_fault_update_calls_sidecar_and_persists(): void
    {
        $listener = $this->seedListener();
        $user = $listener->user;

        Http::fake([
            'http://sidecar:3001/control/v1/listeners/lst_default_9100/faults' => Http::response([
                'data' => [
                    'external_id' => 'lst_default_9100',
                    'status' => 'listening',
                    'fault_config' => ['paper_out' => true, 'cover_open' => false, 'cutter_error' => false, 'offline' => false],
                ],
            ], 200),
        ]);

        $response = $this->actingAs($user)->patch(route('listeners.faults.update', $listener), [
            'paper_out' => '1',
        ]);

        $response->assertRedirect();
        $listener->refresh();
        $this->assertTrue((bool) ($listener->fault_config_json['paper_out'] ?? false));

        Http::assertSent(function ($request) {
            return $request->url() === 'http://sidecar:3001/control/v1/listeners/lst_default_9100/faults'
                && $request['faults']['paper_out'] === true;
        });
    }

    public function test_manual_sync_calls_sidecar_ensure(): void
    {
        $listener = $this->seedListener();
        $user = $listener->user;

        Http::fake([
            'http://sidecar:3001/control/v1/listeners' => Http::response([
                'data' => [
                    'external_id' => 'lst_default_9100',
                    'status' => 'listening',
                    'fault_config' => [],
                    'last_error' => null,
                ],
            ], 200),
        ]);

        $response = $this->actingAs($user)->post(route('listeners.sync'));
        $response->assertRedirect();
        $response->assertSessionHas('status');

        Http::assertSent(fn ($req) => $req->url() === 'http://sidecar:3001/control/v1/listeners' && $req['listener_external_id'] === 'lst_default_9100');
    }
}
