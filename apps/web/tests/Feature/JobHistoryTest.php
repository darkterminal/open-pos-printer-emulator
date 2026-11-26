<?php

namespace Tests\Feature;

use App\Models\Listener;
use App\Models\PrinterProfile;
use App\Models\PrintJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobHistoryTest extends TestCase
{
    use RefreshDatabase;

    private function seedJobs(User $user): array
    {
        $profile = PrinterProfile::query()->create([
            'user_id' => null, 'name' => 'Generic', 'is_builtin' => true, 'printer_model' => 'g', 'paper_width_mm' => 80,
            'dpi' => 203, 'chars_per_line' => 48, 'code_page' => 'CP437', 'image_max_width_dots' => 576, 'image_max_bytes' => 1048576,
        ]);
        $l1 = Listener::query()->create(['external_id' => 'lst_1', 'user_id' => $user->id, 'name' => 'L1', 'host' => '0.0.0.0', 'port' => 9100, 'printer_profile_id' => $profile->id, 'status' => 'listening', 'fault_config_json' => []]);
        $l2 = Listener::query()->create(['external_id' => 'lst_2', 'user_id' => $user->id, 'name' => 'L2', 'host' => '0.0.0.0', 'port' => 9101, 'printer_profile_id' => $profile->id, 'status' => 'listening', 'fault_config_json' => []]);

        $j1 = PrintJob::query()->create(['listener_id' => $l1->id, 'external_id' => 'job_alpha', 'correlation_id' => 'corr_1', 'source_ip' => '10.0.0.1', 'source_port' => 1111, 'received_at' => now()->subMinutes(2), 'size_bytes' => 10, 'status' => 'parsed', 'warnings_count' => 0, 'checksum_sha256' => str_repeat('a', 64)]);
        $j2 = PrintJob::query()->create(['listener_id' => $l2->id, 'external_id' => 'job_beta', 'correlation_id' => 'corr_2', 'source_ip' => '10.0.0.2', 'source_port' => 2222, 'received_at' => now()->subMinute(), 'size_bytes' => 20, 'status' => 'parse_error', 'warnings_count' => 1, 'checksum_sha256' => str_repeat('b', 64)]);

        return [$l1, $l2, $j1, $j2];
    }

    public function test_jobs_index_filters_by_q_status_listener(): void
    {
        $user = User::factory()->create();
        [$l1] = $this->seedJobs($user);

        $res = $this->actingAs($user)->get('/jobs?q=alpha&status=parsed&listener_id='.$l1->id);
        $res->assertOk();
        $page = data_get($res->original->getData(), 'page');
        $page = is_array($page) ? $page : json_decode((string) $page, true);
        $jobs = $page['props']['jobs']['data'] ?? [];
        $this->assertCount(1, $jobs);
        $this->assertSame('job_alpha', $jobs[0]['external_id']);
    }

    public function test_jobs_feed_respects_filters_and_after_id(): void
    {
        $user = User::factory()->create();
        [$l1, , $j1, $j2] = $this->seedJobs($user);

        $res = $this->actingAs($user)->getJson('/jobs/feed?status=parsed&after_id=0');
        $res->assertOk();
        $data = $res->json('data');
        $this->assertCount(1, $data);
        $this->assertSame('job_alpha', $data[0]['external_id']);

        $res2 = $this->actingAs($user)->getJson('/jobs/feed?after_id='.$j1->id);
        $res2->assertOk();
        $ids = array_column($res2->json('data'), 'id');
        $this->assertContains($j2->id, $ids);
        $this->assertNotContains($j1->id, $ids);
    }

    public function test_jobs_index_paginates(): void
    {
        $user = User::factory()->create();
        $profile = PrinterProfile::query()->create([
            'user_id' => null, 'name' => 'G', 'is_builtin' => true, 'printer_model' => 'g', 'paper_width_mm' => 80,
            'dpi' => 203, 'chars_per_line' => 48, 'code_page' => 'CP437', 'image_max_width_dots' => 576, 'image_max_bytes' => 1048576,
        ]);
        $listener = Listener::query()->create(['external_id' => 'lst_p', 'user_id' => $user->id, 'name' => 'LP', 'host' => '0.0.0.0', 'port' => 9102, 'printer_profile_id' => $profile->id, 'status' => 'listening', 'fault_config_json' => []]);
        for ($i = 0; $i < 30; $i++) {
            PrintJob::query()->create(['listener_id' => $listener->id, 'external_id' => "job_p_$i", 'correlation_id' => "c_$i", 'source_ip' => '127.0.0.1', 'source_port' => 1, 'received_at' => now()->subSeconds(30 - $i), 'size_bytes' => 1, 'status' => 'parsed', 'warnings_count' => 0, 'checksum_sha256' => hash('sha256', (string) $i)]);
        }

        $res = $this->actingAs($user)->get('/jobs?per_page=25');
        $res->assertOk();
        $page = data_get($res->original->getData(), 'page');
        $page = is_array($page) ? $page : json_decode((string) $page, true);
        $this->assertCount(25, $page['props']['jobs']['data']);
        $this->assertSame(2, $page['props']['pagination']['last_page']);
    }
}
