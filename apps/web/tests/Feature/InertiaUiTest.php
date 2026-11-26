<?php

namespace Tests\Feature;

use App\Models\Listener;
use App\Models\PrinterProfile;
use App\Models\PrintJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InertiaUiTest extends TestCase
{
    use RefreshDatabase;

    private function seedUserWithListener(): array
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
        $listener = Listener::query()->create([
            'external_id' => 'lst_default_9100',
            'user_id' => $user->id,
            'name' => 'Default 9100',
            'host' => '0.0.0.0',
            'port' => 9100,
            'printer_profile_id' => $profile->id,
            'status' => 'listening',
            'fault_config_json' => [],
        ]);

        PrintJob::query()->create([
            'listener_id' => $listener->id,
            'external_id' => 'job_inertia_1',
            'correlation_id' => '01INERTIACORRID0000000000',
            'source_ip' => '127.0.0.1',
            'source_port' => 12345,
            'received_at' => now(),
            'completed_at' => now(),
            'size_bytes' => 12,
            'status' => 'parsed',
            'warnings_count' => 0,
            'render_model_json' => ['width_dots' => 576, 'lines' => [], 'actions' => []],
            'commands_json' => [],
            'warnings_json' => [],
            'checksum_sha256' => str_repeat('b', 64),
        ]);

        return [$user, $listener, $profile];
    }

    private function inertiaPage($response): array
    {
        $page = data_get($response->original->getData(), 'page');

        return is_array($page) ? $page : json_decode((string) $page, true, 512, JSON_THROW_ON_ERROR);
    }

    public function test_jobs_index_inertia_renders_component_and_props(): void
    {
        [$user] = $this->seedUserWithListener();

        $response = $this->actingAs($user)->get('/jobs');

        $response->assertOk();
        $response->assertViewIs('app');
        $page = $this->inertiaPage($response);
        $this->assertSame('Jobs/Index', $page['component']);
        $this->assertNotEmpty($page['props']['jobs'] ?? []);
        $this->assertSame('job_inertia_1', $page['props']['jobs'][0]['external_id']);
    }

    public function test_listeners_index_inertia_renders_component_and_props(): void
    {
        [$user, $listener, $profile] = $this->seedUserWithListener();

        $response = $this->actingAs($user)->get('/listeners');

        $response->assertOk();
        $response->assertViewIs('app');
        $page = $this->inertiaPage($response);
        $this->assertSame('Listeners/Index', $page['component']);
        $this->assertSame($listener->external_id, $page['props']['listeners'][0]['external_id']);
        $this->assertSame($profile->name, $page['props']['profiles'][0]['name']);
    }

    public function test_inertia_shared_props_include_auth_and_flash(): void
    {
        [$user] = $this->seedUserWithListener();

        $response = $this->actingAs($user)->get('/jobs');

        $response->assertOk();
        $page = $this->inertiaPage($response);
        $this->assertSame($user->email, $page['props']['auth']['user']['email']);
        $this->assertArrayHasKey('status', $page['props']['flash']);
    }
}
