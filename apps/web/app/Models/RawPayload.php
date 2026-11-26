<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RawPayload extends Model
{
    use HasFactory;

    protected $fillable = [
        'print_job_id',
        'storage_disk',
        'content_base64',
        'content_sha256',
    ];

    public function printJob(): BelongsTo
    {
        return $this->belongsTo(PrintJob::class);
    }
}
