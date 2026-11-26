<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'sidecar' => [
        'shared_token' => env('SIDECAR_SHARED_TOKEN'),
        'internal_url' => env('SIDECAR_INTERNAL_URL', 'http://sidecar:3001'),
        'max_payload_bytes' => (int) env('SIDECAR_MAX_PAYLOAD_BYTES', 1048576),
    ],

    'print_jobs' => [
        'retention_days' => (int) env('PRINT_JOBS_RETENTION_DAYS', 30),
    ],

];
