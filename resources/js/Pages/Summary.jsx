import { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import { FaUserFriends, FaProjectDiagram, FaTasks, FaDownload, FaFilter } from 'react-icons/fa';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [memberFilter, setMemberFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

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
    inprogress: tasks.filter(t => t.status === 'in_progress').length, // konsisten
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
  }).filter(task => 
    !searchQuery || task.title?.toLowerCase().includes(searchQuery.toLowerCase())
  ); // filter by search

  // Timeline: urutkan semua task berdasarkan created_at (terbaru di atas)
  const timelineTasks = [...tasks]
    .filter(t => t.created_at)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);

  // Statistik tambahan
  const totalMembers = users.length;
  const totalProjects = projects.length;
  const avgTaskPerMember = totalMembers ? (tasks.length / totalMembers).toFixed(1) : 0;
  const avgTaskPerProject = totalProjects ? (tasks.length / totalProjects).toFixed(1) : 0;

  // Fungsi export CSV sederhana
  const exportCSV = () => {
    const header = 'Task,Project,Assigned,Status,Due Date\n';
    const rows = tasks.map(t =>
      [
        `"${t.title}"`,
        `"${projects.find(p => p.id === t.project_id)?.name || '-'}"`,
        `"${users.find(u => u.id === t.assignment_id)?.name || '-'}"`,
        `"${t.status}"`,
        `"${t.due_date || '-'}"`
      ].join(',')
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks-summary.csv';
    document.body.appendChild(a); // Tambah ini
    a.click();
    document.body.removeChild(a); // Tambah ini
    URL.revokeObjectURL(url);
  };

  // Summary task per member (by status & project)
  const memberTaskSummary = users.map(user => {
    // Pastikan projectFilter bertipe number jika ada
    const projectId = projectFilter ? Number(projectFilter) : null;
    const userTasks = tasks.filter(
      t => t.assignment_id === user.id && (!projectId || t.project_id === projectId)
    );
    return {
      ...user,
      total: userTasks.length,
      todo: userTasks.filter(t => t.status === 'todo').length,
      inprogress: userTasks.filter(t => t.status === 'in_progress').length,
      done: userTasks.filter(t => t.status === 'done').length,
    };
  })
  // Urutkan berdasarkan nama A-Z
  .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // Filtered memberTaskSummary
  const filteredMemberTaskSummary = memberTaskSummary.filter(member => {
    const matchName = !memberFilter || member.name?.toLowerCase().includes(memberFilter.toLowerCase());
    const matchStatus =
      !statusFilter ||
      (statusFilter === 'todo' && member.todo > 0) ||
      (statusFilter === 'in_progress' && member.inprogress > 0) ||
      (statusFilter === 'done' && member.done > 0);
    return matchName && matchStatus;
  });

  return (
    <AuthenticatedLayout header={
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold leading-tight text-gray-800">Summary</h2>
        <span className="ml-2 px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-bold">Dashboard</span>
      </div>
    }>
      <Head title="Summary" />

      <div className="bg-gradient-to-br from-blue-50 to-blue-100 min-h-screen py-6 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Greeting */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-blue-900">Hi, {auth?.user?.name || 'User'} 👋</h1>
              <p className="text-gray-600">Here’s your project & task summary at a glance.</p>
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
              title="Export tasks to CSV"
            >
              <FaDownload /> Export CSV
            </button>
          </div>

          {/* Statistik Ringkas */}
          <div className="flex flex-wrap gap-4 mb-6 justify-center">
            <div className="flex items-center gap-2 bg-white rounded shadow px-4 py-2">
              <FaUserFriends className="text-blue-500" />
              <span className="font-bold">{users.length}</span> Members
            </div>
            <div className="flex items-center gap-2 bg-white rounded shadow px-4 py-2">
              <FaProjectDiagram className="text-green-500" />
              <span className="font-bold">{projects.length}</span> Projects
            </div>
            <div className="flex items-center gap-2 bg-white rounded shadow px-4 py-2">
              <FaTasks className="text-orange-500" />
              <span className="font-bold">{avgTaskPerMember}</span> Avg Task/Member
            </div>
            <div className="flex items-center gap-2 bg-white rounded shadow px-4 py-2">
              <FaTasks className="text-purple-500" />
              <span className="font-bold">{avgTaskPerProject}</span> Avg Task/Project
            </div>
          </div>

          {/* Summary Cards */}
          <div className="flex flex-wrap gap-4 mb-6 justify-center">
            <Card label="All Task" value={loading ? '...' : summary.all} color="gray" />
            <Card label="To Do" value={loading ? '...' : summary.todo} color="blue" />
            <Card label="In Progress" value={loading ? '...' : summary.inprogress} color="orange" />
            <Card label="Done" value={loading ? '...' : summary.done} color="green" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Semua Member dan Jumlah Task */}
            <div className="bg-white rounded-xl shadow p-6 border border-blue-100">
              <h2 className="text-lg font-semibold mb-4 text-blue-800">All Members & Task Count</h2>
              {loading ? (
                <div className="text-gray-400">Loading...</div>
              ) : (
                <ul className="space-y-3 text-sm max-h-64 overflow-y-auto">
                  {memberTaskCount.length === 0 && (
                    <li className="text-gray-400">No data.</li>
                  )}
                  {memberTaskCount.map((member) => (
                    <li key={member.id} className="flex items-center gap-3 hover:bg-blue-50 rounded px-2 py-1 transition">
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
            <div className="bg-white rounded-xl shadow p-6 border border-green-100">
              <h2 className="text-lg font-semibold mb-4 text-green-800">All Projects & Task Count</h2>
              {loading ? (
                <div className="text-gray-400">Loading...</div>
              ) : (
                <ul className="space-y-3 text-sm max-h-64 overflow-y-auto">
                  {projectTaskCount.length === 0 && (
                    <li className="text-gray-400">No data.</li>
                  )}
                  {projectTaskCount.map((project) => (
                    <li key={project.id} className="flex items-center gap-3 hover:bg-green-50 rounded px-2 py-1 transition">
                      <div className="w-8 h-8 rounded-full bg-green-200 text-green-800 flex items-center justify-center font-bold text-base">
                        {project.name?.[0] || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{project.name}</div>
                        <div className="text-xs text-gray-500">{project.desc}</div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-green-400 h-2 rounded-full"
                            style={{ width: `${project.percentDone}%` }}
                          ></div>
                        </div>
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

          {/* --- Summary Task per Member Table --- */}
          <div className="bg-white rounded-xl shadow p-6 mt-8 border border-blue-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
              <h2 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                <FaFilter className="text-blue-400" /> Task Summary per Member
              </h2>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Filter by member name..."
                  className="border rounded px-2 py-1 w-48"
                  value={memberFilter}
                  onChange={e => setMemberFilter(e.target.value)}
                />
                <select
                  className="border rounded px-2 py-1"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                <select
                  className="border rounded px-2 py-1"
                  value={projectFilter}
                  onChange={e => setProjectFilter(e.target.value)}
                >
                  <option value="">All Projects</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-blue-100">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-blue-100 text-blue-800">
                    <th className="px-3 py-2 border">#</th>
                    <th className="px-3 py-2 border text-left">Member</th>
                    <th className="px-3 py-2 border">Total</th>
                    <th className="px-3 py-2 border text-blue-700">To Do</th>
                    <th className="px-3 py-2 border text-orange-700">In Progress</th>
                    <th className="px-3 py-2 border text-green-700">Done</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMemberTaskSummary.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-gray-400 py-4">No data.</td>
                    </tr>
                  )}
                  {filteredMemberTaskSummary.map((member, idx) => (
                    <tr key={member.id} className="hover:bg-blue-50 transition">
                      <td className="px-3 py-2 border text-center">{idx + 1}</td>
                      <td className="px-3 py-2 border">
                        <div className="font-semibold">{member.name}</div>
                        <div className="text-xs text-gray-500">{member.email}</div>
                      </td>
                      <td className="px-3 py-2 border text-center">{member.total}</td>
                      <td className="px-3 py-2 border text-center text-blue-700">{member.todo}</td>
                      <td className="px-3 py-2 border text-center text-orange-700">{member.inprogress}</td>
                      <td className="px-3 py-2 border text-center text-green-700">{member.done}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl shadow p-6 mt-8 border border-blue-100">
            <h2 className="text-lg font-semibold mb-4 text-blue-800">Timeline (Latest Tasks)</h2>
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

          {/* Filter/Search Task */}
          <div className="flex items-center gap-2 mt-8 mb-2">
            <input
              type="text"
              placeholder="Search task title..."
              className="border rounded px-2 py-1 w-60"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <span className="text-xs text-gray-500">Type to filter tasks</span>
          </div>

          {/* Semua Task, urut due date, highlight overdue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            <div className="bg-white rounded-xl shadow p-6 col-span-2 border border-orange-100">
              <h2 className="text-lg font-semibold mb-4 text-orange-800">All Tasks (by Due Date)</h2>
              {loading ? (
                <div className="text-gray-400">Loading...</div>
              ) : (
                <ul className="space-y-3 text-sm max-h-64 overflow-y-auto">
                  {sortedTasks.length === 0 && (
                    <li className="text-gray-400">No tasks.</li>
                  )}
                  {sortedTasks.map((task) => {
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
                    return (
                      <li key={task.id} className={`flex items-center gap-3 ${isOverdue ? 'bg-red-50' : ''} rounded px-2 py-1`}>
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
                        <div className={`ml-auto text-xs ${isOverdue ? 'text-red-700 font-bold' : 'text-gray-700'}`}>
                          Due: {task.due_date || '-'}
                          {isOverdue && <span className="ml-2 text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded">Overdue</span>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
