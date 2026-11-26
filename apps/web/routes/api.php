<?php

use App\Http\Controllers\Internal\JobIngestController;
use Illuminate\Support\Facades\Route;

Route::prefix('internal/v1')->group(function (): void {
    Route::post('/jobs', [JobIngestController::class, 'store']);
});
