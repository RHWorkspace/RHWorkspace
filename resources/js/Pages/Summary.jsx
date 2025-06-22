import { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';

function Card({ label, value, color }) {
  const colors = {
    green: 'bg-green-100 text-green-700',
    gray: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-100 text-blue-700',
    orange: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className={`w-48 p-4 rounded shadow ${colors[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium">{label}</div>
    </div>
  );
}

export default function Summary() {
  const { auth } = usePage().props;
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      axios.get('/users'),
      axios.get('/projects'),
      axios.get('/tasks'),
    ])
      .then(([usersRes, projectsRes, tasksRes]) => {
        setUsers(usersRes.data || []);
        setProjects(projectsRes.data || []);
        setTasks(tasksRes.data || []);
      })
      .catch(() => setError('Failed to load data.'))
      .finally(() => setLoading(false));
  }, []);

  // Summary untuk semua task
  const summary = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inprogress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  };

  // Semua member dengan jumlah task
  const memberTaskCount = users.map(user => ({
    ...user,
    totalTasks: tasks.filter(t => t.assignment_id === user.id).length,
  })).sort((a, b) => b.totalTasks - a.totalTasks);

  // Semua project dengan jumlah task + persentase selesai
  const projectTaskCount = projects.map(project => {
    const projectTasks = tasks.filter(t => t.project_id === project.id);
    const totalTasks = projectTasks.length;
    const doneTasks = projectTasks.filter(t => t.status === 'done').length;
    const percentDone = totalTasks > 0 ? ((doneTasks / totalTasks) * 100).toFixed(1) : '0.0';
    return {
      ...project,
      totalTasks,
      percentDone,
    };
  }).sort((a, b) => b.totalTasks - a.totalTasks);

  // Semua task, urutkan berdasarkan due_date terdekat
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date) - new Date(b.due_date);
  });

  // Timeline: urutkan semua task berdasarkan created_at (terbaru di atas)
  const timelineTasks = [...tasks]
    .filter(t => t.created_at)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10); // tampilkan 10 terbaru

  return (
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Summary</h2>}>
      <Head title="Summary" />

      <div className="bg-blue-50 min-h-screen py-6 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
          )}

          {/* Centered summary cards */}
          <div className="flex flex-wrap gap-4 mb-6 justify-center">
            <Card label="All Task" value={loading ? '...' : summary.all} color="gray" />
            <Card label="To Do" value={loading ? '...' : summary.todo} color="blue" />
            <Card label="In Progress" value={loading ? '...' : summary.inprogress} color="orange" />
            <Card label="Done" value={loading ? '...' : summary.done} color="green" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Semua Member dan Jumlah Task */}
            <div className="bg-white rounded shadow p-6">
              <h2 className="text-lg font-semibold mb-4">All Members & Task Count</h2>
              {loading ? (
                <div className="text-gray-400">Loading...</div>
              ) : (
                <ul className="space-y-3 text-sm max-h-64 overflow-y-auto">
                  {memberTaskCount.length === 0 && (
                    <li className="text-gray-400">No data.</li>
                  )}
                  {memberTaskCount.map((member) => (
                    <li key={member.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center font-bold text-base">
                        {member.name?.[0] || '?'}
                      </div>
                      <div>
                        <div className="font-semibold">{member.name}</div>
                        <div className="text-xs text-gray-500">{member.email}</div>
                      </div>
                      <div className="ml-auto font-bold text-blue-700">{member.totalTasks} task{member.totalTasks !== 1 ? 's' : ''}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Semua Project dan Jumlah Task + Persentase Selesai */}
            <div className="bg-white rounded shadow p-6">
              <h2 className="text-lg font-semibold mb-4">All Projects & Task Count</h2>
              {loading ? (
                <div className="text-gray-400">Loading...</div>
              ) : (
                <ul className="space-y-3 text-sm max-h-64 overflow-y-auto">
                  {projectTaskCount.length === 0 && (
                    <li className="text-gray-400">No data.</li>
                  )}
                  {projectTaskCount.map((project) => (
                    <li key={project.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-200 text-green-800 flex items-center justify-center font-bold text-base">
                        {project.name?.[0] || '?'}
                      </div>
                      <div>
                        <div className="font-semibold">{project.name}</div>
                        <div className="text-xs text-gray-500">{project.desc}</div>
                      </div>
                      <div className="ml-auto flex flex-col items-end">
                        <span className="font-bold text-green-700">{project.totalTasks} task{project.totalTasks !== 1 ? 's' : ''}</span>
                        <span className="text-xs text-gray-500">{project.percentDone}% completed</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded shadow p-6 mt-8">
            <h2 className="text-lg font-semibold mb-4">Timeline (Latest Tasks)</h2>
            {loading ? (
              <div className="text-gray-400">Loading...</div>
            ) : (
              <ul className="relative border-s-2 border-blue-200 pl-6 space-y-6">
                {timelineTasks.length === 0 && (
                  <li className="text-gray-400">No timeline data.</li>
                )}
                {timelineTasks.map((task) => (
                  <li key={task.id} className="relative">
                    <span className="absolute -left-3 top-1.5 w-3 h-3 bg-blue-400 rounded-full border-2 border-white"></span>
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <span className="font-semibold text-blue-800">{task.title}</span>
                      <span className="text-xs text-gray-500">
                        {task.created_at ? new Date(task.created_at).toLocaleString() : '-'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Project: {projects.find(p => p.id === task.project_id)?.name || '-'} | 
                      Assigned: {users.find(u => u.id === task.assignment_id)?.name || '-'} | 
                      Status: <span className={
                        task.status === 'done'
                          ? 'text-green-600'
                          : task.status === 'in_progress'
                          ? 'text-orange-600'
                          : 'text-blue-600'
                      }>
                        {task.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {/* Semua Task, urut due date */}
            <div className="bg-white rounded shadow p-6 col-span-2">
              <h2 className="text-lg font-semibold mb-4">All Tasks (by Due Date)</h2>
              {loading ? (
                <div className="text-gray-400">Loading...</div>
              ) : (
                <ul className="space-y-3 text-sm max-h-64 overflow-y-auto">
                  {sortedTasks.length === 0 && (
                    <li className="text-gray-400">No tasks.</li>
                  )}
                  {sortedTasks.map((task) => (
                    <li key={task.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-200 text-orange-800 flex items-center justify-center font-bold text-base">
                        {task.title?.[0] || '?'}
                      </div>
                      <div>
                        <div className="font-semibold">{task.title}</div>
                        <div className="text-xs text-gray-500">
                          Project: {projects.find(p => p.id === task.project_id)?.name || '-'}<br />
                          Assigned: {users.find(u => u.id === task.assignment_id)?.name || '-'}
                        </div>
                      </div>
                      <div className="ml-auto text-xs text-gray-700">
                        Due: {task.due_date || '-'}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
