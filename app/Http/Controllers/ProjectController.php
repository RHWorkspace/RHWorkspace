<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\User;
use App\Models\ProjectModule;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // Tambahkan relasi ownerUser dan members agar data lengkap
        return Project::with([
            'ownerUser:id,name,email',
            'members:id,name,email',
            'modules'
        ])->get();
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'desc' => 'nullable|string',
            'owner' => 'nullable|exists:users,id',
        ]);
        $project = Project::create($validated);
        return $project->load(['ownerUser:id,name,email', 'members:id,name,email', 'modules']);
    }

    /**
     * Display the specified resource.
     */
    public function show(Project $project)
    {
        return $project->load(['ownerUser:id,name,email', 'members:id,name,email', 'modules']);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Project $project)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Project $project)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'desc' => 'nullable|string',
            'owner' => 'nullable|exists:users,id',
        ]);
        $project->update($validated);
        return $project->load(['ownerUser:id,name,email', 'members:id,name,email', 'modules']);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Project $project)
    {
        $project->delete();
        return response()->json(['message' => 'Project deleted successfully.']);
    }

    /**
     * Add a member to the project.
     */
    public function addMember(Request $request, Project $project)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role' => 'nullable|string|max:50',
        ]);
        if (!$project->members()->where('user_id', $validated['user_id'])->exists()) {
            $project->members()->attach($validated['user_id'], [
                'role' => $validated['role'] ?? 'member'
            ]);
        }
        return $project->load(['ownerUser:id,name,email', 'members:id,name,email', 'modules']);
    }

    /**
     * Remove a member from the project.
     */
    public function removeMember(Project $project, User $user)
    {
        $project->members()->detach($user->id);
        return $project->load(['ownerUser:id,name,email', 'members:id,name,email', 'modules']);
    }

    /**
     * Update a member's role in the project.
     */
    public function updateMember(Request $request, Project $project, User $user)
    {
        $validated = $request->validate([
            'role' => 'required|string|in:admin,member,viewer,developer,reporter,qa',
        ]);

        $project->members()->updateExistingPivot($user->id, [
            'role' => $validated['role'],
        ]);

        return $project->load(['ownerUser:id,name,email', 'members:id,name,email', 'modules']);
    }

    /**
     * Add a module to the project.
     */
    public function addModule(Request $request, Project $project)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'desc' => 'nullable|string',
        ]);

        $module = $project->modules()->create($validated);

        // Kembalikan project dengan relasi lengkap agar frontend langsung update
        return response()->json([
            'message' => 'Module added successfully.',
            'module' => $module,
            'project' => $project->load(['ownerUser:id,name,email', 'members:id,name,email', 'modules'])
        ]);
    }

    /**
     * Update a module in the project.
     */
    public function updateModule(Request $request, Project $project, ProjectModule $module)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);
        $module->update($validated);
        return response()->json(['message' => 'Module updated']);
    }

    /**
     * Delete a module from the project.
     */
    public function deleteModule(Project $project, ProjectModule $module)
    {
        $module->delete();
        return response()->json(['message' => 'Module deleted']);
    }
}
