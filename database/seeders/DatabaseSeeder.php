<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => Hash::make('admin123'),
        ]);

        // Tambahkan 10 random user
        $members = [];
        for ($i = 1; $i <= 10; $i++) {
            $members[] = User::create([
                'name' => 'Member ' . $i,
                'email' => 'member' . $i . '@example.com',
                'password' => Hash::make('password'),
            ]);
        }

        // Tambahkan 1 data project
        $project = Project::create([
            'name' => 'Sample Project',
            'desc' => 'Ini adalah project contoh.',
            'owner' => $admin->id,
        ]);

        // Attach 10 random user sebagai member project
        $project->members()->attach(
            collect($members)->pluck('id')->toArray(),
            ['role' => 'member'
        ]);

        // Tambahkan beberapa data task contoh dengan estimated_hours
        Task::create([
            'title' => 'Setup Project',
            'description' => 'Inisialisasi repository dan struktur folder.',
            'start_date' => now()->subDays(3)->toDateString(),
            'due_date' => now()->addDays(2)->toDateString(),
            'priority' => 'high',
            'status' => 'in_progress',
            'created_by' => $admin->id,
            'assignment_id' => $members[0]->id,
            'project_id' => $project->id,
            'estimated_hours' => 6,
        ]);

        Task::create([
            'title' => 'Buat Halaman Login',
            'description' => 'Implementasi halaman login dan autentikasi.',
            'start_date' => now()->subDays(2)->toDateString(),
            'due_date' => now()->addDays(5)->toDateString(),
            'priority' => 'medium',
            'status' => 'todo',
            'created_by' => $admin->id,
            'assignment_id' => $members[1]->id,
            'project_id' => $project->id,
            'estimated_hours' => 4,
        ]);

        Task::create([
            'title' => 'Tulis Dokumentasi',
            'description' => 'Buat dokumentasi penggunaan aplikasi.',
            'start_date' => now()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
            'priority' => 'low',
            'status' => 'todo',
            'created_by' => $members[0]->id,
            'assignment_id' => $members[2]->id,
            'project_id' => $project->id,
            'estimated_hours' => 2.5,
        ]);
    }
}
