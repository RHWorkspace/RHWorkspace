<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\UserController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        //'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Halaman Task (Inertia)
    Route::get('/tasks-page', function () {
        return Inertia::render('Task');
    })->name('tasks.page');

    // Halaman Project (Inertia)
    Route::get('/projects-page', function () {
        return Inertia::render('Projects');
    })->name('projects.page');

    // Halaman User (Inertia)
    Route::get('/users-page', function () {
        return Inertia::render('Users');
    })->name('users.page');

    // Halaman Summary (Inertia)
    Route::get('/summary-page', function () {
        return Inertia::render('Summary');
    })->name('summary.page');

    // Halaman Summary (Inertia)
    Route::get('/timeline-page', function () {
        return Inertia::render('Timeline');
    })->name('timeline.page');

    // RESTful route untuk Task (API style)
    Route::get('/tasks', [TaskController::class, 'index']);
    Route::post('/tasks', [TaskController::class, 'store']);
    Route::put('/tasks/{task}', [TaskController::class, 'update']);
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);

    // RESTful route untuk Project (API style)
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects/{project}', [ProjectController::class, 'show']);
    Route::put('/projects/{project}', [ProjectController::class, 'update']);
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);

    // RESTful route untuk User (API style)
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::get('/users/{user}', [UserController::class, 'show']);
    Route::put('/users/{user}', [UserController::class, 'update']);
    Route::delete('/users/{user}', [UserController::class, 'destroy']);

    // Tambahkan endpoint untuk manajemen member project
    Route::post('/projects/{project}/members', [ProjectController::class, 'addMember']);
    Route::delete('/projects/{project}/members/{user}', [ProjectController::class, 'removeMember']);
    Route::put('/projects/{project}/members/{user}', [ProjectController::class, 'updateMember']);
});

require __DIR__.'/auth.php';
