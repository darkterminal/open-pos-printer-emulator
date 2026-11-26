<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('print_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('listener_id')->constrained()->cascadeOnDelete();
            $table->string('external_id')->unique();
            $table->string('correlation_id')->index();
            $table->string('source_ip', 45);
            $table->unsignedInteger('source_port')->nullable();
            $table->timestamp('received_at')->index();
            $table->timestamp('completed_at')->nullable();
            $table->unsignedInteger('size_bytes')->default(0);
            $table->string('status')->index(); // received, parsing, parsed, parse_error, partial
            $table->unsignedInteger('warnings_count')->default(0);
            $table->text('error_message')->nullable();
            $table->json('render_model_json')->nullable();
            $table->json('warnings_json')->nullable();
            $table->string('checksum_sha256', 64)->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('print_jobs');
    }
};
