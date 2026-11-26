<?php

namespace Tests\Feature;

use App\Models\Listener;
use App\Models\PrinterProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ListenerCrudTest extends TestCase
{
    use RefreshDatabase;

    private function seedUserAndProfile(): array
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

        return [$user, $profile];
    }

    public function test_user_can_create_listener_and_sidecar_is_ensured(): void
    {
        [$user, $profile] = $this->seedUserAndProfile();

        Http::fake([
            'http://sidecar:3001/control/v1/listeners' => Http::response([
                'data' => [
                    'external_id' => 'lst_new',
                    'status' => 'listening',
                    'fault_config' => ['paper_out' => false, 'cover_open' => false, 'cutter_error' => false, 'offline' => false],
                    'last_error' => null,
                ],
            ], 200),
        ]);

        $response = $this->actingAs($user)->post(route('listeners.store'), [
            'name' => 'Warehouse 9102',
            'host' => '0.0.0.0',
            'port' => 9102,
            'printer_profile_id' => $profile->id,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('listeners', ['name' => 'Warehouse 9102', 'port' => 9102, 'status' => 'listening']);

        Http::assertSent(fn ($req) => $req->url() === 'http://sidecar:3001/control/v1/listeners' && $req['port'] === 9102);
    }

    public function test_user_can_delete_listener_and_sidecar_stop_called(): void
    {
        [$user, $profile] = $this->seedUserAndProfile();
        $listener = Listener::query()->create([
            'external_id' => 'lst_del_9103',
            'user_id' => $user->id,
            'name' => 'Delete Me',
            'host' => '0.0.0.0',
            'port' => 9103,
            'printer_profile_id' => $profile->id,
            'status' => 'listening',
            'fault_config_json' => [],
        ]);

        Http::fake([
            'http://sidecar:3001/control/v1/listeners/lst_del_9103' => Http::response(['data' => ['status' => 'stopped']], 200),
        ]);

        $response = $this->actingAs($user)->delete(route('listeners.destroy', $listener));

        $response->assertRedirect();
        $this->assertDatabaseMissing('listeners', ['id' => $listener->id]);
        Http::assertSent(fn ($req) => $req->method() === 'DELETE' && str_contains($req->url(), '/control/v1/listeners/lst_del_9103'));
    }
}
