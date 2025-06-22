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

function getUserWorkSummary(tasks) {
    const activeTasks = tasks.filter(
        t => t.status === 'in_progress' && t.estimated_hours && t.due_date
    );
    const totalHours = activeTasks.reduce((sum, t) => sum + Number(t.estimated_hours || 0), 0);
    const totalRemaining = activeTasks.reduce(
        (sum, t) =>
            sum +
            (typeof t.remaining_hours !== 'undefined' && t.remaining_hours !== null
                ? Number(t.remaining_hours)
                : Number(t.estimated_hours || 0)),
        0
    );
    const dailyCapacity = 8;
    const weeklyCapacity = dailyCapacity * 5;
    const now = new Date();
    const availableHours = Math.max(0, weeklyCapacity - totalRemaining);

    // Next available (hanya hari kerja)
    let sisa = totalRemaining;
    let current = new Date(now);
    let availableDate = null;
    if (sisa === 0) {
        availableDate = now;
    } else {
        while (sisa > 0) {
            if (current.getDay() >= 1 && current.getDay() <= 5) {
                sisa -= dailyCapacity;
                if (sisa <= 0) {
                    availableDate = new Date(current);
                    break;
                }
            }
            current.setDate(current.getDate() + 1);
        }
    }
    return {
        totalHours,
        availableHours,
        availableDate,
    };
}

export default function Dashboard() {
    const { auth } = usePage().props;
    const [users, setUsers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [tasks, setTasks] = useState([]);

    const [filterUser, setFilterUser] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [filterAvailable, setFilterAvailable] = useState('');
    const [statusClickFilter, setStatusClickFilter] = useState({ userId: null, status: null });

    const [showTaskList, setShowTaskList] = useState({});
    const [showAllTaskList, setShowAllTaskList] = useState(false);

    useEffect(() => {
        axios.get('/users').then(res => setUsers(res.data || []));
        axios.get('/projects').then(res => setProjects(res.data || []));
        axios.get('/tasks').then(res => setTasks(res.data || []));
    }, []);

    const filteredTasks = tasks.filter(task => {
        let match = true;
        if (filterUser) match = match && String(task.assignment_id) === String(filterUser);
        if (filterStatus) match = match && task.status === filterStatus;
        if (filterProject) match = match && String(task.project_id) === String(filterProject);
        return match;
    });

    const workload = users.map(user => {
        const userTasks = filteredTasks.filter(task => String(task.assignment_id) === String(user.id));
        const now = new Date();
        const overload = isUserOverloadWeekly(userTasks);
        const { totalHours, availableHours, availableDate } = getUserWorkSummary(userTasks);

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
            overload,
            tasks: userTasks,
            totalHours,
            availableHours,
            availableDate,
        };
    })
    .filter(w => w.total > 0 || (!filterUser && !filterStatus && !filterProject))
    .sort((a, b) => b.total - a.total);

    const filteredWorkload = workload.filter(w => {
        if (filterAvailable === 'available') {
            return w.in_progress === 0;
        }
        if (filterAvailable === 'busy') {
            return w.in_progress > 0;
        }
        if (filterAvailable === 'overload') {
            return w.overload === true;
        }
        return true;
    });

    // Sinkronkan showAllTaskList dengan showTaskList semua user
    useEffect(() => {
        const newShowTaskList = {};
        if (showAllTaskList) {
            filteredWorkload.forEach(w => {
                newShowTaskList[w.user?.id] = true;
            });
        } else {
            filteredWorkload.forEach(w => {
                newShowTaskList[w.user?.id] = false;
            });
        }
        setShowTaskList(newShowTaskList);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showAllTaskList, filteredWorkload.length]);

    // Untuk filter status per card
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

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Dashboard" />
            <div className="container mx-auto px-4">
                <div className="py-8">
                    <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

                    {/* Filter Section */}
                    <div className="bg-white shadow rounded-lg p-4 mb-4 flex flex-wrap gap-4 items-end">
                        {/* User Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Filter by User
                            </label>
                            <select
                                value={filterUser}
                                onChange={e => setFilterUser(e.target.value)}
                                className="block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">All Users</option>
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Filter by Status
                            </label>
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">All Status</option>
                                <option value="todo">Todo</option>
                                <option value="in_progress">In Progress</option>
                                <option value="done">Done</option>
                            </select>
                        </div>
                        {/* Project Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Filter by Project
                            </label>
                            <select
                                value={filterProject}
                                onChange={e => setFilterProject(e.target.value)}
                                className="block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">All Projects</option>
                                {projects.map(project => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {/* Availability Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Filter by Availability
                            </label>
                            <select
                                value={filterAvailable}
                                onChange={e => setFilterAvailable(e.target.value)}
                                className="block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">All</option>
                                <option value="available">Available</option>
                                <option value="busy">Busy</option>
                                <option value="overload">Overload</option>
                            </select>
                        </div>
                        {/* Show/Hide All Task List */}
                        <div className="ml-auto">
                            <button
                                className="border rounded px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold transition"
                                onClick={() => setShowAllTaskList(v => !v)}
                                type="button"
                            >
                                {showAllTaskList ? 'Hide All Task List' : 'Show All Task List'}
                            </button>
                        </div>
                    </div>

                    {/* Workload Summary Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {filteredWorkload.map((w, idx) => {
                            const filteredTasks = getFilteredTasks(w);
                            const showMore = filteredTasks.length > 5;
                            const isShow = showTaskList[w.user?.id] ?? false;

                            // Fungsi untuk handle klik status dan tampilkan list task pada card ini
                            const handleStatusClick = (status) => {
                                setStatusClickFilter({ userId: w.user?.id, status });
                                setShowTaskList(prev => ({
                                    ...prev,
                                    [w.user?.id]: true,
                                }));
                            };

                            // Card color logic
                            let cardColor = "bg-white border-gray-100";
                            if (w.overload) {
                                cardColor = "bg-gradient-to-br from-red-100 to-red-50 border-red-300";
                            } else if (w.in_progress === 0) {
                                // Available (tidak ada in_progress)
                                cardColor = "bg-gradient-to-br from-green-100 to-green-50 border-green-300";
                            } else {
                                // Not available (ada in_progress)
                                cardColor = "bg-gradient-to-br from-yellow-50 to-blue-50 border-yellow-200";
                            }

                            return (
                                <div
                                    key={w.user.id}
                                    className={`p-4 rounded-lg shadow-md border ${cardColor}`}
                                >
                                    <div className="flex items-center mb-2">
                                        <div className="h-10 w-10 rounded-full overflow-hidden mr-3 bg-gray-200 flex items-center justify-center">
                                            <span className="font-bold text-lg text-gray-700">
                                                {w.user.name?.[0] || '-'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">
                                                {w.user.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {w.user.email}
                                            </p>
                                            {w.overload && (
                                                <div className="text-xs text-red-600 font-bold">
                                                    Overload (&gt;40 jam/minggu)
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status summary dengan onclick */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <button
                                            type="button"
                                            className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold hover:bg-blue-200 transition"
                                            onClick={() => handleStatusClick(null)}
                                        >
                                            Total: {w.total}
                                        </button>
                                        <button
                                            type="button"
                                            className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold hover:bg-yellow-200 transition"
                                            onClick={() => handleStatusClick('todo')}
                                        >
                                            To Do: {w.todo}
                                        </button>
                                        <button
                                            type="button"
                                            className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-semibold hover:bg-orange-200 transition"
                                            onClick={() => handleStatusClick('in_progress')}
                                        >
                                            In Progress: {w.in_progress}
                                        </button>
                                        <button
                                            type="button"
                                            className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold hover:bg-green-200 transition"
                                            onClick={() => handleStatusClick('done')}
                                        >
                                            Done: {w.done}
                                        </button>
                                        <button
                                            type="button"
                                            className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold hover:bg-red-200 transition"
                                            onClick={() => handleStatusClick('overdue')}
                                        >
                                            Overdue: {w.overdue}
                                        </button>
                                        {isShow && (
                                            <button
                                                type="button"
                                                className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-semibold hover:bg-gray-300 transition ml-auto"
                                                onClick={() =>
                                                    setShowTaskList(prev => ({
                                                        ...prev,
                                                        [w.user?.id]: false,
                                                    }))
                                                }
                                            >
                                                Hide List Task
                                            </button>
                                        )}
                                    </div>

                                    {/* Jam kerja */}
                                    <div className="mt-4">
                                        <div className="text-xs font-medium text-gray-500 mb-1">
                                            Working Hours:
                                        </div>
                                        <div className="flex items-center mb-1">
                                            <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                                <div
                                                    className="bg-indigo-600 h-2.5 rounded-full"
                                                    style={{
                                                        width: `${Math.min((w.totalHours / 40) * 100, 100)}%`
                                                    }}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-semibold text-indigo-700">
                                                {w.totalHours.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} jam
                                            </span>
                                        </div>
                                        <div className="flex items-center mb-1">
                                            <span className="text-xs font-medium text-gray-500 mr-2">Available Hours:</span>
                                            <span className="text-xs font-semibold text-green-700">
                                                {w.availableHours.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} jam
                                            </span>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="text-xs font-medium text-gray-500 mr-2">Next Available:</span>
                                            <span className="text-xs font-semibold text-yellow-700">
                                                {w.availableDate
                                                    ? w.availableDate.toLocaleDateString('id-ID')
                                                    : '-'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* List Task */}
                                    {isShow && (
                                        <div className="overflow-x-auto rounded-lg border border-gray-100 bg-white shadow-inner mt-2">
                                            <table className="min-w-full text-xs">
                                                <thead>
                                                    <tr className="bg-gray-50 text-gray-700">
                                                        <th className="py-2 px-2 text-left font-semibold">Title</th>
                                                        <th className="py-2 px-2 text-left font-semibold">Project</th>
                                                        <th className="py-2 px-2 text-left font-semibold">Status</th>
                                                        <th className="py-2 px-2 text-left font-semibold">Due</th>
                                                        <th className="py-2 px-2 text-left font-semibold">Est. Hours</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredTasks.length === 0 && (
                                                        <tr>
                                                            <td colSpan={5} className="text-center py-3 text-gray-400">No tasks.</td>
                                                        </tr>
                                                    )}
                                                    {filteredTasks.length > 0 &&
                                                        filteredTasks.slice(0, 5).map(task => (
                                                            <tr key={task.id} className="border-t hover:bg-blue-50 transition">
                                                                <td className="py-2 px-2">{task.title}</td>
                                                                <td className="py-2 px-2">{projects.find(p => p.id === task.project_id)?.name || '-'}</td>
                                                                <td className="py-2 px-2">
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
                                                                <td className={`py-2 px-2 ${task.status !== 'done' && task.due_date && new Date(task.due_date) < new Date() ? 'text-red-600 font-bold' : ''}`}>
                                                                    {task.due_date || '-'}
                                                                </td>
                                                                <td className="py-2 px-2">
                                                                    {typeof task.estimated_hours !== 'undefined' && task.estimated_hours !== null && task.estimated_hours !== ''
                                                                        ? Number(task.estimated_hours).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' jam'
                                                                        : <span className="text-gray-400">-</span>
                                                                    }
                                                                </td>
                                                            </tr>
                                                        ))
                                                    }
                                                </tbody>
                                            </table>
                                            {showMore && (
                                                <div className="mt-2 text-right">
                                                    <button
                                                        className="text-xs text-blue-600 underline"
                                                        onClick={() => router.get(`/tasks-page?assignment=${w.user?.id}`)}
                                                        type="button"
                                                    >
                                                        Show more
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
