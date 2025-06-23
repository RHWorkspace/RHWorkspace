import { useEffect, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import { FaUserFriends, FaProjectDiagram, FaTasks, FaDownload, FaFilter } from 'react-icons/fa';

function Card({ label, value, color, icon }) {
  const colors = {
    green: 'from-emerald-100 to-emerald-200 text-emerald-700 border-emerald-200',
    gray: 'from-gray-100 to-gray-200 text-gray-700 border-gray-200',
    blue: 'from-cyan-100 to-blue-200 text-cyan-700 border-cyan-200',
    orange: 'from-orange-100 to-orange-200 text-orange-700 border-orange-200',
  };

  return (
    <div
      className={`
        flex-1 min-w-[180px] max-w-xs h-32 flex flex-col items-center justify-center
        rounded-2xl border shadow-md
        bg-gradient-to-br ${colors[color]}
        transition-all duration-300
        hover:shadow-2xl hover:-translate-y-2 hover:border-blue-400
        cursor-pointer group
      `}
    >
      {icon && (
        <div className="mb-1 text-3xl opacity-60 group-hover:scale-110 group-hover:opacity-80 transition-all duration-300">
          {icon}
        </div>
      )}
      <div className="text-4xl font-extrabold mb-1 group-hover:text-blue-700 transition">{value}</div>
      <div className="text-base font-semibold tracking-wide text-center">{label}</div>
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
    const total = tasks.filter(t => t.assignment_id === user.id).length;
    const todo = tasks.filter(t => t.assignment_id === user.id && t.status === 'todo').length;
    const inprogress = tasks.filter(t => t.assignment_id === user.id && t.status === 'in_progress').length;
    const done = tasks.filter(t => t.assignment_id === user.id && t.status === 'done').length;
    return {
      ...user,
      total,
      todo,
      inprogress,
      done,
      is_available: inprogress === 0, // available jika tidak ada task in progress
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
    const matchProject =
      !projectFilter ||
      tasks.some(
        t => t.assignment_id === member.id && String(t.project_id) === String(projectFilter)
      );
    return matchName && matchStatus && matchProject;
  });

  // Tambahkan fungsi untuk membuat recent actions
  const recentActions = [
    ...tasks.map(task => ({
      type: 'task',
      action: 'Added Task',
      title: task.title,
      user: users.find(u => u.id === task.assignment_id)?.name || '-',
      project: projects.find(p => p.id === task.project_id)?.name || '-',
      date: task.created_at,
      status: task.status,
      id: `task-${task.id}`,
    })),
    ...projects.map(project => ({
      type: 'project',
      action: 'Added Project',
      title: project.name,
      user: users.find(u => u.id === project.created_by)?.name || '-',
      project: project.name,
      date: project.created_at,
      id: `project-${project.id}`,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

  return (
    <AuthenticatedLayout header={
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold leading-tight text-gray-800">Summary</h2>
        <span className="ml-2 px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-bold">Dashboard</span>
      </div>
    }>
      <Head title="Summary" />

      <div className="bg-gradient-to-br from-blue-50 to-blue-100 min-h-screen py-8 px-2 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-8">

          {/* Greeting & Export */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-blue-900">Hi, {auth?.user?.name || 'User'} 👋</h1>
              <p className="text-gray-600">Here’s your project & task summary at a glance.</p>
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-300"
              title="Export tasks to CSV"
            >
              <FaDownload /> Export CSV
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <Card label="All Task" value={loading ? '...' : summary.all} color="gray" icon={<FaTasks />} />
            <Card label="To Do" value={loading ? '...' : summary.todo} color="blue" icon={<FaTasks />} />
            <Card label="In Progress" value={loading ? '...' : summary.inprogress} color="orange" icon={<FaTasks />} />
            <Card label="Done" value={loading ? '...' : summary.done} color="green" icon={<FaTasks />} />
          </div>

          {/* Statistik Ringkas */}
          <div className="flex flex-wrap gap-4 justify-center">
            <div className="flex items-center gap-2 bg-white rounded-lg shadow px-4 py-2 border border-blue-100">
              <FaUserFriends className="text-blue-500" />
              <span className="font-bold">{users.length}</span> Members
            </div>
            <div className="flex items-center gap-2 bg-white rounded-lg shadow px-4 py-2 border border-green-100">
              <FaProjectDiagram className="text-green-500" />
              <span className="font-bold">{projects.length}</span> Projects
            </div>
            <div className="flex items-center gap-2 bg-white rounded-lg shadow px-4 py-2 border border-orange-100">
              <FaTasks className="text-orange-500" />
              <span className="font-bold">{avgTaskPerMember}</span> Avg Task/Member
            </div>
            <div className="flex items-center gap-2 bg-white rounded-lg shadow px-4 py-2 border border-purple-100">
              <FaTasks className="text-purple-500" />
              <span className="font-bold">{avgTaskPerProject}</span> Avg Task/Project
            </div>
          </div>

          {/* 3 Kolom: Member, Project, Recent Actions */}
          <div className="flex flex-col md:flex-row gap-6 mt-8">
            {/* All Members & Task Count */}
            <div className="bg-white rounded-xl shadow p-6 flex-1 min-w-0 border border-blue-100">
              <h2 className="text-lg font-semibold mb-4 text-blue-800 flex items-center gap-2">
                <FaUserFriends className="text-blue-400" /> Members
              </h2>
              <ul className="space-y-3 text-sm max-h-64 overflow-y-auto">
                {memberTaskCount.length === 0 && (
                  <li className="text-gray-400">No members.</li>
                )}
                {memberTaskCount.map(member => {
                  const summary = memberTaskSummary.find(m => m.id === member.id);
                  const percentDone = summary && summary.total > 0 ? Math.round((summary.done / summary.total) * 100) : 0;
                  return (
                    <li key={member.id} className="flex flex-col gap-1 p-2 rounded-lg hover:bg-blue-50 transition">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{member.name}</span>
                        <span className="font-bold">{member.totalTasks} tasks</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold border
                          ${summary?.is_available
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-rose-100 text-rose-700 border-rose-200'}
                        `}>
                          {summary?.is_available ? 'Available' : 'Busy'}
                        </span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden mx-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300
                              ${percentDone === 100 ? 'bg-emerald-400' : 'bg-blue-400'}
                            `}
                            style={{ width: `${percentDone}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{percentDone}%</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* All Projects & Task Count */}
            <div className="bg-white rounded-xl shadow p-6 flex-1 min-w-0 border border-green-100">
              <h2 className="text-lg font-semibold mb-4 text-green-800 flex items-center gap-2">
                <FaProjectDiagram className="text-green-400" /> Projects
              </h2>
              <ul className="space-y-3 text-sm max-h-64 overflow-y-auto">
                {projectTaskCount.length === 0 && (
                  <li className="text-gray-400">No projects.</li>
                )}
                {projectTaskCount.map(project => {
                  const percentDone = parseFloat(project.percentDone);
                  return (
                    <li key={project.id} className="flex flex-col gap-1 p-2 rounded-lg hover:bg-green-50 transition">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">{project.name}</span>
                        <span className="font-bold">{project.totalTasks} tasks</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold border
                          ${percentDone === 100
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-orange-100 text-orange-700 border-orange-200'}
                        `}>
                          {percentDone === 100 ? 'Done' : 'On Progress'}
                        </span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden mx-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300
                              ${percentDone === 100 ? 'bg-emerald-400' : 'bg-orange-400'}
                            `}
                            style={{ width: `${percentDone}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{percentDone}%</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Recent Actions */}
            <div className="bg-white rounded-xl shadow p-6 flex-1 min-w-0 border border-orange-100">
              <h2 className="text-lg font-semibold mb-4 text-orange-800 flex items-center gap-2">
                <FaTasks className="text-orange-400" /> Recent Actions
              </h2>
              <ul className="space-y-2 text-sm max-h-64 overflow-y-auto">
                {recentActions.length === 0 && (
                  <li className="text-gray-400">No recent actions.</li>
                )}
                {recentActions.map(action => (
                  <li key={action.id} className="flex flex-col">
                    <span className="font-semibold">{action.action}: {action.title}</span>
                    <span className="text-xs text-gray-500">
                      {action.user} • {action.project} • {action.date?.slice(0, 10)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Summary Table per Member */}
          <div className="bg-white rounded-xl shadow p-6 border border-blue-100 mb-8 overflow-x-auto">
            <h2 className="text-lg font-semibold mb-4 text-blue-800 flex items-center gap-2">
              <FaUserFriends className="text-blue-400" /> Member Task Summary
            </h2>
            {/* Filter */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input
                type="text"
                placeholder="Filter by member name..."
                className="border rounded-lg px-3 py-2 w-full sm:w-60 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                value={memberFilter}
                onChange={e => setMemberFilter(e.target.value)}
              />
              <select
                className="border rounded-lg px-3 py-2 w-full sm:w-48 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
              <select
                className="border rounded-lg px-3 py-2 w-full sm:w-48 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
              >
                <option value="">All Projects</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
            <table className="min-w-full text-sm border rounded-xl overflow-hidden">
              <thead className="bg-blue-100 text-blue-800">
                <tr>
                  <th className="py-2 px-3 text-left">Name</th>
                  <th className="py-2 px-3 text-center">To Do</th>
                  <th className="py-2 px-3 text-center">In Progress</th>
                  <th className="py-2 px-3 text-center">Done</th>
                  <th className="py-2 px-3 text-center">Total</th>
                  <th className="py-2 px-3 text-center">Progress</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {users
                  .filter(member => !memberFilter || member.name?.toLowerCase().includes(memberFilter.toLowerCase()))
                  .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                  .map(member => {
                    // Filter tasks sesuai project/status
                    let memberTasks = tasks.filter(t => t.assignment_id === member.id);
                    if (projectFilter) {
                      memberTasks = memberTasks.filter(t => String(t.project_id) === String(projectFilter));
                    }
                    // Hitung jumlah per status
                    const todo = memberTasks.filter(t => t.status === 'todo').length;
                    const inprogress = memberTasks.filter(t => t.status === 'in_progress').length;
                    const done = memberTasks.filter(t => t.status === 'done').length;
                    const total = memberTasks.length;
                    // Jika filter status, hanya tampilkan jumlah pada status tsb, lainnya 0
                    const showTodo = !statusFilter || statusFilter === 'todo' ? todo : 0;
                    const showInprogress = !statusFilter || statusFilter === 'in_progress' ? inprogress : 0;
                    const showDone = !statusFilter || statusFilter === 'done' ? done : 0;
                    const showTotal = showTodo + showInprogress + showDone;
                    const percentDone = showTotal > 0 ? Math.round((showDone / showTotal) * 100) : 0;
                    const isAvailable = showInprogress === 0;
                    return (
                      <tr key={member.id} className="hover:bg-blue-50 transition-all">
                        <td className="py-2 px-3 font-semibold">{member.name}</td>
                        <td className="py-2 px-3 text-center">{showTodo}</td>
                        <td className="py-2 px-3 text-center">{showInprogress}</td>
                        <td className="py-2 px-3 text-center">{showDone}</td>
                        <td className="py-2 px-3 text-center">{showTotal}</td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden w-20">
                              <div
                                className={`h-2 rounded-full transition-all duration-300
                                  ${percentDone === 100 ? 'bg-emerald-400' : 'bg-blue-400'}
                                `}
                                style={{ width: `${percentDone}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-700 w-8">{percentDone}%</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold border
                            ${isAvailable
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : 'bg-rose-100 text-rose-700 border-rose-200'}
                          `}>
                            {isAvailable ? 'Available' : 'Busy'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          {/* Filter/Search Task */}
          <div className="flex flex-col sm:flex-row items-center gap-2 mt-8 mb-2">
            <input
              type="text"
              placeholder="Search task title..."
              className="border rounded-lg px-3 py-2 w-full sm:w-60 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <span className="text-xs text-gray-500">Type to filter tasks</span>
          </div>
          {/* Semua Task, urut due date, highlight overdue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            <div className="bg-white rounded-xl shadow p-6 md:col-span-2 border border-orange-100 w-full">
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
                      <li key={task.id} className={`flex items-center gap-3 ${isOverdue ? 'bg-red-50' : 'hover:bg-orange-50'} rounded-lg px-3 py-2 transition-all`}>
                        <div className="w-8 h-8 rounded-full bg-orange-200 text-orange-800 flex items-center justify-center font-bold text-base shadow">
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
