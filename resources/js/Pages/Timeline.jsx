import React, { useEffect, useState } from "react";
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from "axios";
import dayjs from "dayjs";
import weekOfYear from 'dayjs/plugin/weekOfYear';
import dayOfYear from 'dayjs/plugin/dayOfYear';
dayjs.extend(weekOfYear);
dayjs.extend(dayOfYear);

export default function ProjectGanttView() {
  const currentYear = dayjs().year();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterModule, setFilterModule] = useState(''); // 1. State baru
  const [viewMode, setViewMode] = useState('monthly');
  const [year, setYear] = useState(currentYear);

  // Timeline config
  const today = dayjs();
  const years = Array.from({ length: 5 }).map((_, i) => currentYear - 2 + i);

  // --- WEEKLY VIEW ---
  // Weeks in year, grouped by month (weeks counted per month, not global week number)
  const months = Array.from({ length: 12 }).map((_, i) =>
    dayjs().year(year).month(i).startOf('month')
  );
  // For weekly view: get weeks per month
  const weeksByMonth = months.map(monthStart => {
    const monthWeeks = [];
    let weekStart = monthStart.startOf('week');
    if (weekStart.month() !== monthStart.month()) {
      weekStart = monthStart;
    }
    let weekIdx = 1;
    while (weekStart.month() === monthStart.month() || weekStart.add(6, 'day').month() === monthStart.month()) {
      monthWeeks.push({
        weekStart: weekStart,
        weekLabel: `W${weekIdx}`,
      });
      weekStart = weekStart.add(1, 'week');
      weekIdx++;
      if (weekStart.month() > monthStart.month() && weekStart.date() > 7) break;
    }
    return monthWeeks;
  });
  // Flatten for table
  const weeklyDays = weeksByMonth.flat();

  // --- QUARTERLY VIEW ---
  const quarters = [
    { label: "Q1", start: dayjs().year(year).month(0), months: [0, 1, 2] },
    { label: "Q2", start: dayjs().year(year).month(3), months: [3, 4, 5] },
    { label: "Q3", start: dayjs().year(year).month(6), months: [6, 7, 8] },
    { label: "Q4", start: dayjs().year(year).month(9), months: [9, 10, 11] },
  ];

  useEffect(() => {
    axios.get('/tasks').then(res => setTasks(res.data || []));
    axios.get('/projects').then(res => setProjects(res.data || []));
  }, []);

  // Filtering
  const filteredProjects = projects.filter(p =>
    !filterProject || String(p.id) === String(filterProject)
  );
  const filteredTasks = tasks.filter(t =>
    (!filterProject || String(t.project_id) === String(filterProject)) &&
    (!filterStatus || t.status === filterStatus) &&
    (!filterModule ||
      (t.module?.name === filterModule ||
       t.module_name === filterModule))
  );

  // Ambil daftar modul unik dari tasks yang sesuai project filter saja (tanpa filter module/status)
  const moduleOptions = Array.from(
    new Set(
      tasks
        .filter(t => !filterProject || String(t.project_id) === String(filterProject))
        .map(t => t.module?.name || t.module_name || "Tanpa Modul")
    )
  );

  // Group tasks by project (HANYA tampilkan project yang lolos filter dan ADA task yang lolos filter)
  const tasksByProject = filteredProjects
    .map(project => ({
      ...project,
      tasks: filteredTasks.filter(t => t.project_id === project.id)
    }))
    .filter(p => p.tasks.length > 0); // hanya tampilkan project yang ada task-nya

  // Bar color
  const getColor = (status) => {
    switch (status) {
      case "done": return "bg-green-600";
      case "in_progress": return "bg-blue-600";
      default: return "bg-gray-400";
    }
  };

  // Tambahkan fungsi untuk progress project
  const getProjectProgress = (tasks) => {
    if (!tasks.length) return 0;
    const done = tasks.filter(t => t.status === "done").length;
    return Math.round((done / tasks.length) * 100);
  };

  // Fungsi progress modul
  const getModuleProgress = (tasks) => {
    if (!tasks.length) return 0;
    const done = tasks.filter(t => t.status === "done").length;
    return Math.round((done / tasks.length) * 100);
  };

  // Untuk highlight hari/minggu/bulan ini
  const isCurrentPeriod = (idx) => {
    if (viewMode === "weekly") {
      return weeklyDays[idx] && today.isSame(weeklyDays[idx].weekStart, 'week');
    }
    if (viewMode === "monthly" || viewMode === "quarterly") {
      return months[idx] && today.isSame(months[idx], 'month');
    }
    return false;
  };

  // --- HEADER & DAYS ---
  let headerRow1 = null, headerRow2 = null, days = [];
  if (viewMode === 'weekly') {
    // Row 1: Month names (colSpan = weeks in month)
    headerRow1 = (
      <tr>
        {/** Empty for sticky column */}
        <th className="border-b px-4 py-2 text-left w-72 align-bottom bg-white" style={{ minWidth: 288, maxWidth: 288 }}></th>
        {weeksByMonth.map((monthWeeks, i) => (
          <th
            key={i}
            colSpan={monthWeeks.length}
            className="border-b px-0 py-2 text-xs font-bold text-gray-700 bg-gray-100 text-center"
          >
            {months[i].format("MMMM")}
          </th>
        ))}
      </tr>
    );
    // Row 2: W1, W2, ...
    headerRow2 = (
      <tr>
        <th className="border-b px-4 py-2 text-left w-72 bg-white" style={{ minWidth: 288, maxWidth: 288 }}></th>
        {weeksByMonth.map((monthWeeks, i) =>
          monthWeeks.map((w, j) => (
            <th
              key={i + '-' + j}
              className="border-b px-0 py-2 w-[80px] text-xs font-normal text-gray-500 text-center"
            >
              {w.weekLabel}
            </th>
          ))
        )}
      </tr>
    );
    days = weeklyDays;
  } else if (viewMode === 'monthly') {
    // Row 1: Month names
    headerRow1 = (
      <tr>
        <th className="border-b px-4 py-2 text-left w-72 align-bottom bg-white" style={{ minWidth: 288, maxWidth: 288 }}></th>
        {months.map((m, i) => (
          <th
            key={i}
            className="border-b px-0 py-2 w-[120px] text-xs font-bold text-gray-700 bg-gray-100 text-center"
          >
            {m.format("MMMM")}
          </th>
        ))}
      </tr>
    );
    days = months;
  } else if (viewMode === 'quarterly') {
    // Row 1: Q1, Q2, ...
    headerRow1 = (
      <tr>
        <th className="border-b px-4 py-2 text-left w-72 align-bottom bg-white" style={{ minWidth: 288, maxWidth: 288 }}></th>
        {quarters.map((q, i) => (
          <th
            key={i}
            colSpan={q.months.length}
            className="border-b px-0 py-2 text-xs font-bold text-gray-700 bg-gray-100 text-center"
          >
            {q.label}
          </th>
        ))}
      </tr>
    );
    // Row 2: Jan, Feb, ...
    headerRow2 = (
      <tr>
        <th className="border-b px-4 py-2 text-left w-72 bg-white" style={{ minWidth: 288, maxWidth: 288 }}></th>
        {quarters.map((q, i) =>
          q.months.map(mIdx => (
            <th
              key={q.label + mIdx}
              className="border-b px-0 py-2 w-[120px] text-xs font-normal text-gray-500 text-center"
            >
              {dayjs().month(mIdx).format("MMM")}
            </th>
          ))
        )}
      </tr>
    );
    days = months;
  }

  // --- BAR INDEX CALCULATION ---
  const getBarIdx = (date) => {
    if (!date) return -1;
    const d = dayjs(date);
    if (viewMode === 'weekly') {
      return weeklyDays.findIndex(w =>
        d.isSame(w.weekStart, 'week')
      );
    }
    if (viewMode === 'monthly') {
      return months.findIndex(m =>
        d.isSame(m, 'month')
      );
    }
    if (viewMode === 'quarterly') {
      return months.findIndex(m =>
        d.isSame(m, 'month')
      );
    }
    return -1;
  };

  const getBarLength = (startIdx, endIdx) => {
    if (startIdx < 0 || endIdx < 0) return 0;
    return endIdx - startIdx + 1;
  };

  return (
    <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">📅 Gantt Timeline</h2>}>
      <div className="p-6">

        {/* Filter */}
        <div className="flex flex-wrap gap-4 mb-6 items-end">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Project</label>
            <select
              className="border rounded px-3 py-2 min-w-[160px] max-w-xs"
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
            <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
            <select
              className="border rounded px-3 py-2 min-w-[160px] max-w-xs"
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
            <label className="block text-sm font-semibold text-gray-700 mb-1">Module</label>
            <select
              className="border rounded px-3 py-2 min-w-[160px] max-w-xs"
              value={filterModule}
              onChange={e => setFilterModule(e.target.value)}
            >
              <option value="">All Modules</option>
              {moduleOptions.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Year</label>
            <select
              className="border rounded px-3 py-2 min-w-[100px] max-w-xs"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {/* View mode as tab */}
          <div className="flex gap-2 items-center mt-2 md:mt-0">
            <div className="flex bg-gray-100 rounded-lg overflow-hidden border">
              <button
                className={`px-4 py-2 text-sm font-semibold focus:outline-none transition ${viewMode === 'weekly' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
                onClick={() => setViewMode('weekly')}
                type="button"
              >
                Weekly
              </button>
              <button
                className={`px-4 py-2 text-sm font-semibold focus:outline-none transition ${viewMode === 'monthly' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
                onClick={() => setViewMode('monthly')}
                type="button"
              >
                Monthly
              </button>
              <button
                className={`px-4 py-2 text-sm font-semibold focus:outline-none transition ${viewMode === 'quarterly' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}
                onClick={() => setViewMode('quarterly')}
                type="button"
              >
                Quarterly
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex space-x-4 text-sm mb-6">
          <div className="flex items-center space-x-1"><div className="w-4 h-4 bg-blue-600 rounded"></div><span>In Progress</span></div>
          <div className="flex items-center space-x-1"><div className="w-4 h-4 bg-green-600 rounded"></div><span>Done</span></div>
          <div className="flex items-center space-x-1"><div className="w-4 h-4 bg-gray-400 rounded"></div><span>Todo</span></div>
        </div>

        {/* Timeline Table */}
        <div
          className="border rounded bg-white shadow"
          style={{
            overflowX: "auto",
            overflowY: "hidden",
            WebkitOverflowScrolling: "touch",
            minHeight: "400px",
            maxWidth: "100vw"
          }}
        >
          <table
            className="border-separate border-spacing-0"
            style={{
              minWidth:
                (viewMode === 'weekly'
                  ? weeklyDays.length * 80
                  : months.length * 120) +
                288 + // sticky column
                "px"
            }}
          >
            <thead>
              {/* Header Row 1 */}
              <tr>
                <th
                  className="sticky left-0 z-30 bg-white border-b px-4 py-2 text-left w-72 align-bottom"
                  style={{ minWidth: 288, maxWidth: 288, background: "white" }}
                  rowSpan={headerRow2 ? 2 : 1}
                >
                  Items
                </th>
                {viewMode === "weekly" &&
                  weeksByMonth.map((monthWeeks, i) => (
                    <th
                      key={i}
                      colSpan={monthWeeks.length}
                      className="border-b px-0 py-2 text-xs font-bold text-gray-700 bg-gray-100 text-center"
                    >
                      {months[i].format("MMMM")}
                    </th>
                  ))}
                {viewMode === "monthly" &&
                  months.map((m, i) => (
                    <th
                      key={i}
                      className="border-b px-0 py-2 w-[120px] text-xs font-bold text-gray-700 bg-gray-100 text-center"
                    >
                      {m.format("MMMM")}
                    </th>
                  ))}
                {viewMode === "quarterly" &&
                  quarters.map((q, i) => (
                    <th
                      key={i}
                      colSpan={q.months.length}
                      className="border-b px-0 py-2 text-xs font-bold text-gray-700 bg-gray-100 text-center"
                    >
                      {q.label}
                    </th>
                  ))}
              </tr>
              {/* Header Row 2 */}
              {viewMode === "weekly" && (
                <tr>
                  {weeksByMonth.map((monthWeeks, i) =>
                    monthWeeks.map((w, j) => (
                      <th
                        key={i + "-" + j}
                        className="border-b px-0 py-2 w-[80px] text-xs font-normal text-gray-500 text-center"
                      >
                        {w.weekLabel}
                      </th>
                    ))
                  )}
                </tr>
              )}
              {viewMode === "quarterly" && (
                <tr>
                  {quarters.map((q, i) =>
                    q.months.map((mIdx) => (
                      <th
                        key={q.label + mIdx}
                        className="border-b px-0 py-2 w-[120px] text-xs font-normal text-gray-500 text-center"
                      >
                        {dayjs().month(mIdx).format("MMM")}
                      </th>
                    ))
                  )}
                </tr>
              )}
            </thead>
            <tbody>
              {tasksByProject.length === 0 && (
                <tr>
                  <td colSpan={days.length + 1} className="text-gray-400 text-center py-10">
                    No tasks to display.
                  </td>
                </tr>
              )}
              {tasksByProject.map((project) => (
                <React.Fragment key={project.id}>
                  {/* Project Name Row */}
                  <tr>
                    <td
                      className="sticky left-0 z-20 bg-gray-50 font-bold text-blue-800 px-4 py-2 border-b"
                      style={{
                        background: "#f9fafb",
                        minWidth: 288,
                        maxWidth: 288,
                        width: 288,
                        left: 0,
                        zIndex: 20
                      }}
                      colSpan={1}
                    >
                      <div className="flex items-center justify-between">
                        <span>{project.name}</span>
                        {/* Progress Bar */}
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded">
                            <div
                              className="h-2 rounded bg-gradient-to-r from-blue-400 to-green-400"
                              style={{ width: `${getProjectProgress(project.tasks)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">{getProjectProgress(project.tasks)}%</span>
                        </div>
                      </div>
                    </td>
                    {/* Empty cells for timeline */}
                    {(() => {
                      let count =
                        viewMode === "weekly"
                          ? weeklyDays.length
                          : months.length;
                      if (viewMode === "quarterly") count = months.length;
                      return Array.from({ length: count }).map((_, i) => (
                        <td
                          key={i}
                          className={`border-b px-0 py-2 ${isCurrentPeriod(i) ? 'bg-yellow-50' : ''}`}
                        ></td>
                      ));
                    })()}
                  </tr>
                  {/* Task Rows per Modul */}
                  {Object.entries(
                    project.tasks.reduce((acc, task) => {
                      const moduleName = task.module?.name || task.module_name || "Tanpa Modul";
                      if (!acc[moduleName]) acc[moduleName] = [];
                      acc[moduleName].push(task);
                      return acc;
                    }, {})
                  ).map(([moduleName, moduleTasks]) => (
                    <React.Fragment key={moduleName}>
                      {/* Modul Row */}
                      <tr>
                        <td
                          className="sticky left-0 z-10 bg-gray-100 px-6 py-2 border-b text-blue-700 font-semibold"
                          style={{
                            background: "#f3f4f6",
                            minWidth: 288,
                            maxWidth: 288,
                            width: 288,
                            left: 0,
                            zIndex: 10
                          }}
                          colSpan={1}
                        >
                          <div className="flex items-center justify-between">
                            <span>{moduleName}</span>
                            {/* Progress Bar Modul */}
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-gray-200 rounded">
                                <div
                                  className="h-2 rounded bg-gradient-to-r from-blue-400 to-green-400"
                                  style={{ width: `${getModuleProgress(moduleTasks)}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500">{getModuleProgress(moduleTasks)}%</span>
                            </div>
                          </div>
                        </td>
                        {Array.from({ length: viewMode === "weekly" ? weeklyDays.length : months.length }).map((_, i) => (
                          <td key={i} className="border-b px-0 py-2 bg-gray-50"></td>
                        ))}
                      </tr>
                      {moduleTasks.map((task) => {
                        const hasDate = task.start_date && task.due_date;
                        const startIdx = hasDate ? getBarIdx(task.start_date) : -1;
                        const endIdx = hasDate ? getBarIdx(task.due_date) : -1;
                        const barLength = getBarLength(startIdx, endIdx);
                        let count =
                          viewMode === "weekly"
                            ? weeklyDays.length
                            : months.length;
                        if (viewMode === "quarterly") count = months.length;
                        return (
                          <tr key={task.id} className="group hover:bg-blue-50 transition">
                            {/* Sticky task name */}
                            <td
                              className="sticky left-0 z-10 bg-white px-8 py-2 border-b w-72"
                              style={{
                                background: "white",
                                minWidth: 288,
                                maxWidth: 288,
                                width: 288,
                                left: 0,
                                zIndex: 10
                              }}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{task.title}</span>
                                <span className="text-xs text-gray-400">
                                  {task.status === "done"
                                    ? "✔️"
                                    : task.status === "in_progress"
                                    ? "⏳"
                                    : "•"}{" "}
                                  {task.status.replace("_", " ")}
                                </span>
                              </div>
                            </td>
                            {/* Timeline cells */}
                            {Array.from({ length: count }).map((_, i) => {
                              // Render bar only on the first cell of the bar
                              if (hasDate && i === startIdx && barLength > 0) {
                                return (
                                  <td
                                    key={i}
                                    colSpan={Math.min(barLength, count - startIdx)}
                                    className="relative px-0 py-2 border-b"
                                    style={{ padding: 0, background: "transparent" }}
                                  >
                                    <div
                                      className={`h-6 rounded flex items-center shadow group-hover:scale-105 transition-transform duration-150 ${getColor(task.status)}`}
                                      style={{
                                        width: `${
                                          Math.min(barLength, count - startIdx) *
                                            (viewMode === "weekly" ? 80 : 120) - 4
                                        }px`,
                                        minWidth: "28px",
                                        marginLeft: "2px",
                                        marginRight: "2px",
                                        position: "relative",
                                        background: task.status === "done"
                                          ? "linear-gradient(90deg, #34d399 0%, #10b981 100%)"
                                          : task.status === "in_progress"
                                          ? "linear-gradient(90deg, #60a5fa 0%, #2563eb 100%)"
                                          : "linear-gradient(90deg, #d1d5db 0%, #6b7280 100%)"
                                      }}
                                      title={`${task.title} (${dayjs(
                                        task.start_date
                                      ).format("MMM D")} → ${dayjs(
                                        task.due_date
                                      ).format("MMM D")})`}
                                    >
                                      {/* Avatar/Initials */}
                                      {task.assignee && (
                                        <span className="w-6 h-6 rounded-full bg-white text-blue-600 flex items-center justify-center text-xs font-bold mr-2 border border-blue-200">
                                          {task.assignee.name
                                            ? task.assignee.name.split(' ').map(n => n[0]).join('').toUpperCase()
                                            : "U"}
                                        </span>
                                      )}
                                      <span className="ml-2 text-xs text-white font-semibold truncate">
                                        {dayjs(task.start_date).format("MMM D")} -{" "}
                                        {dayjs(task.due_date).format("MMM D")}
                                      </span>
                                      <span className="ml-auto mr-2 text-xs text-white">
                                        {task.status === "done"
                                          ? "✔️"
                                          : task.status === "in_progress"
                                          ? "⏳"
                                          : ""}
                                      </span>
                                      {/* Tooltip */}
                                      <div className="absolute left-0 top-8 z-50 hidden group-hover:block bg-white border rounded shadow px-3 py-2 text-xs text-gray-700 min-w-[180px]">
                                        <div className="font-bold">{task.title}</div>
                                        <div>Status: <span className="capitalize">{task.status.replace("_", " ")}</span></div>
                                        <div>Start: {dayjs(task.start_date).format("DD MMM YYYY")}</div>
                                        <div>Due: {dayjs(task.due_date).format("DD MMM YYYY")}</div>
                                        {task.assignee && <div>Assignee: {task.assignee.name}</div>}
                                      </div>
                                    </div>
                                  </td>
                                );
                              }
                              // Render empty cell if not in bar range
                              if (!hasDate || i < startIdx || i > endIdx) {
                                return (
                                  <td key={i} className="border-b px-0 py-2"></td>
                                );
                              }
                              // Bar already rendered by colSpan
                              return null;
                            })}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
