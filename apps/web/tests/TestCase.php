<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Tests must not depend on built frontend assets (CI has no Vite manifest).
        $this->withoutVite();

        // Safety net: never let the test suite wipe a real database.
        if (app()->environment('testing')) {
            $connection = config('database.default');
            $database = config("database.connections.{$connection}.database");

            if ($connection !== 'sqlite' || $database !== ':memory:') {
                $this->fail(sprintf(
                    'Refusing to run tests against %s/%s. Tests must use sqlite :memory: (check phpunit.xml force flags).',
                    $connection,
                    $database,
                ));
            }
        }
    }
}
