<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    protected $fillable = [
        'created_by',
        'title',
        'description',
        'start_date',
        'due_date',
        'link_issue',
        'priority',
        'completed_at',
        'status',
        'assignment_id',
        'parent_id',
        'project_id',
        'estimated_hours',
        'module_id', // tambahkan kolom module_id
    ];

    protected $dates = [
        'start_date',
        'due_date',
        'completed_at',
        'created_at',
        'updated_at',
    ];

    // Relasi ke user yang membuat task
    public function creator()
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }

    // Relasi ke user yang di-assign
    public function assignment()
    {
        return $this->belongsTo(\App\Models\User::class, 'assignment_id');
    }

    // Relasi ke parent task
    public function parent()
    {
        return $this->belongsTo(Task::class, 'parent_id');
    }

    // Relasi ke child tasks
    public function children()
    {
        return $this->hasMany(Task::class, 'parent_id');
    }

    // Relasi ke project
    public function project()
    {
        return $this->belongsTo(\App\Models\Project::class, 'project_id');
    }

    // Relasi ke module (ProjectModule)
    public function module()
    {
        return $this->belongsTo(\App\Models\ProjectModule::class, 'module_id');
    }
}
