<?php

namespace Tests\Feature;

use App\Models\Listener;
use App\Models\PrinterProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PrinterProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_printer_profiles_page_renders(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)
            ->get('/printer-profiles')
            ->assertOk()
            ->assertViewIs('app');
    }

    public function test_user_can_create_update_delete_profile(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post('/printer-profiles', [
            'name' => 'Test 58',
            'printer_model' => 'test-58',
            'paper_width_mm' => 58,
            'dpi' => 203,
            'chars_per_line' => 32,
            'code_page' => 'CP437',
            'image_max_width_dots' => 384,
            'image_max_bytes' => 500000,
        ])->assertRedirect();

        $profile = PrinterProfile::query()->where('name', 'Test 58')->firstOrFail();

        $this->actingAs($user)->patch("/printer-profiles/{$profile->id}", [
            'name' => 'Test 58 Updated',
            'printer_model' => 'test-58',
            'paper_width_mm' => 58,
            'dpi' => 203,
            'chars_per_line' => 32,
            'code_page' => 'CP437',
            'image_max_width_dots' => 384,
            'image_max_bytes' => 500000,
        ])->assertRedirect();

        $this->assertDatabaseHas('printer_profiles', ['id' => $profile->id, 'name' => 'Test 58 Updated']);

        $this->actingAs($user)->delete("/printer-profiles/{$profile->id}")->assertRedirect();
        $this->assertDatabaseMissing('printer_profiles', ['id' => $profile->id]);
    }

    public function test_builtin_profile_cannot_be_deleted(): void
    {
        $user = User::factory()->create();
        $profile = PrinterProfile::query()->create([
            'name' => 'Builtin', 'is_builtin' => true, 'printer_model' => 'b', 'paper_width_mm' => 80,
            'dpi' => 203, 'chars_per_line' => 48, 'code_page' => 'CP437', 'image_max_width_dots' => 576, 'image_max_bytes' => 1048576,
        ]);

        $this->actingAs($user)->delete("/printer-profiles/{$profile->id}")->assertSessionHasErrors('profile');
        $this->assertDatabaseHas('printer_profiles', ['id' => $profile->id]);
    }

    public function test_profile_in_use_cannot_be_deleted(): void
    {
        $user = User::factory()->create();
        $profile = PrinterProfile::query()->create([
            'name' => 'InUse', 'is_builtin' => false, 'printer_model' => 'b', 'paper_width_mm' => 80,
            'dpi' => 203, 'chars_per_line' => 48, 'code_page' => 'CP437', 'image_max_width_dots' => 576, 'image_max_bytes' => 1048576,
        ]);
        Listener::query()->create([
            'external_id' => 'lst_x', 'user_id' => $user->id, 'name' => 'L', 'host' => '0.0.0.0', 'port' => 9101,
            'printer_profile_id' => $profile->id, 'status' => 'stopped', 'fault_config_json' => [],
        ]);

        $this->actingAs($user)->delete("/printer-profiles/{$profile->id}")->assertSessionHasErrors('profile');
        $this->assertDatabaseHas('printer_profiles', ['id' => $profile->id]);
    }
}
