<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('listeners', function (Blueprint $table) {
            $table->id();
            $table->string('external_id')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('host')->default('0.0.0.0');
            $table->unsignedInteger('port');
            $table->foreignId('printer_profile_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status')->default('stopped')->index();
            $table->json('fault_config_json')->nullable();
            $table->timestamp('last_heartbeat_at')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamps();

            $table->unique(['host', 'port']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('listeners');
    }
};
