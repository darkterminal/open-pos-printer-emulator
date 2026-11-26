<?php

namespace App\Providers;

use App\Models\Listener;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->bootstrapLocalDefaults();
    }

    private function bootstrapLocalDefaults(): void
    {
        if (! app()->environment('local')) {
            return;
        }

        if (! config('app.bootstrap_defaults', true)) {
            return;
        }

        try {
            if (! Schema::hasTable('listeners')) {
                return;
            }

            if (Listener::query()->exists()) {
                return;
            }

            (new DatabaseSeeder)->run();
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
