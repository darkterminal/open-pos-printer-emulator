<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PrinterProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'is_builtin',
        'printer_model',
        'paper_width_mm',
        'dpi',
        'chars_per_line',
        'code_page',
        'image_max_width_dots',
        'image_max_bytes',
        'settings_json',
    ];

    protected function casts(): array
    {
        return [
            'is_builtin' => 'boolean',
            'settings_json' => 'array',
        ];
    }

    public function listeners(): HasMany
    {
        return $this->hasMany(Listener::class);
    }
}
