<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class TaskController extends Controller
{
    use AuthorizesRequests;
    
    public function index()
    {
        // Tampilkan semua task, dengan relasi assignment, creator, parent, project, dan module
        return Task::with([
            'assignment:id,name,email',
            'creator:id,name,email',
            'parent:id,title',
            'project:id,name',
            'module:id,name,project_id' // Hapus desc
        ])->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date',
            'link_issue' => 'nullable|string|max:255',
            'priority' => 'nullable|in:low,medium,high',
            'completed_at' => 'nullable|date',
            'status' => 'nullable|string|max:50',
            'assignment_id' => 'nullable|exists:users,id',
            'parent_id' => 'nullable|exists:tasks,id',
            'project_id' => 'nullable|exists:projects,id',
            'module_id' => 'nullable|exists:project_modules,id', // validasi module_id
            'estimated_hours' => 'nullable|numeric|min:0',
        ]);

        $validated['created_by'] = Auth::id();

        return Task::create($validated)->load([
            'assignment:id,name,email',
            'creator:id,name,email',
            'parent:id,title',
            'project:id,name',
            'module:id,name,project_id' // Hapus desc
        ]);
    }

    public function update(Request $request, Task $task)
    {
        $this->authorize('update', $task);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date',
            'link_issue' => 'nullable|string|max:255',
            'priority' => 'nullable|in:low,medium,high',
            'completed_at' => 'nullable|date',
            'status' => 'nullable|string|max:50',
            'assignment_id' => 'nullable|exists:users,id',
            'parent_id' => 'nullable|exists:tasks,id',
            'project_id' => 'nullable|exists:projects,id',
            'module_id' => 'nullable|exists:project_modules,id', // validasi module_id
            'estimated_hours' => 'nullable|numeric|min:1',
        ]);

        $task->update($validated);

        return $task->load([
            'assignment:id,name,email',
            'creator:id,name,email',
            'parent:id,title',
            'project:id,name',
            'module:id,name,project_id' // Hapus desc
        ]);
    }

    public function destroy(Task $task)
    {
        $this->authorize('delete', $task);
        $task->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
