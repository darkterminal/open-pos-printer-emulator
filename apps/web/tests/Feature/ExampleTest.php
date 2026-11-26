<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_home_redirects_to_jobs(): void
    {
        $response = $this->get('/');

        $response->assertRedirect(route('jobs.index'));
    }
}
