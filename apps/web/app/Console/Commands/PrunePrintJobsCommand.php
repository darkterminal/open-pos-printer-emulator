<?php

namespace App\Console\Commands;

use App\Models\PrintJob;
use Illuminate\Console\Command;

class PrunePrintJobsCommand extends Command
{
    protected $signature = 'jobs:prune {--days= : Retention days override} {--dry-run : Show count without deleting}';

    protected $description = 'Prune old print jobs and related raw payloads';

    public function handle(): int
    {
        $days = (int) ($this->option('days') ?? config('services.print_jobs.retention_days', 30));
        if ($days < 1) {
            $this->error('Retention days must be >= 1.');

            return self::FAILURE;
        }

        $cutoff = now()->subDays($days);
        $query = PrintJob::query()->where('received_at', '<', $cutoff);
        $count = (clone $query)->count();

        if ($this->option('dry-run')) {
            $this->info("Dry run: {$count} print jobs older than {$days} days would be pruned.");

            return self::SUCCESS;
        }

        $deleted = 0;
        $query->select('id')->chunkById(200, function ($jobs) use (&$deleted): void {
            $ids = $jobs->pluck('id')->all();
            PrintJob::query()->whereIn('id', $ids)->delete();
            $deleted += count($ids);
        });

        $this->info("Pruned {$deleted} print jobs older than {$days} days.");

        return self::SUCCESS;
    }
}
