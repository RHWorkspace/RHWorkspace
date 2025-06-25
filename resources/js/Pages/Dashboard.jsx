import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';
import React, { useEffect, useState } from 'react';
import axios from 'axios';

// ISO week (Senin-Minggu)
function getWeekNumber(date) {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7; // Senin = 0, Minggu = 6
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = new Date(target.getFullYear(),0,4);
    const diff = target - firstThursday;
    return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
}

// Minggu ke-berapa dalam bulan berjalan
function getWeekOfMonth(date) {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const dayOfWeek = firstDay.getDay() || 7; // Senin = 1, Minggu = 7
    const offsetDate = date.getDate() + dayOfWeek - 1;
    return Math.ceil(offsetDate / 7);
}

// Hitung jam per minggu dari seluruh tugas user (berdasarkan start dan due)
function getUserWeeklyHoursMap(tasks) {
    const weekly = {};
    tasks.forEach(t => {
        if (
            ['in_progress', 'done'].includes(t.status) && // <-- tambahkan 'done'
            t.estimated_hours &&
            t.start_date &&
            t.due_date
        ) {
            const start = new Date(t.start_date);
            const due = new Date(t.due_date);
            let current = new Date(start);
            const totalWeeks = [];
            while (current <= due) {
                const year = current.getFullYear();
                const week = getWeekNumber(current);
                const key = `${year}-W${week}`;
                if (!totalWeeks.includes(key)) totalWeeks.push(key);
                current.setDate(current.getDate() + 7 - current.getDay() + 1); // lompat ke Senin berikutnya
            }
            const jamPerMinggu = Number(t.estimated_hours) / totalWeeks.length;
            totalWeeks.forEach(key => {
                if (!weekly[key]) weekly[key] = 0;
                weekly[key] += jamPerMinggu;
            });
        }
    });
    return weekly;
}

// Helper: dapatkan info overload minggu ke berapa dan jam overload (bulan berjalan)
function getOverloadWeeksOfMonth(weeklyMap) {
    return Object.entries(weeklyMap)
        .filter(([_, jam]) => jam > 40)
        .map(([week, jam]) => {
            const [year, weekNum] = week.split('-W');
            // Cari tanggal Senin pada minggu tersebut
            const jan4 = new Date(Number(year), 0, 4);
            const weekStart = new Date(jan4.setDate(jan4.getDate() + (Number(weekNum) - 1) * 7 - (jan4.getDay() + 6) % 7));
            const weekOfMonth = getWeekOfMonth(weekStart);
            const month = weekStart.toLocaleString('id-ID', { month: 'long' });
            return { week, jam, weekOfMonth, month, year, jamOverload: jam - 40 };
        });
}

// Hitung jam minggu ini untuk card
function getUserCurrentWeekHours(tasks) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentWeek = getWeekNumber(now);

    let total = 0;
    tasks.forEach(t => {
        if (
            ['in_progress', 'done'].includes(t.status) && // <-- tambahkan 'done'
            t.estimated_hours &&
            t.due_date
        ) {
            const date = new Date(t.due_date);
            const year = date.getFullYear();
            const week = getWeekNumber(date);
            if (year === currentYear && week === currentWeek) {
                total += Number(t.estimated_hours) || 0;
            }
        }
    });
    return total;
}

function getUserWorkSummary(tasks) {
    // Hanya task in_progress
    const activeTasks = tasks.filter(
        t => t.status === 'in_progress' && t.estimated_hours && t.due_date
    );
    const totalHours = activeTasks.reduce((sum, t) => sum + Number(t.estimated_hours || 0), 0);

    // Hitung total jam minggu ini untuk semua task in_progress & done
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentWeek = getWeekNumber(now);
    const totalWeekHours = tasks.reduce((sum, t) => {
        if (
            ['in_progress', 'done'].includes(t.status) &&
            t.estimated_hours &&
            t.due_date
        ) {
            const date = new Date(t.due_date);
            const year = date.getFullYear();
            const week = getWeekNumber(date);
            if (year === currentYear && week === currentWeek) {
                return sum + Number(t.estimated_hours) || 0;
            }
        }
        return sum;
    }, 0);

    // Sisa jam minggu ini (max 40 jam)
    const dailyCapacity = 8;
    const weeklyCapacity = dailyCapacity * 5;
    const availableHours = Math.max(0, weeklyCapacity - totalWeekHours);

    // Next available (sudah sesuai)
    let sisa = totalWeekHours;
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
        totalHours, // hanya in_progress
        availableHours,
        availableDate,
        totalWeekHours, // in_progress + done minggu ini
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

    // Tambahan filter bulan & minggu
    const [filterMonth, setFilterMonth] = useState('');
    const [filterWeek, setFilterWeek] = useState('');

    const [showTaskList, setShowTaskList] = useState({});
    const [showAllTaskList, setShowAllTaskList] = useState(false);

    // Fungsi klik status per user
    function handleStatusClick(userId, status) {
        setStatusClickFilter({
            userId,
            status,
        });
        setShowTaskList(prev => ({
            ...prev,
            [userId]: true,
        }));
    }

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
        // Tambahkan filter bulan/minggu di sini
        let userTasks = filteredTasks.filter(task => String(task.assignment_id) === String(user.id));
        userTasks = filterTasksByMonthWeek(userTasks, filterMonth, filterWeek);

        const weeklyMap = getUserWeeklyHoursMap(userTasks);
        const overload = Object.values(weeklyMap).some(jam => jam > 40);
        const weeklyHours = getUserCurrentWeekHours(userTasks);
        const { totalHours, availableHours, availableDate, totalWeekHours } = getUserWorkSummary(userTasks);

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentWeek = getWeekNumber(now);

        // Jam in_progress minggu ini
        const inProgressHours = userTasks
            .filter(t =>
                t.status === 'in_progress' &&
                t.estimated_hours &&
                t.due_date &&
                (() => {
                    const date = new Date(t.due_date);
                    return date.getFullYear() === currentYear && getWeekNumber(date) === currentWeek;
                })()
            )
            .reduce((sum, t) => sum + Number(t.estimated_hours || 0), 0);

        // Jam done minggu ini
        const doneHours = userTasks
            .filter(t =>
                t.status === 'done' &&
                t.estimated_hours &&
                t.due_date &&
                (() => {
                    const date = new Date(t.due_date);
                    return date.getFullYear() === currentYear && getWeekNumber(date) === currentWeek;
                })()
            )
            .reduce((sum, t) => sum + Number(t.estimated_hours || 0), 0);

        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return {
            user,
            total: userTasks.length,
            todo: userTasks.filter(t => t.status === 'todo').length,
            in_progress: userTasks.filter(t => t.status === 'in_progress').length,
            done: userTasks.filter(t => t.status === 'done').length,
            overdue: userTasks.filter(t => {
                if (t.status === 'done' || !t.due_date) return false;
                const due = new Date(t.due_date);
                const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());
                return dueDate < today;
            }).length,
            today: userTasks.filter(t => {
                if (t.status === 'done' || !t.due_date) return false;
                const due = new Date(t.due_date);
                const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());
                return dueDate.getTime() === today.getTime();
            }).length,
            overload,
            weeklyMap,
            weeklyHours,
            tasks: userTasks,
            totalHours,
            availableHours,
            availableDate,
            totalWeekHours,
            inProgressHours,
            doneHours,
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
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                return w.tasks.filter(t => {
                    if (t.status === 'done' || !t.due_date) return false;
                    const due = new Date(t.due_date);
                    const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());
                    return dueDate < today;
                });
            }
            if (statusClickFilter.status === 'today') {
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                return w.tasks.filter(t => {
                    if (t.status === 'done' || !t.due_date) return false;
                    const due = new Date(t.due_date);
                    const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate());
                    return dueDate.getTime() === today.getTime();
                });
            }
            return w.tasks.filter(t => t.status === statusClickFilter.status);
        }
        return w.tasks;
    };

    // Helper overload filter bulan/minggu
    const getFilteredOverloadWeeks = (weeklyMap) => {
        let weeks = getOverloadWeeksOfMonth(weeklyMap);
        if (filterMonth) {
            weeks = weeks.filter(w => {
                // Bulan dalam angka (1-12)
                const monthNum = new Date(`${w.year}-${w.month}-01`).getMonth() + 1;
                return String(monthNum) === String(filterMonth);
            });
        }
        if (filterWeek) {
            weeks = weeks.filter(w => String(w.weekOfMonth) === String(filterWeek));
        }
        return weeks;
    };

    // === NOTIFIKASI GENERAL OVERLOAD (HANYA SATU BLOK) ===
    const hasAnyOverload = filteredWorkload.some(w => getFilteredOverloadWeeks(w.weeklyMap).length > 0);

    return (
        <AuthenticatedLayout auth={auth}>
            <Head title="Dashboard" />
            <div className="container mx-auto px-4">
                <div className="py-8">
                    <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

                    {/* Notifikasi General Overload */}
                    {hasAnyOverload && (
                        <div className="mb-4 bg-gradient-to-r from-red-500 to-red-700 text-white px-4 py-3 rounded-lg shadow-lg animate-pulse border-2 border-red-600">
                            <div className="flex items-center gap-2 mb-1">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-bold">
                                    Notifikasi Overload: Ada user overload pada minggu-minggu tertentu bulan berjalan!
                                </span>
                            </div>
                            <ul className="ml-8 list-disc text-sm">
                                {filteredWorkload.map(w => {
                                    const overloadWeeks = getFilteredOverloadWeeks(w.weeklyMap);
                                    if (overloadWeeks.length === 0) return null;
                                    return (
                                        <li key={w.user.id}>
                                            <span className="font-semibold">{w.user.name}</span> overload pada&nbsp;
                                            {overloadWeeks.map((ow, i) => (
                                                <span key={ow.week}>
                                                    minggu ke-<span className="underline">{ow.weekOfMonth}</span> bulan {ow.month} (<span className="font-bold">{ow.jamOverload.toFixed(2)} jam overload</span>){i < overloadWeeks.length - 1 ? ', ' : ''}
                                                </span>
                                            ))}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}

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
                        {/* Filter Bulan */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Filter Bulan
                            </label>
                            <select
                                value={filterMonth}
                                onChange={e => setFilterMonth(e.target.value)}
                                className="block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Semua Bulan</option>
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                        {new Date(2025, i, 1).toLocaleString('id-ID', { month: 'long' })}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {/* Filter Minggu */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Filter Minggu (dalam bulan)
                            </label>
                            <select
                                value={filterWeek}
                                onChange={e => setFilterWeek(e.target.value)}
                                className="block w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Semua Minggu</option>
                                {[1,2,3,4,5].map(week => (
                                    <option key={week} value={week}>Minggu ke-{week}</option>
                                ))}
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

                            // Card color logic
                            let cardColor = "bg-white border-gray-100";
                            let borderClass = "border";
                            if (w.overload) {
                                cardColor = "bg-gradient-to-br from-red-200 to-red-50";
                                borderClass = "border-2 border-red-500";
                            } else if (w.in_progress === 0) {
                                cardColor = "bg-gradient-to-br from-green-100 to-green-50 border-green-300";
                            } else {
                                cardColor = "bg-gradient-to-br from-yellow-50 to-blue-50 border-yellow-200";
                            }

                            // Card overload minggu ini
                            const now = new Date();
                            const currentYear = now.getFullYear();
                            const currentWeek = getWeekNumber(now);
                            const weekKey = `${currentYear}-W${currentWeek}`;
                            const jamMingguIni = w.weeklyMap[weekKey] || 0;
                            const isOverloadThisWeek = jamMingguIni > 40;
                            const weekOfMonth = getWeekOfMonth(now);
                            const month = now.toLocaleString('id-ID', { month: 'long' });
                            const jamOverloadThisWeek = jamMingguIni - 40;

                            // Overload minggu lain
                            const overloadWeeks = getOverloadWeeksOfMonth(w.weeklyMap);

                            // Jika filter bulan/minggu aktif, cari overload week yang sesuai filter
                            let filteredOverloadWeek = null;
                            if (filterMonth || filterWeek) {
                                const filtered = getFilteredOverloadWeeks(w.weeklyMap);
                                filteredOverloadWeek = filtered.length > 0 ? filtered[0] : null;
                            }

                            return (
                                <div
                                    key={w.user.id}
                                    className={`relative p-4 rounded-lg shadow-md ${isOverloadThisWeek ? 'border-2 border-red-500 bg-gradient-to-br from-red-200 to-red-50' : borderClass + ' ' + cardColor}`}
                                >
                                    {/* Overload Notification per Card Minggu Ini */}
                                    {isOverloadThisWeek && !filteredOverloadWeek && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                                            <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full shadow-lg animate-pulse border-2 border-white">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="font-bold text-xs">
                                                    Overload minggu ke-{weekOfMonth} bulan {month}! (<span className="font-bold">{jamOverloadThisWeek.toFixed(2)} jam overload</span>)
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Overload minggu lain */}
                                    {!isOverloadThisWeek && !filteredOverloadWeek && overloadWeeks.length > 0 && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                                            <div className="flex items-center gap-2 bg-orange-500 text-white px-3 py-1 rounded-full shadow-lg border-2 border-white">
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="font-bold text-xs">
                                                    Overload {overloadWeeks.map(ow =>
                                                        `minggu ke-${ow.weekOfMonth} ${ow.month} (${ow.jamOverload.toFixed(2)} jam overload)`
                                                    ).join(', ')}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Overload filter */}
                                    {filteredOverloadWeek && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                                            <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full shadow-lg animate-pulse border-2 border-white">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="font-bold text-xs">
                                                    Overload minggu ke-{filteredOverloadWeek.weekOfMonth} bulan {filteredOverloadWeek.month}! (<span className="font-bold">{filteredOverloadWeek.jamOverload.toFixed(2)} jam overload</span>)
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center mb-2 mt-2">
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
                                        </div>
                                    </div>

                                    {/* Status summary dengan onclick */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <button
                                            type="button"
                                            className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold hover:bg-blue-200 transition"
                                            onClick={() => handleStatusClick(w.user?.id, null)}
                                        >
                                            Total: {w.total}
                                        </button>
                                        <button
                                            type="button"
                                            className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold hover:bg-yellow-200 transition"
                                            onClick={() => handleStatusClick(w.user?.id, 'todo')}
                                        >
                                            To Do: {w.todo}
                                        </button>
                                        <button
                                            type="button"
                                            className="bg-orange-200 text-orange-900 px-2 py-1 rounded text-xs font-semibold hover:bg-orange-300 transition"
                                            onClick={() => handleStatusClick(w.user?.id, 'today')}
                                        >
                                            Today: {w.today}
                                        </button>
                                        <button
                                            type="button"
                                            className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-semibold hover:bg-orange-200 transition"
                                            onClick={() => handleStatusClick(w.user?.id, 'in_progress')}
                                        >
                                            In Progress: {w.in_progress}
                                        </button>
                                        <button
                                            type="button"
                                            className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold hover:bg-green-200 transition"
                                            onClick={() => handleStatusClick(w.user?.id, 'done')}
                                        >
                                            Done: {w.done}
                                        </button>
                                        <button
                                            type="button"
                                            className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold hover:bg-red-200 transition"
                                            onClick={() => handleStatusClick(w.user?.id, 'overdue')}
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
                                            <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2 relative overflow-hidden" style={{ minWidth: 80 }}>
                                                {/* Bar in_progress */}
                                                <div
                                                    className="absolute left-0 top-0 h-2.5 bg-indigo-600"
                                                    style={{
                                                        width: `${Math.min((w.inProgressHours / 40) * 100, 100)}%`,
                                                        zIndex: 2,
                                                    }}
                                                ></div>
                                                {/* Bar done */}
                                                <div
                                                    className="absolute left-0 top-0 h-2.5 bg-green-400"
                                                    style={{
                                                        width: `${Math.min(((w.inProgressHours + w.doneHours) / 40) * 100, 100)}%`,
                                                        opacity: 0.7,
                                                        zIndex: 1,
                                                    }}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-semibold text-indigo-700 mr-1">
                                                {w.inProgressHours.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} jam
                                            </span>
                                            <span className="text-xs font-semibold text-green-700">
                                                + {w.doneHours.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} jam
                                            </span>
                                        </div>

                                        {/* Overload Hours Bar (jika overload minggu ini atau filter aktif) */}
                                        {((!filterMonth && !filterWeek && isOverloadThisWeek && jamOverloadThisWeek > 0) ||
                                          (filteredOverloadWeek && filteredOverloadWeek.jamOverload > 0)) && (
                                            <div className="flex items-center mb-1">
                                                <div className="w-full bg-red-100 rounded-full h-2.5 mr-2">
                                                    <div
                                                        className="bg-red-500 h-2.5 rounded-full"
                                                        style={{
                                                            width: `${
                                                                filteredOverloadWeek
                                                                    ? Math.min((filteredOverloadWeek.jamOverload / 40) * 100, 100)
                                                                    : Math.min((jamOverloadThisWeek / 40) * 100, 100)
                                                            }%`
                                                        }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs font-semibold text-red-700">
                                                    {filteredOverloadWeek
                                                        ? filteredOverloadWeek.jamOverload.toFixed(2)
                                                        : jamOverloadThisWeek.toFixed(2)
                                                    } jam overload
                                                </span>
                                            </div>
                                        )}

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
                                        <div className="flex items-center mb-1">
                                            <span className="text-xs font-medium text-gray-500 mr-2">Working Hours This Week:</span>
                                            <span className={`text-xs font-bold ${isOverloadThisWeek ? 'text-red-700' : 'text-indigo-700'}`}>
                                                {w.totalWeekHours} jam
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
            {/* Animasi pulse */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1 }
                    50% { opacity: .5 }
                }
                .animate-pulse { animation: pulse 1.2s infinite; }
            `}</style>
        </AuthenticatedLayout>
    );
}

// Tambahan fungsi filter berdasarkan bulan dan minggu
function filterTasksByMonthWeek(tasks, filterMonth, filterWeek) {
    if (!filterMonth && !filterWeek) return tasks;
    return tasks.filter(t => {
        if (!t.due_date) return false;
        const due = new Date(t.due_date);
        const monthMatch = filterMonth ? (due.getMonth() + 1) === Number(filterMonth) : true;
        const weekMatch = filterWeek ? getWeekOfMonth(due) === Number(filterWeek) : true;
        return monthMatch && weekMatch;
    });
}
