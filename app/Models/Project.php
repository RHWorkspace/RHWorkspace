<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = [
        'name',
        'desc',
        'owner',
    ];

    // Relasi ke tasks
    public function tasks()
    {
        return $this->hasMany(\App\Models\Task::class, 'project_id');
    }

    // Relasi ke owner (user)
    public function ownerUser()
    {
        return $this->belongsTo(\App\Models\User::class, 'owner');
    }

    // Relasi ke member (users)
    public function members()
    {
        return $this->belongsToMany(\App\Models\User::class, 'project_user')
            ->withPivot('role')
            ->withTimestamps();
    }

    // Cek apakah user adalah member project
    public function isMember($userId)
    {
        return $this->members()->where('user_id', $userId)->exists();
    }

    // Cek apakah user adalah owner project
    public function isOwner($userId)
    {
        return $this->owner === $userId;
    }
}
