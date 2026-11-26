<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PrintJob extends Model
{
    use HasFactory;

    protected $fillable = [
        'listener_id',
        'external_id',
        'correlation_id',
        'source_ip',
        'source_port',
        'received_at',
        'completed_at',
        'size_bytes',
        'status',
        'warnings_count',
        'error_message',
        'render_model_json',
        'commands_json',
        'warnings_json',
        'checksum_sha256',
    ];

    protected function casts(): array
    {
        return [
            'received_at' => 'datetime',
            'completed_at' => 'datetime',
            'render_model_json' => 'array',
            'commands_json' => 'array',
            'warnings_json' => 'array',
        ];
    }

    public function listener(): BelongsTo
    {
        return $this->belongsTo(Listener::class);
    }

    public function rawPayload(): HasOne
    {
        return $this->hasOne(RawPayload::class);
    }
}
