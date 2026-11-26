<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('raw_payloads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('print_job_id')->constrained('print_jobs')->cascadeOnDelete()->unique();
            $table->string('storage_disk')->default('local');
            $table->longText('content_base64');
            $table->string('content_sha256', 64)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('raw_payloads');
    }
};
