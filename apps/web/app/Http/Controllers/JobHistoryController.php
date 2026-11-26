<?php

namespace App\Http\Controllers;

use App\Models\PrintJob;
use Illuminate\View\View;

class JobHistoryController extends Controller
{
    public function index(): View
    {
        $jobs = PrintJob::query()
            ->with('listener')
            ->latest('received_at')
            ->limit(100)
            ->get();

        return view('jobs.index', [
            'jobs' => $jobs,
        ]);
    }
}
