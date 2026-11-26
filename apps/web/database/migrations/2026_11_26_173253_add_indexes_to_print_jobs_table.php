<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('print_jobs', function (Blueprint $table) {
            $table->index(['listener_id', 'received_at'], 'print_jobs_listener_received_idx');
            $table->index(['status', 'received_at'], 'print_jobs_status_received_idx');
            $table->index(['received_at', 'id'], 'print_jobs_received_id_idx');
        });
    }

    public function down(): void
    {
        Schema::table('print_jobs', function (Blueprint $table) {
            $table->dropIndex('print_jobs_listener_received_idx');
            $table->dropIndex('print_jobs_status_received_idx');
            $table->dropIndex('print_jobs_received_id_idx');
        });
    }
};
