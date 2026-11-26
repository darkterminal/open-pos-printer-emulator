<?php

namespace Database\Seeders;

use App\Models\Listener;
use App\Models\PrinterProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ],
        );

        $generic = PrinterProfile::query()->firstOrCreate(
            ['name' => 'Generic ESC/POS', 'is_builtin' => true],
            [
                'user_id' => null,
                'printer_model' => 'generic-escpos',
                'paper_width_mm' => 80,
                'dpi' => 203,
                'chars_per_line' => 48,
                'code_page' => 'CP437',
                'image_max_width_dots' => 576,
                'image_max_bytes' => 1048576,
                'settings_json' => ['description' => 'Generic 80mm ESC/POS profile'],
            ],
        );

        PrinterProfile::query()->firstOrCreate(
            ['name' => 'Epson TM-T88V', 'is_builtin' => true],
            [
                'user_id' => null,
                'printer_model' => 'epson-tm-t88v',
                'paper_width_mm' => 80,
                'dpi' => 180,
                'chars_per_line' => 42,
                'code_page' => 'CP437',
                'image_max_width_dots' => 512,
                'image_max_bytes' => 1048576,
                'settings_json' => ['description' => 'Epson TM-T88V compatible profile'],
            ],
        );

        Listener::query()->firstOrCreate(
            ['external_id' => 'lst_default_9100'],
            [
                'user_id' => $admin->id,
                'name' => 'Default 9100',
                'host' => '0.0.0.0',
                'port' => 9100,
                'printer_profile_id' => $generic->id,
                'status' => 'stopped',
                'fault_config_json' => [
                    'paper_out' => false,
                    'cover_open' => false,
                    'cutter_error' => false,
                    'offline' => false,
                ],
            ],
        );
    }
}
