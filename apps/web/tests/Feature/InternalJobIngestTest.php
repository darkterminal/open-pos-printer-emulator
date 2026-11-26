<?php

namespace Tests\Feature;

use App\Models\Listener;
use App\Models\PrinterProfile;
use App\Models\PrintJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InternalJobIngestTest extends TestCase
{
    use RefreshDatabase;

    private function seedListener(): Listener
    {
        $user = User::factory()->create();
        $profile = PrinterProfile::query()->create([
            'user_id' => null,
            'name' => 'Generic ESC/POS',
            'is_builtin' => true,
            'printer_model' => 'generic-escpos',
            'paper_width_mm' => 80,
            'dpi' => 203,
            'chars_per_line' => 48,
            'code_page' => 'CP437',
            'image_max_width_dots' => 576,
            'image_max_bytes' => 1048576,
        ]);

        return Listener::query()->create([
            'external_id' => 'lst_default_9100',
            'user_id' => $user->id,
            'name' => 'Default 9100',
            'host' => '0.0.0.0',
            'port' => 9100,
            'printer_profile_id' => $profile->id,
            'status' => 'stopped',
            'fault_config_json' => [],
        ]);
    }

    private function payload(string $externalId = 'job_test_1'): array
    {
        $raw = base64_encode("\x1b@Hello\n");

        return [
            'schema_version' => '1.0',
            'correlation_id' => '01TESTCORRID0000000000000',
            'external_id' => $externalId,
            'listener_external_id' => 'lst_default_9100',
            'received_at' => '2026-11-26T13:00:00Z',
            'completed_at' => '2026-11-26T13:00:01Z',
            'source' => ['ip' => '127.0.0.1', 'port' => 12345],
            'connection' => ['status' => 'closed_by_client', 'bytes_received' => 8],
            'raw' => [
                'encoding' => 'base64',
                'data' => $raw,
                'sha256' => hash('sha256', base64_decode($raw)),
            ],
            'parse' => [
                'status' => 'partial',
                'profile' => 'generic-escpos',
                'warnings' => ['idle_timeout_finalize'],
                'commands' => [
                    ['offset' => 0, 'hex' => '1b 40', 'name' => 'ESC_@'],
                ],
                'render_model' => [
                    'width_dots' => 576,
                    'lines' => [
                        [
                            'text' => '',
                            'align' => 'left',
                            'bold' => false,
                            'underline' => false,
                            'width' => 1,
                            'height' => 1,
                        ],
                        [
                            'text' => 'Coffee        15000',
                            'align' => 'left',
                            'bold' => false,
                            'underline' => false,
                            'width' => 1,
                            'height' => 1,
                        ],
                    ],
                    'actions' => [],
                ],
            ],
        ];
    }

    public function test_rejects_invalid_token(): void
    {
        $this->seedListener();
        config(['services.sidecar.shared_token' => 'secret']);

        $response = $this->postJson('/api/internal/v1/jobs', $this->payload(), [
            'X-Sidecar-Token' => 'wrong',
        ]);

        $response->assertStatus(401)->assertJsonPath('error.code', 'UNAUTHORIZED');
        $this->assertDatabaseCount('print_jobs', 0);
    }

    public function test_rejects_missing_token(): void
    {
        $this->seedListener();
        config(['services.sidecar.shared_token' => 'secret']);

        $response = $this->postJson('/api/internal/v1/jobs', $this->payload());

        $response->assertStatus(401)->assertJsonPath('error.code', 'UNAUTHORIZED');
        $this->assertDatabaseCount('print_jobs', 0);
    }

    public function test_ingests_job_and_is_idempotent(): void
    {
        $this->seedListener();
        config(['services.sidecar.shared_token' => 'secret']);
        $payload = $this->payload('job_idem_1');

        $first = $this->postJson('/api/internal/v1/jobs', $payload, [
            'X-Sidecar-Token' => 'secret',
        ]);
        $first->assertStatus(201)->assertJsonPath('data.duplicate', false);

        $second = $this->postJson('/api/internal/v1/jobs', $payload, [
            'X-Sidecar-Token' => 'secret',
        ]);
        $second->assertStatus(200)->assertJsonPath('data.duplicate', true);

        $this->assertDatabaseCount('print_jobs', 1);
        $this->assertDatabaseCount('raw_payloads', 1);
        $job = PrintJob::query()->firstOrFail();
        $this->assertSame('partial', $job->status);
        $this->assertSame(1, $job->warnings_count);
        $this->assertSame('ESC_@', $job->commands_json[0]['name']);
        $this->assertSame('', $job->render_model_json['lines'][0]['text']);
        $this->assertSame('Coffee        15000', $job->render_model_json['lines'][1]['text']);
    }

    public function test_rejects_unknown_listener(): void
    {
        config(['services.sidecar.shared_token' => 'secret']);
        $payload = $this->payload('job_unknown_listener');
        $payload['listener_external_id'] = 'lst_missing';

        $response = $this->postJson('/api/internal/v1/jobs', $payload, [
            'X-Sidecar-Token' => 'secret',
        ]);

        $response->assertStatus(404)->assertJsonPath('error.code', 'LISTENER_NOT_FOUND');
        $this->assertDatabaseCount('print_jobs', 0);
    }

    public function test_rejects_invalid_payload(): void
    {
        $this->seedListener();
        config(['services.sidecar.shared_token' => 'secret']);
        $payload = $this->payload('job_invalid');
        unset($payload['raw']['data']);

        $response = $this->postJson('/api/internal/v1/jobs', $payload, [
            'X-Sidecar-Token' => 'secret',
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseCount('print_jobs', 0);
    }

    public function test_rejects_sha_mismatch(): void
    {
        $this->seedListener();
        config(['services.sidecar.shared_token' => 'secret']);
        $payload = $this->payload('job_sha_mismatch');
        $payload['raw']['sha256'] = str_repeat('a', 64);

        $response = $this->postJson('/api/internal/v1/jobs', $payload, [
            'X-Sidecar-Token' => 'secret',
        ]);

        $response->assertStatus(422)->assertJsonPath('error.message', 'Raw payload sha256 mismatch');
        $this->assertDatabaseCount('print_jobs', 0);
    }

    public function test_rejects_oversized_payload(): void
    {
        $this->seedListener();
        config([
            'services.sidecar.shared_token' => 'secret',
            'services.sidecar.max_payload_bytes' => 4,
        ]);
        $payload = $this->payload('job_too_large');
        $payload['connection']['bytes_received'] = 4;

        $response = $this->postJson('/api/internal/v1/jobs', $payload, [
            'X-Sidecar-Token' => 'secret',
        ]);

        $response->assertStatus(413)->assertJsonPath('error.code', 'PAYLOAD_TOO_LARGE');
        $this->assertDatabaseCount('print_jobs', 0);
    }

    public function test_stores_raw_payload_even_when_parse_error(): void
    {
        $this->seedListener();
        config(['services.sidecar.shared_token' => 'secret']);
        $payload = $this->payload('job_parse_error');
        $payload['parse']['status'] = 'parse_error';
        $payload['parse']['warnings'] = ['unknown_command'];

        $response = $this->postJson('/api/internal/v1/jobs', $payload, [
            'X-Sidecar-Token' => 'secret',
        ]);

        $response->assertStatus(201)->assertJsonPath('data.status', 'parse_error');
        $this->assertDatabaseCount('print_jobs', 1);
        $this->assertDatabaseCount('raw_payloads', 1);
        $job = PrintJob::query()->firstOrFail();
        $this->assertSame('parse_error', $job->status);
        $this->assertNotNull($job->rawPayload);
    }
}
