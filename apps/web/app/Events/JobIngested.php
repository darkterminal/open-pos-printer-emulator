<?php

namespace App\Events;

use App\Models\PrintJob;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class JobIngested implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public PrintJob $job) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [new Channel('jobs')];
    }

    public function broadcastAs(): string
    {
        return 'job.ingested';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $job = $this->job->loadMissing('listener:id,name,external_id');

        return [
            'id' => $job->id,
            'external_id' => $job->external_id,
            'status' => $job->status,
            'listener_id' => $job->listener_id,
            'listener' => $job->listener?->only(['name', 'external_id']),
            'source_ip' => $job->source_ip,
            'source_port' => $job->source_port,
            'size_bytes' => $job->size_bytes,
            'warnings_count' => $job->warnings_count,
            'correlation_id' => $job->correlation_id,
            'received_at' => optional($job->received_at)->toIso8601String(),
            'render_model' => $job->render_model_json ?? ['width_dots' => 576, 'lines' => [], 'actions' => []],
        ];
    }
}
