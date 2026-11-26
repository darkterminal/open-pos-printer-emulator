<?php

namespace Tests\Feature;

use App\Models\Listener;
use App\Models\PrinterProfile;
use App\Models\PrintJob;
use App\Models\RawPayload;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobDetailTest extends TestCase
{
    use RefreshDatabase;

    private function makeJob(): PrintJob
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

        $job = PrintJob::query()->create([
            'listener_id' => $listener->id,
            'external_id' => 'job_detail_1',
            'correlation_id' => '01DETAILCORRID000000000000',
            'source_ip' => '127.0.0.1',
            'source_port' => 12345,
            'received_at' => now(),
            'completed_at' => now(),
            'size_bytes' => 32,
            'status' => 'parsed',
            'warnings_count' => 1,
            'render_model_json' => [
                'width_dots' => 576,
                'lines' => [
                    ['text' => 'TOTAL', 'align' => 'center', 'bold' => true, 'underline' => false, 'width' => 1, 'height' => 1],
                ],
                'actions' => ['initialize', 'cut'],
            ],
            'commands_json' => [
                ['offset' => 0, 'hex' => '1b 40', 'name' => 'ESC_@', 'args' => ['description' => 'Initialize printer']],
                ['offset' => 2, 'hex' => '1b 61 01', 'name' => 'ESC_a', 'args' => ['align' => 'center', 'value' => 1]],
            ],
            'warnings_json' => ['idle_timeout_finalize'],
            'checksum_sha256' => str_repeat('a', 64),
        ]);

        RawPayload::query()->create([
            'print_job_id' => $job->id,
            'storage_disk' => 'local',
            'content_base64' => base64_encode("\x1b@\x1ba\x01TOTAL\n\x1dV\x00"),
            'content_sha256' => str_repeat('a', 64),
        ]);

        return $job;
    }

    public function test_guest_is_redirected_to_login(): void
    {
        $job = $this->makeJob();

        $this->get(route('jobs.show', $job))->assertRedirect(route('login'));
    }

    public function test_job_detail_renders_preview_commands_and_warnings(): void
    {
        $job = $this->makeJob();
        $user = User::query()->firstOrFail();

        $response = $this->actingAs($user)->get(route('jobs.show', [$job, 'ui' => 'blade']));

        $response->assertOk();
        $response->assertViewIs('jobs.show');
        $response->assertSee('Receipt Preview');
        $response->assertSee('TOTAL');
        $response->assertSee('Command Inspector');
        $response->assertSee('ESC_a');
        $response->assertSee('idle_timeout_finalize');
        $response->assertSee('job_detail_1');
    }

    public function test_job_detail_inertia_page_renders_props(): void
    {
        $job = $this->makeJob();
        $user = User::query()->firstOrFail();

        $response = $this->actingAs($user)->get(route('jobs.show', $job));

        $response->assertOk();
        $response->assertViewIs('app');
        $page = data_get($response->original->getData(), 'page');
        $page = is_array($page) ? $page : json_decode((string) $page, true);
        $this->assertSame('Jobs/Show', $page['component'] ?? null);
        $this->assertSame('job_detail_1', $page['props']['job']['external_id'] ?? null);
    }
}
