<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    // Relasi ke project yang dimiliki user (sebagai owner)
    public function ownedProjects()
    {
        return $this->hasMany(\App\Models\Project::class, 'owner');
    }

    // Relasi ke project sebagai member
    public function projects()
    {
        return $this->belongsToMany(\App\Models\Project::class, 'project_user')
            ->withPivot('role')
            ->withTimestamps();
    }

    // Relasi ke task yang dibuat user
    public function tasks()
    {
        return $this->hasMany(\App\Models\Task::class, 'user_id');
    }

    // Relasi ke task yang di-assign ke user
    public function assignedTasks()
    {
        return $this->hasMany(\App\Models\Task::class, 'assignment_id');
    }

    // Scope untuk pencarian user (misal untuk datatable/filter)
    public function scopeSearch($query, $term)
    {
        $term = "%$term%";
        return $query->where(function($q) use ($term) {
            $q->where('name', 'like', $term)
              ->orWhere('email', 'like', $term);
        });
    }

    // Akses is_admin, bisa disesuaikan dengan field is_admin di database jika ada
    public function getIsAdminAttribute()
    {
        // Jika ada field is_admin di tabel users, gunakan: return (bool) $this->attributes['is_admin'];
        // Default: admin jika email admin@example.com
        return $this->email === 'admin@example.com';
    }
}
