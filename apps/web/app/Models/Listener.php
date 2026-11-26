<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Listener extends Model
{
    use HasFactory;

    protected $fillable = [
        'external_id',
        'user_id',
        'name',
        'host',
        'port',
        'printer_profile_id',
        'status',
        'fault_config_json',
        'last_heartbeat_at',
        'last_error',
    ];

    protected function casts(): array
    {
        return [
            'fault_config_json' => 'array',
            'last_heartbeat_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function printerProfile(): BelongsTo
    {
        return $this->belongsTo(PrinterProfile::class);
    }

    public function printJobs(): HasMany
    {
        return $this->hasMany(PrintJob::class);
    }
}
