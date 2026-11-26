<?php

namespace Tests\Feature;

use App\Models\Listener;
use App\Models\PrinterProfile;
use App\Models\PrintJob;
use App\Models\RawPayload;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PrunePrintJobsCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_jobs_prune_command_deletes_old_jobs_and_raw_payloads(): void
    {
        $user = User::factory()->create();
        $profile = PrinterProfile::query()->create([
            'user_id' => null, 'name' => 'G', 'is_builtin' => true, 'printer_model' => 'g', 'paper_width_mm' => 80,
            'dpi' => 203, 'chars_per_line' => 48, 'code_page' => 'CP437', 'image_max_width_dots' => 576, 'image_max_bytes' => 1048576,
        ]);
        $listener = Listener::query()->create(['external_id' => 'lst_p', 'user_id' => $user->id, 'name' => 'L', 'host' => '0.0.0.0', 'port' => 9100, 'printer_profile_id' => $profile->id, 'status' => 'listening', 'fault_config_json' => []]);

        $old = PrintJob::query()->create(['listener_id' => $listener->id, 'external_id' => 'old', 'correlation_id' => 'c1', 'source_ip' => '127.0.0.1', 'source_port' => 1, 'received_at' => now()->subDays(40), 'size_bytes' => 1, 'status' => 'parsed', 'warnings_count' => 0, 'checksum_sha256' => str_repeat('a', 64)]);
        RawPayload::query()->create(['print_job_id' => $old->id, 'content_base64' => base64_encode('old'), 'content_sha256' => str_repeat('a', 64)]);
        $new = PrintJob::query()->create(['listener_id' => $listener->id, 'external_id' => 'new', 'correlation_id' => 'c2', 'source_ip' => '127.0.0.1', 'source_port' => 1, 'received_at' => now()->subDay(), 'size_bytes' => 1, 'status' => 'parsed', 'warnings_count' => 0, 'checksum_sha256' => str_repeat('b', 64)]);
        RawPayload::query()->create(['print_job_id' => $new->id, 'content_base64' => base64_encode('new'), 'content_sha256' => str_repeat('b', 64)]);

        $this->artisan('jobs:prune --days=30')->assertExitCode(0);

        $this->assertDatabaseMissing('print_jobs', ['id' => $old->id]);
        $this->assertDatabaseMissing('raw_payloads', ['print_job_id' => $old->id]);
        $this->assertDatabaseHas('print_jobs', ['id' => $new->id]);
    }
}
