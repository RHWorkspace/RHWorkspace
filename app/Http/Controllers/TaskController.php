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
        // Tampilkan semua task, dengan relasi assignment (user yang di-assign), creator (pembuat), parent, dan project
        return Task::with([
            'assignment:id,name,email',
            'creator:id,name,email',
            'parent:id,title',
            'project:id,name'
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
            'estimated_hours' => 'nullable|numeric|min:0', // tambahkan validasi estimated_hours
        ]);

        $validated['created_by'] = Auth::id(); // ganti user_id menjadi created_by

        return Task::create($validated)->load([
            'assignment:id,name,email',
            'creator:id,name,email',
            'parent:id,title',
            'project:id,name'
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
            'estimated_hours' => 'nullable|numeric|min:1', // tambahkan validasi estimated_hours
        ]);

        $task->update($validated);

        return $task->load([
            'assignment:id,name,email',
            'creator:id,name,email',
            'parent:id,title',
            'project:id,name'
        ]);
    }

    public function destroy(Task $task)
    {
        $this->authorize('delete', $task);
        $task->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
