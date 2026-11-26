<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\JobHistoryController;
use App\Http\Controllers\ListenerController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect()->route('jobs.index'));

Route::middleware('guest')->group(function (): void {
    Route::get('/login', [LoginController::class, 'show'])->name('login');
    Route::post('/login', [LoginController::class, 'store'])->name('login.store');
});

Route::post('/logout', [LoginController::class, 'destroy'])->middleware('auth')->name('logout');

Route::middleware('auth')->group(function (): void {
    Route::get('/jobs', [JobHistoryController::class, 'index'])->name('jobs.index');
    Route::get('/jobs/feed', [JobHistoryController::class, 'feed'])->name('jobs.feed');
    Route::get('/jobs/{job}', [JobHistoryController::class, 'show'])->name('jobs.show');

    Route::get('/listeners', [ListenerController::class, 'index'])->name('listeners.index');
    Route::patch('/listeners/{listener}/faults', [ListenerController::class, 'updateFaults'])->name('listeners.faults.update');
});
