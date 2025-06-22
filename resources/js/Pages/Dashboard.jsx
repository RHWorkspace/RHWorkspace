import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function isUserOverloadWeekly(tasks) {
    const weekly = {};
    tasks.forEach(t => {
        if (
            ['todo', 'in_progress'].includes(t.status) &&
            t.estimated_hours &&
            t.due_date
        ) {
            const date = new Date(t.due_date);
            const year = date.getFullYear();
            const week = getWeekNumber(date);
            const key = `${year}-W${week}`;
            if (!weekly[key]) weekly[key] = 0;
            weekly[key] += Number(t.estimated_hours) || 0;
        }
    });
    return Object.values(weekly).some(jam => jam > 40);
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

export default function Dashboard() {
    const { auth } = usePage().props;
    const [users, setUsers] = useState([]);
    const [workload, setWorkload] = useState([]);
    const [filterUser, setFilterUser] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [filterAvailable, setFilterAvailable] = useState(''); // sudah ada
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);

    const [statusClickFilter, setStatusClickFilter] = useState({ userId: null, status: null });

    useEffect(() => {
        axios.get('/users').then(res => setUsers(res.data || []));
        axios.get('/projects').then(res => setProjects(res.data || []));
        axios.get('/tasks').then(res => setTasks(res.data || []));
    }, []);

    // Filtering tasks sesuai filter global
    const filteredTasks = tasks.filter(task => {
        let match = true;
        if (filterUser) match = match && String(task.assignment_id) === String(filterUser);
        if (filterStatus) match = match && task.status === filterStatus;
        if (filterProject) match = match && String(task.project_id) === String(filterProject);
        return match;
    });

    // Group tasks by assignment_id
    const grouped = {};
    filteredTasks.forEach(task => {
        if (!grouped[task.assignment_id]) grouped[task.assignment_id] = [];
        grouped[task.assignment_id].push(task);
    });

    // Build workload per user
    useEffect(() => {
        setWorkload(
            users.map(user => {
                const userTasks = grouped[user.id] || [];
                const now = new Date();
                const overload = isUserOverloadWeekly(userTasks); // overload mingguan
                return {
                    user,
                    total: userTasks.length,
                    todo: userTasks.filter(t => t.status === 'todo').length,
                    in_progress: userTasks.filter(t => t.status === 'in_progress').length,
                    done: userTasks.filter(t => t.status === 'done').length,
                    overdue: userTasks.filter(t =>
                        (t.status !== 'done') &&
                        t.due_date &&
                        new Date(t.due_date) < now
                    ).length,
                    overload, // <-- flag overload mingguan
                    tasks: userTasks,
                };
            })
            .filter(w => w.total > 0 || (!filterUser && !filterStatus && !filterProject))
            .sort((a, b) => b.total - a.total) // Urutkan dari jumlah task terbanyak ke terkecil
        );
        // eslint-disable-next-line
    }, [users, filteredTasks, filterUser, filterStatus, filterProject]);

    // Filter workload by available if needed
    const filteredWorkload = workload.filter(w => {
        if (filterAvailable === 'available') {
            // Available: tidak ada task in_progress
            return w.in_progress === 0;
        }
        if (filterAvailable === 'busy') {
            // Busy: ada task in_progress
            return w.in_progress > 0;
        }
        if (filterAvailable === 'overload') {
            // Overload: overload mingguan
            return w.overload === true;
        }
        return true;
    });

    const getFilteredTasks = (w) => {
        if (
            statusClickFilter.userId === w.user?.id &&
            statusClickFilter.status
        ) {
            if (statusClickFilter.status === 'overdue') {
                const now = new Date();
                return w.tasks.filter(
                    t =>
                        t.status !== 'done' &&
                        t.due_date &&
                        new Date(t.due_date) < now
                );
            }
            return w.tasks.filter(t => t.status === statusClickFilter.status);
        }
        return w.tasks;
    };

    const isActive = (w, status) =>
        statusClickFilter.userId === w.user?.id && statusClickFilter.status === status;

    const handleResetStatusClick = () => setStatusClickFilter({ userId: null, status: null });

    const goToTaskPageWithMember = (userId) => {
        router.get(`/tasks-page?assignment=${userId}`);
    };

    // Cari member overload
    const overloadMembers = filteredWorkload.filter(w => w.overload);

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Dashboard
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {/* Notifikasi jika ada member overload */}
                    {overloadMembers.length > 0 && (
                        <div className="my-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg shadow flex items-center gap-3">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <b>Warning:</b> {overloadMembers.length} member{overloadMembers.length > 1 ? 's are' : ' is'} overload (&gt;40 jam/minggu):{' '}
                                {overloadMembers.map(w => w.user?.name).filter(Boolean).join(', ')}
                            </div>
                        </div>
                    )}

                    {/* Filter */}
                    <div className="mt-8 mb-6 flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">User</label>
                            <select
                                className="border rounded px-3 py-2 min-w-[220px] max-w-xs"
                                value={filterUser}
                                onChange={e => setFilterUser(e.target.value)}
                            >
                                <option value="">All Users</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                            <select
                                className="border rounded px-3 py-2 min-w-[180px] max-w-xs"
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                            >
                                <option value="">All Status</option>
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="done">Done</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Project</label>
                            <select
                                className="border rounded px-3 py-2 min-w-[240px] max-w-xs"
                                value={filterProject}
                                onChange={e => setFilterProject(e.target.value)}
                            >
                                <option value="">All Projects</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Availability</label>
                            <select
                                className="border rounded px-3 py-2 min-w-[160px] max-w-xs"
                                value={filterAvailable}
                                onChange={e => setFilterAvailable(e.target.value)}
                            >
                                <option value="">All</option>
                                <option value="available">Available</option>
                                <option value="busy">Busy (In Progress)</option>
                                <option value="overload">Overload (&gt;40 jam/minggu)</option>
                            </select>
                        </div>
                    </div>
                    {/* Workload Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {filteredWorkload.length === 0 && (
                            <div className="col-span-4 text-center text-gray-400 py-8">
                                No tasks found.
                            </div>
                        )}
                        {filteredWorkload.map((w, idx) => {
                            const filteredTasks = getFilteredTasks(w);
                            const showMore = filteredTasks.length > 5;
                            const isAllDoneOrTodo = (w.in_progress === 0);
                            return (
                                <div
                                    key={w.user?.id || idx}
                                    className={`rounded-lg shadow p-4 ${
                                        w.overload
                                            ? 'bg-red-50 border border-red-300'
                                            : isAllDoneOrTodo
                                            ? 'bg-green-50 border border-green-200'
                                            : 'bg-white'
                                    }`}
                                    style={{ minWidth: 0 }}
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`rounded-full w-9 h-9 flex items-center justify-center text-lg font-bold ${
                                            w.overload
                                                ? 'bg-red-200 text-red-800'
                                                : isAllDoneOrTodo
                                                ? 'bg-green-200 text-green-800'
                                                : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {w.user?.name?.[0] || '-'}
                                        </div>
                                        <div>
                                            <button
                                                className="font-bold text-base text-blue-800 hover:underline focus:outline-none bg-transparent p-0 m-0"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => goToTaskPageWithMember(w.user?.id)}
                                                type="button"
                                                title={`Lihat semua task ${w.user?.name}`}
                                            >
                                                {w.user?.name || 'Unknown'}
                                            </button>
                                            <div className="text-gray-500 text-xs">{w.user?.email}</div>
                                            {w.overload && (
                                                <div className="text-xs text-red-600 font-bold">
                                                    Overload (&gt;40 jam/minggu)
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-5 gap-1 mb-3">
                                        <button
                                            className={`bg-blue-50 rounded p-2 text-center w-full focus:outline-none ${isActive(w, 'total') ? 'ring-2 ring-blue-400' : ''}`}
                                            onClick={() => setStatusClickFilter({ userId: w.user?.id, status: null })}
                                            type="button"
                                            title="Show all tasks"
                                        >
                                            <div className="text-base font-bold text-blue-700">{w.total}</div>
                                            <div className="text-gray-600 text-[11px]">Total</div>
                                        </button>
                                        <button
                                            className={`bg-yellow-50 rounded p-2 text-center w-full focus:outline-none ${isActive(w, 'todo') ? 'ring-2 ring-yellow-400' : ''}`}
                                            onClick={() => setStatusClickFilter({ userId: w.user?.id, status: 'todo' })}
                                            type="button"
                                            title="Show To Do"
                                        >
                                            <div className="text-base font-bold text-yellow-600">{w.todo}</div>
                                            <div className="text-gray-600 text-[11px]">To Do</div>
                                        </button>
                                        <button
                                            className={`bg-orange-50 rounded p-2 text-center w-full focus:outline-none ${isActive(w, 'in_progress') ? 'ring-2 ring-orange-400' : ''}`}
                                            onClick={() => setStatusClickFilter({ userId: w.user?.id, status: 'in_progress' })}
                                            type="button"
                                            title="Show In Progress"
                                        >
                                            <div className="text-base font-bold text-orange-600">{w.in_progress}</div>
                                            <div className="text-gray-600 text-[11px]">In Progress</div>
                                        </button>
                                        <button
                                            className={`bg-green-50 rounded p-2 text-center w-full focus:outline-none ${isActive(w, 'done') ? 'ring-2 ring-green-400' : ''}`}
                                            onClick={() => setStatusClickFilter({ userId: w.user?.id, status: 'done' })}
                                            type="button"
                                            title="Show Done"
                                        >
                                            <div className="text-base font-bold text-green-600">{w.done}</div>
                                            <div className="text-gray-600 text-[11px]">Done</div>
                                        </button>
                                        <button
                                            className={`bg-red-50 rounded p-2 text-center w-full focus:outline-none ${isActive(w, 'overdue') ? 'ring-2 ring-red-400' : ''}`}
                                            onClick={() => setStatusClickFilter({ userId: w.user?.id, status: 'overdue' })}
                                            type="button"
                                            title="Show Overdue"
                                        >
                                            <div className="text-base font-bold text-red-600">{w.overdue}</div>
                                            <div className="text-gray-600 text-[11px]">Overdue</div>
                                        </button>
                                    </div>
                                    {(statusClickFilter.userId === w.user?.id && statusClickFilter.status) && (
                                        <button
                                            className="mb-2 text-xs text-blue-600 underline"
                                            onClick={handleResetStatusClick}
                                            type="button"
                                        >
                                            Show all tasks
                                        </button>
                                    )}
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full bg-white rounded shadow text-xs">
                                            <thead>
                                                <tr className="bg-gray-100 text-gray-700">
                                                    <th className="py-1 px-2 text-left">Title</th>
                                                    <th className="py-1 px-2 text-left">Project</th>
                                                    <th className="py-1 px-2 text-left">Status</th>
                                                    <th className="py-1 px-2 text-left">Due</th>
                                                    <th className="py-1 px-2 text-left">Est. Hours</th> {/* Tambahkan kolom ini */}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredTasks.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="text-center py-2 text-gray-400">No tasks.</td>
                                                    </tr>
                                                )}
                                                {filteredTasks.slice(0, 5).map(task => (
                                                    <tr key={task.id} className="border-t">
                                                        <td className="py-1 px-2">{task.title}</td>
                                                        <td className="py-1 px-2">{projects.find(p => p.id === task.project_id)?.name || '-'}</td>
                                                        <td className="py-1 px-2">
                                                            <span className={
                                                                task.status === 'done'
                                                                    ? 'bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-semibold'
                                                                    : task.status === 'in_progress'
                                                                    ? 'bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-[10px] font-semibold'
                                                                    : 'bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[10px] font-semibold'
                                                            }>
                                                                {task.status ? task.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : '-'}
                                                            </span>
                                                        </td>
                                                        <td className={`py-1 px-2 ${task.status !== 'done' && task.due_date && new Date(task.due_date) < new Date() ? 'text-red-600 font-bold' : ''}`}>
                                                            {task.due_date || '-'}
                                                        </td>
                                                        <td className="py-1 px-2">
                                                            {typeof task.estimated_hours !== 'undefined' && task.estimated_hours !== null && task.estimated_hours !== ''
                                                                ? Number(task.estimated_hours).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' jam'
                                                                : <span className="text-gray-400">-</span>
                                                            }
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {showMore && (
                                            <div className="mt-2 text-right">
                                                <button
                                                    className="text-xs text-blue-600 underline"
                                                    onClick={() => goToTaskPageWithMember(w.user?.id)}
                                                    type="button"
                                                >
                                                    Show more
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
