<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('printer_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->boolean('is_builtin')->default(false);
            $table->string('printer_model')->default('generic-escpos');
            $table->unsignedSmallInteger('paper_width_mm')->default(80);
            $table->unsignedSmallInteger('dpi')->default(203);
            $table->unsignedSmallInteger('chars_per_line')->default(48);
            $table->string('code_page')->default('CP437');
            $table->unsignedInteger('image_max_width_dots')->default(576);
            $table->unsignedInteger('image_max_bytes')->default(1048576);
            $table->json('settings_json')->nullable();
            $table->timestamps();

            $table->index(['is_builtin', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('printer_profiles');
    }
};
