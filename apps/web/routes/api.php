<?php

use App\Http\Controllers\Internal\JobIngestController;
use App\Http\Controllers\Internal\ListenerBootstrapController;
use App\Http\Controllers\Internal\ListenerStatusController;
use Illuminate\Support\Facades\Route;

Route::prefix('internal/v1')->middleware('throttle:120,1')->group(function (): void {
    Route::post('/jobs', [JobIngestController::class, 'store']);
    Route::post('/listeners/{externalId}/status', [ListenerStatusController::class, 'store']);
    Route::get('/listeners/bootstrap', [ListenerBootstrapController::class, 'index']);
});
