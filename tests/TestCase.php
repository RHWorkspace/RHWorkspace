<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;
    use RefreshDatabase;
    use WithFaker;

    /**
     * Set up the test environment.
     */
    protected function setUp(): void
    {
        parent::setUp();

        // Set default headers for JSON API requests
        $this->withHeaders(['Accept' => 'application/json']);
    }

    /**
     * Helper to act as a user.
     */
    protected function actingAsUser($user = null, $driver = null)
    {
        $user = $user ?: \App\Models\User::factory()->create();
        $this->actingAs($user, $driver);

        return $user;
    }

    /**
     * Helper to create a user.
     */
    protected function createUser(array $attributes = [])
    {
        return \App\Models\User::factory()->create($attributes);
    }

    /**
     * Helper to create a project.
     */
    protected function createProject(array $attributes = [])
    {
        return \App\Models\Project::factory()->create($attributes);
    }

    /**
     * Helper to create a task.
     */
    protected function createTask(array $attributes = [])
    {
        return \App\Models\Task::factory()->create($attributes);
    }
}
