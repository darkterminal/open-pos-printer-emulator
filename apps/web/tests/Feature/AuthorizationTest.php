<?php

namespace Tests\Feature;

use App\Models\Listener;
use App\Models\PrinterProfile;
use App\Models\PrintJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private function makeListener(User $user, string $ext = 'lst_a', int $port = 9100): Listener
    {
        $profile = PrinterProfile::query()->firstOrCreate(['name' => 'Generic ESC/POS', 'is_builtin' => true], [
            'user_id' => null, 'printer_model' => 'generic', 'paper_width_mm' => 80, 'dpi' => 203,
            'chars_per_line' => 48, 'code_page' => 'CP437', 'image_max_width_dots' => 576, 'image_max_bytes' => 1048576,
        ]);

        return Listener::query()->create([
            'external_id' => $ext, 'user_id' => $user->id, 'name' => 'L', 'host' => '0.0.0.0', 'port' => $port,
            'printer_profile_id' => $profile->id, 'status' => 'stopped', 'fault_config_json' => [],
        ]);
    }

    public function test_user_cannot_see_other_users_listeners_jobs_or_profiles(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();
        $listenerA = $this->makeListener($a, 'lst_a', 9100);
        $this->makeListener($b, 'lst_b', 9101);
        $profileB = PrinterProfile::query()->create([
            'user_id' => $b->id, 'name' => 'B Profile', 'is_builtin' => false, 'printer_model' => 'b', 'paper_width_mm' => 80,
            'dpi' => 203, 'chars_per_line' => 48, 'code_page' => 'CP437', 'image_max_width_dots' => 576, 'image_max_bytes' => 1048576,
        ]);
        $jobA = PrintJob::query()->create([
            'listener_id' => $listenerA->id, 'external_id' => 'job_a', 'correlation_id' => 'c_a', 'source_ip' => '127.0.0.1',
            'source_port' => 1, 'received_at' => now(), 'size_bytes' => 1, 'status' => 'parsed', 'warnings_count' => 0, 'checksum_sha256' => str_repeat('a', 64),
        ]);

        $res = $this->actingAs($b)->get('/listeners');
        $page = data_get($res->original->getData(), 'page');
        $page = is_array($page) ? $page : json_decode((string) $page, true);
        $ids = array_column($page['props']['listeners'] ?? [], 'external_id');
        $this->assertNotContains('lst_a', $ids);

        $res = $this->actingAs($b)->get('/jobs');
        $page = data_get($res->original->getData(), 'page');
        $page = is_array($page) ? $page : json_decode((string) $page, true);
        $jobs = $page['props']['jobs']['data'] ?? [];
        $this->assertNotContains('job_a', array_column($jobs, 'external_id'));

        $this->actingAs($b)->get("/jobs/{$jobA->id}")->assertForbidden();

        $res = $this->actingAs($a)->get('/printer-profiles');
        $page = data_get($res->original->getData(), 'page');
        $page = is_array($page) ? $page : json_decode((string) $page, true);
        $names = array_column($page['props']['profiles'] ?? [], 'name');
        $this->assertNotContains('B Profile', $names);
        $this->assertContains('Generic ESC/POS', $names);
    }

    public function test_user_cannot_mutate_other_users_listener_or_profile(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();
        $listenerA = $this->makeListener($a, 'lst_a', 9100);
        $profileA = PrinterProfile::query()->create([
            'user_id' => $a->id, 'name' => 'A Profile', 'is_builtin' => false, 'printer_model' => 'a', 'paper_width_mm' => 80,
            'dpi' => 203, 'chars_per_line' => 48, 'code_page' => 'CP437', 'image_max_width_dots' => 576, 'image_max_bytes' => 1048576,
        ]);

        $this->actingAs($b)->patch("/listeners/{$listenerA->id}", ['name' => 'X', 'host' => '0.0.0.0', 'port' => 9100])->assertForbidden();
        $this->actingAs($b)->delete("/listeners/{$listenerA->id}")->assertForbidden();
        $this->actingAs($b)->patch("/printer-profiles/{$profileA->id}", [
            'name' => 'X', 'printer_model' => 'a', 'paper_width_mm' => 80, 'dpi' => 203, 'chars_per_line' => 48,
            'code_page' => 'CP437', 'image_max_width_dots' => 576, 'image_max_bytes' => 1048576,
        ])->assertForbidden();
        $this->actingAs($b)->delete("/printer-profiles/{$profileA->id}")->assertForbidden();
    }
}
