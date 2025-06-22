import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { Transition } from '@headlessui/react';
import * as XLSX from 'xlsx'; // Tambahkan import ini


const priorities = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const statuses = [
  { value: '', label: 'Select Status' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export default function Task() {
  const { auth } = usePage().props;
  const currentUser = auth?.user;

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_date: '',
    due_date: '',
    link_issue: '',
    priority: 'medium',
    completed_at: '',
    status: 'todo', // default status todo
    project_id: '',
    assignment_id: '', // <--- assignment
    parent_id: '',
    estimated_hours: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState(null);
  const [notification, setNotification] = useState('');
  const [showSubtaskForm, setShowSubtaskForm] = useState({});
  const [subtaskForm, setSubtaskForm] = useState({});
  const [collapsed, setCollapsed] = useState({});

  // State untuk filter
  const [filterProject, setFilterProject] = useState('');
  const [filterAssignment, setFilterAssignment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Tambahkan state untuk pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(5);

  useEffect(() => {
    fetchTasks();
    fetchProjects();
    fetchUsers();
  }, []);

  // Ambil project_id dari query string jika ada
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project');
    const assignmentId = params.get('assignment');
    if (projectId) setFilterProject(projectId);
    if (assignmentId) setFilterAssignment(assignmentId);
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await axios.get('/tasks');
      setTasks(res.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch tasks.');
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/projects');
      setProjects(res.data);
    } catch {
      setProjects([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/users');
      setUsers(res.data);
    } catch {
      setUsers([]);
    }
  };

  // Always store id as string for select fields
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (['assignment_id', 'project_id', 'parent_id'].includes(name)) {
      setForm({ ...form, [name]: value === '' ? '' : String(value) });
    } else if (name === 'status') {
      if (value === 'done') {
        setForm((prev) => ({
          ...prev,
          status: value,
          completed_at: new Date().toISOString().slice(0, 10),
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          status: value,
          completed_at: '',
        }));
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm({
      title: '',
      description: '',
      start_date: '',
      due_date: '',
      link_issue: '',
      priority: 'medium',
      completed_at: '',
      status: 'todo',
      project_id: '',
      assignment_id: '',
      parent_id: '',
      estimated_hours: '',
    });
    setError('');
  };

  // Subtask form change handler
  const handleSubtaskChange = (taskId, e) => {
    const { name, value } = e.target;
    setSubtaskForm((prev) => ({
      ...prev,
      [taskId]: {
        status: prev[taskId]?.status || 'todo', // default status todo jika belum ada
        ...prev[taskId],
        [name]: ['assignment_id', 'project_id', 'parent_id'].includes(name)
          ? value === '' ? '' : String(value)
          : value,
        ...(name === 'status'
          ? value === 'done'
            ? { completed_at: new Date().toISOString().slice(0, 10) }
            : { completed_at: '' }
          : {}),
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form };
      ['assignment_id', 'project_id', 'parent_id'].forEach((key) => {
        if (payload[key] !== undefined && payload[key] !== '') {
          payload[key] = Number(payload[key]);
        }
      });

      if (editingId) {
        await axios.put(`/tasks/${editingId}`, payload);
        setNotification('Task updated successfully!');
      } else {
        await axios.post('/tasks', payload);
        setNotification('Task added successfully!');
      }
      setForm({
        title: '',
        description: '',
        start_date: '',
        due_date: '',
        link_issue: '',
        priority: 'medium',
        completed_at: '',
        status: 'todo',
        project_id: '',
        assignment_id: '',
        parent_id: '',
        estimated_hours: '',
      });
      setEditingId(null);
      setShowModal(false);
      fetchTasks();
      setTimeout(() => setNotification(''), 2500);
    } catch (err) {
      let msg = 'Failed to save task.';
      if (err.response && err.response.data && err.response.data.errors) {
        msg = Object.values(err.response.data.errors).flat().join(', ');
      } else if (err.response && err.response.data && err.response.data.message) {
        msg = err.response.data.message;
      }
      setError(msg);
      setNotification(`Failed to ${editingId ? 'update' : 'add'} task: ${msg}`);
      setTimeout(() => setNotification(''), 3500);
    }
  };

  // Subtask submit handler
  const handleSubtaskSubmit = async (taskId, e) => {
    e.preventDefault();
    setError('');
    const parentTask = tasks.find(t => t.id === taskId);
    const subForm = subtaskForm[taskId] || {};

    // Validasi tanggal
    if (parentTask) {
      if (subForm.start_date && parentTask.start_date && subForm.start_date < parentTask.start_date) {
        setError('Subtask start date tidak boleh sebelum parent task.');
        setNotification('Failed to add subtask: Subtask start date tidak boleh sebelum parent task.');
        setTimeout(() => setNotification(''), 3500);
        return;
      }
      if (subForm.due_date && parentTask.due_date && subForm.due_date > parentTask.due_date) {
        setError('Subtask due date tidak boleh melebihi parent task.');
        setNotification('Failed to add subtask: Subtask due date tidak boleh melebihi parent task.');
        setTimeout(() => setNotification(''), 3500);
        return;
      }
    }

    try {
      const payload = {
        ...subForm,
        parent_id: String(taskId),
        project_id: parentTask?.project_id || '', // project otomatis sama dengan parent
      };
      Object.keys(payload).forEach(
        (key) => payload[key] === '' && delete payload[key]
      );
      ['assignment_id', 'project_id', 'parent_id'].forEach((key) => {
        if (payload[key] !== undefined && payload[key] !== '') {
          payload[key] = Number(payload[key]);
        }
      });
      await axios.post('/tasks', payload);
      setNotification('Subtask added successfully!');
      setSubtaskForm((prev) => ({ ...prev, [taskId]: undefined }));
      setShowSubtaskForm((prev) => ({ ...prev, [taskId]: false }));
      fetchTasks();
      setTimeout(() => setNotification(''), 2000);
    } catch (err) {
      let msg = 'Failed to add subtask.';
      if (err.response && err.response.data && err.response.data.errors) {
        msg = Object.values(err.response.data.errors).flat().join(', ');
      } else if (err.response && err.response.data && err.response.data.message) {
        msg = err.response.data.message;
      }
      setError(msg);
      setNotification(`Failed to add subtask: ${msg}`);
      setTimeout(() => setNotification(''), 3500);
    }
  };

  // Ganti handleEdit agar edit inline, bukan modal
  const handleEdit = (task) => {
    setEditingId(task.id);
    setForm({
      title: task.title || '',
      description: task.description || '',
      start_date: task.start_date || '',
      due_date: task.due_date || '',
      link_issue: task.link_issue || '',
      priority: task.priority || 'medium',
      completed_at: task.completed_at ? task.completed_at.substring(0, 10) : '',
      status: task.status || '',
      project_id: task.project_id ? String(task.project_id) : '',
      assignment_id: task.assignment_id ? String(task.assignment_id) : '',
      parent_id: task.parent_id ? String(task.parent_id) : '',
      estimated_hours: task.estimated_hours || '',
    });
    setShowModal(true);
    setError('');
  };

  const handleDelete = async (id) => {
    setError('');
    setShowDeleteModal(true);
    setDeleteTaskId(id);
  };

  const handleAddTask = () => {
    setEditingId(null);
    setForm({
      title: '',
      description: '',
      start_date: '',
      due_date: '',
      link_issue: '',
      priority: 'medium',
      completed_at: '',
      status: 'todo',
      project_id: '',
      assignment_id: '',
      parent_id: '',
      estimated_hours: '',
    });
    setShowModal(true);
    setError('');
  };

  const confirmDelete = async () => {
    setError('');
    try {
      await axios.delete(`/tasks/${deleteTaskId}`);
      setShowDeleteModal(false);
      setDeleteTaskId(null);
      setNotification('Task deleted successfully!');
      fetchTasks();
      setTimeout(() => setNotification(''), 2000);
    } catch (err) {
      let msg = 'Failed to delete task.';
      if (err.response && err.response.data && err.response.data.message) {
        msg = err.response.data.message;
      }
      setError(msg);
      setNotification(`Failed to delete task: ${msg}`);
      setShowDeleteModal(false);
      setDeleteTaskId(null);
      setTimeout(() => setNotification(''), 3500);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteTaskId(null);
  };

  // Filtered tasks
  const filteredTasks = tasks.filter((t) => {
    if (filterProject && String(t.project_id) !== String(filterProject)) return false;
    if (filterAssignment && String(t.assignment_id) !== String(filterAssignment)) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    return true;
  });

  // Pagination logic
  const totalTasks = filteredTasks.filter(t => !t.parent_id).length;
  const totalPages = Math.ceil(totalTasks / perPage);
  const paginatedTasks = filteredTasks
    .filter(t => !t.parent_id)
    .slice((currentPage - 1) * perPage, currentPage * perPage);

  // Reset page jika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [filterProject, filterAssignment, filterStatus]);

  // Tambahkan helper untuk mendapatkan project berdasarkan id
  const getProject = (projectId) => {
    if (!projectId) return null;
    return projects.find((p) => String(p.id) === String(projectId));
  };

  // Tambahkan helper untuk mendapatkan user berdasarkan id
  const getUser = (userId) => {
    if (!userId) return null;
    return users.find((u) => String(u.id) === String(userId));
  };

  // Helper untuk mendapatkan user pada project tertentu
  const getProjectUsers = (projectId) => {
    if (!projectId) return users;
    const project = projects.find((p) => String(p.id) === String(projectId));
    if (project && project.members) {
      return users.filter((u) => project.members.some((m) => m.id === u.id));
    }
    return users;
  };

  // Tambahkan fungsi export ke Excel
  const handleExportExcel = () => {
    // Gabungkan parent dan subtask
    const exportData = [];
    filteredTasks
      .filter(t => !t.parent_id)
      .forEach((task, idx) => {
        exportData.push({
          No: idx + 1,
          Title: task.title,
          Project: getProject(task.project_id)?.name || '-',
          Assignment: getUser(task.assignment_id)?.name || '-',
          Priority: task.priority,
          Status: task.status,
          'Start Date': task.start_date,
          'Due Date': task.due_date,
          'Completed At': task.completed_at,
          'Estimated Hours': task.estimated_hours,
          'Link Issue': task.link_issue,
          'Parent?': '-',
        });
        // Subtasks
        filteredTasks
          .filter(sub => sub.parent_id === task.id)
          .forEach((sub, subIdx) => {
            exportData.push({
              No: `${idx + 1}.${subIdx + 1}`,
              Title: sub.title,
              Project: getProject(sub.project_id)?.name || '-',
              Assignment: getUser(sub.assignment_id)?.name || '-',
              Priority: sub.priority,
              Status: sub.status,
              'Start Date': sub.start_date,
              'Due Date': sub.due_date,
              'Completed At': sub.completed_at,
              'Estimated Hours': sub.estimated_hours,
              'Link Issue': sub.link_issue,
              'Parent?': task.title,
            });
          });
      });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
    XLSX.writeFile(wb, 'tasks.xlsx');
  };

  return (
    <AuthenticatedLayout
      header={
        <h2 className="font-semibold text-xl text-gray-800 leading-tight">
          <span className="inline-flex items-center gap-2">
            <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6m9-6a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Task Management
          </span>
        </h2>
      }
    >
      <Head title="Task" />
      <div className="max-w-screen-2xl mx-auto py-8">
        {/* Filter Bar */}
        <div className="flex flex-wrap gap-4 mb-6 items-end">
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
            <label className="block text-sm font-semibold text-gray-700 mb-1">Assignment</label>
            <select
              className="border rounded px-3 py-2 min-w-[200px] max-w-xs"
              value={filterAssignment}
              onChange={e => setFilterAssignment(e.target.value)}
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
        </div>
        {/* Notification */}
        <Transition
          show={!!notification}
          enter="transition-opacity duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="mb-4 p-3 bg-gradient-to-r from-green-100 to-green-50 text-green-700 rounded shadow text-center font-semibold">
            {notification}
          </div>
        </Transition>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-blue-800 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6m9-6a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Task List
          </h2>
          <div className="flex gap-2">
            {/* Tambahkan tombol Download Excel */}
            <button
              onClick={handleExportExcel}
              className="bg-gradient-to-r from-green-400 to-green-600 text-white px-5 py-2 rounded-xl hover:from-green-500 hover:to-green-700 transition font-bold shadow flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
              Download Excel
            </button>
            <button
              onClick={handleAddTask}
              className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-6 py-2 rounded-xl hover:from-blue-600 hover:to-blue-800 transition font-bold shadow flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Add Task
            </button>
          </div>
        </div>
        {error && (
          <Transition
            show={!!error}
            enter="transition-opacity duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="mb-4 p-3 bg-gradient-to-r from-red-100 to-red-50 text-red-700 rounded shadow text-center font-semibold">
              {error}
            </div>
          </Transition>
        )}

        {/* DataTable */}
        <div className="w-full overflow-x-auto rounded-xxl shadow border border-blue-100 bg-gradient-to-br from-blue-50 to-white">
          <table className="w-full bg-white rounded-xl">
            <thead>
              <tr className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-900">
                <th className="py-3 px-4 text-left font-semibold w-10">#</th>
                <th className="py-3 px-4 text-left font-semibold min-w-[180px]">Title</th>
                <th className="py-3 px-4 text-left font-semibold min-w-[140px]">Project</th>
                <th className="py-3 px-4 text-left font-semibold min-w-[140px]">Assignment</th>
                <th className="py-3 px-4 text-left font-semibold w-24">Priority</th>
                <th className="py-3 px-4 text-left font-semibold w-28">Status</th>
                <th className="py-3 px-4 text-left font-semibold w-32">Start</th>
                <th className="py-3 px-4 text-left font-semibold w-32">Due</th>
                <th className="py-3 px-4 text-left font-semibold w-32">Completed</th>
                <th className="py-3 px-4 text-left font-semibold w-24">Est. Hours</th>
                <th className="py-3 px-4 text-left font-semibold w-20">Link</th>
                <th className="py-3 px-4 text-left font-semibold w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTasks.length === 0 && (
                <tr>
                  <td colSpan={12} className="text-center py-6 text-gray-500 bg-gray-50 rounded-b-xl">
                    <span className="inline-flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8" /></svg>
                      No tasks found.
                    </span>
                  </td>
                </tr>
              )}
              {paginatedTasks.map((task, idx) => {
                const subtasks = filteredTasks.filter((t) => t.parent_id === task.id);
                const isCollapsed = collapsed[task.id] === false ? false : true;
                return (
                  <React.Fragment key={task.id}>
                    <tr className={`border-t transition hover:bg-blue-50 bg-white`}>
                      <td className="py-2 px-4 text-gray-500 align-top">{idx + 1}</td>
                      <td className="py-2 px-4 font-medium text-blue-800 align-top">
                        <div className="flex items-center gap-2">
                          {subtasks.length > 0 && (
                            <button
                              type="button"
                              className="focus:outline-none"
                              onClick={() => toggleCollapse(task.id)}
                              title={isCollapsed ? 'Show Subtasks' : 'Hide Subtasks'}
                            >
                              <svg
                                className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-0' : 'rotate-90'}`}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          )}
                          <span>{task.title}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{task.description}</div>
                      </td>
                      <td className="py-2 px-4 text-gray-700 align-top">
                        {getProject(task.project_id)?.name || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="py-2 px-4 text-gray-700 align-top">
                        {getUser(task.assignment_id)?.name || <span className="text-gray-400">-</span>}
                        {getUser(task.assignment_id)?.email && (
                          <div className="text-xs text-gray-400">{getUser(task.assignment_id)?.email}</div>
                        )}
                      </td>
                      <td className="py-2 px-4 align-top">
                        <span
                          className={
                            task.priority === 'high'
                              ? 'bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold'
                              : task.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-semibold'
                              : 'bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold'
                          }
                        >
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </span>
                      </td>
                      <td className="py-2 px-4 align-top">
                        <span
                          className={
                            task.status === 'done'
                              ? 'bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold'
                              : task.status === 'in_progress'
                              ? 'bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-semibold'
                              : 'bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-semibold'
                          }
                        >
                          {task.status ? task.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : '-'}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-gray-600 align-top">{task.start_date || '-'}</td>
                      <td className="py-2 px-4 text-gray-600 align-top">{task.due_date || '-'}</td>
                      <td className="py-2 px-4 text-gray-600 align-top">
                        {task.completed_at ? task.completed_at.substring(0, 10) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="py-2 px-4 text-gray-600 align-top">
                        {typeof task.estimated_hours !== 'undefined' && task.estimated_hours !== null && task.estimated_hours !== ''
                          ? Number(task.estimated_hours).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' jam'
                          : <span className="text-gray-400">-</span>
                        }
                      </td>
                      <td className="py-2 px-4 align-top">
                        {task.link_issue ? (
                          <a
                            href={task.link_issue}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline hover:text-blue-800"
                          >
                            Link
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-2 px-4 flex gap-2 align-top">
                        <button
                          onClick={() => handleEdit(task)}
                          className="p-2 rounded hover:bg-yellow-100 transition"
                          title="Edit"
                          type="button"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-2.828 0L5 11.828a2 2 0 010-2.828L11.586 2.586a2 2 0 012.828 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="p-2 rounded hover:bg-red-100 transition"
                          title="Delete"
                          type="button"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <button
                          onClick={() =>
                            setShowSubtaskForm((prev) => ({
                              ...prev,
                              [task.id]: !prev[task.id],
                            }))
                          }
                          className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200 transition group"
                          title="Add Subtask"
                          type="button"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-blue-600 group-hover:scale-110 group-hover:text-blue-700 transition-transform duration-150"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              fillRule="evenodd"
                              d="M12 4a1 1 0 011 1v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H5a1 1 0 110-2h6V5a1 1 0 011-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                    {/* Subtask form row */}
                    {showSubtaskForm[task.id] && (
                      <tr>
                        <td colSpan={11} className="bg-blue-50 border-t">
                          <form
                            className="flex flex-wrap gap-2 items-end p-3"
                            onSubmit={(e) => handleSubtaskSubmit(task.id, e)}
                          >
                            <input
                              type="text"
                              name="title"
                              placeholder="Subtask title"
                              className="border border-blue-200 rounded px-2 py-1 flex-1 min-w-[120px]"
                              value={subtaskForm[task.id]?.title || ''}
                              onChange={(e) => handleSubtaskChange(task.id, e)}
                              required
                            />
                            <input
                              type="text"
                              name="description"
                              placeholder="Description"
                              className="border border-blue-200 rounded px-2 py-1 flex-1 min-w-[120px]"
                              value={subtaskForm[task.id]?.description || ''}
                              onChange={(e) => handleSubtaskChange(task.id, e)}
                            />
                            <input
                              type="date"
                              name="start_date"
                              className="border border-blue-200 rounded px-2 py-1"
                              value={subtaskForm[task.id]?.start_date || ''}
                              min={task.start_date || ''}
                              max={task.due_date || ''}
                              onChange={(e) => handleSubtaskChange(task.id, e)}
                              required
                            />
                            <input
                              type="date"
                              name="due_date"
                              className="border border-blue-200 rounded px-2 py-1"
                              value={subtaskForm[task.id]?.due_date || ''}
                              min={subtaskForm[task.id]?.start_date || task.start_date || ''}
                              max={task.due_date || ''}
                              onChange={(e) => handleSubtaskChange(task.id, e)}
                              required
                            />
                            <select
                              name="assignment_id"
                              className="border border-blue-200 rounded px-2 py-1"
                              value={subtaskForm[task.id]?.assignment_id || ''}
                              onChange={(e) => handleSubtaskChange(task.id, e)}
                            >
                              <option value="">Assign</option>
                              {getProjectUsers(task.project_id).map((user) => (
                                <option key={user.id} value={String(user.id)}>
                                  {user.name}
                                </option>
                              ))}
                            </select>
                            <select
                              name="priority"
                              className="border border-blue-200 rounded px-2 py-1"
                              value={subtaskForm[task.id]?.priority || 'medium'}
                              onChange={(e) => handleSubtaskChange(task.id, e)}
                            >
                              {priorities.map((p) => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                              ))}
                            </select>
                            <select
                              name="status"
                              className="border border-blue-200 rounded px-2 py-1"
                              value={subtaskForm[task.id]?.status || ''}
                              onChange={(e) => handleSubtaskChange(task.id, e)}
                            >
                              {statuses.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              name="estimated_hours"
                              className="border border-blue-200 rounded px-2 py-1"
                              value={subtaskForm[task.id]?.estimated_hours || ''}
                              onChange={(e) => handleSubtaskChange(task.id, e)}
                              min={0}
                              step={0.25}
                              placeholder="Jam"
                            />
                            <button
                              type="submit"
                              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition font-semibold"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 transition font-semibold"
                              onClick={() =>
                                setShowSubtaskForm((prev) => ({
                                  ...prev,
                                  [task.id]: false,
                                }))
                              }
                            >
                              Cancel
                            </button>
                          </form>
                        </td>
                      </tr>
                    )}
                    {/* Subtasks rows */}
                    {!isCollapsed && subtasks.length > 0 && subtasks.map((sub, subIdx) => (
                      <tr key={sub.id} className="bg-blue-50 border-t">
                        <td className="py-2 px-4 text-gray-400 align-top pl-8">{idx + 1}.{subIdx + 1}</td>
                        <td className="py-2 px-4 font-medium text-blue-600 align-top">
                          <div>{sub.title}</div>
                          <div className="text-xs text-gray-500 mt-1">{sub.description}</div>
                        </td>
                        <td className="py-2 px-4 text-gray-600 align-top">
                          {getProject(sub.project_id)?.name || <span className="text-gray-400">-</span>}
                        </td>
                        <td className="py-2 px-4 text-gray-600 align-top">
                          {getUser(sub.assignment_id)?.name || <span className="text-gray-400">-</span>}
                          {getUser(sub.assignment_id)?.email && (
                            <div className="text-xs text-gray-400">{getUser(sub.assignment_id)?.email}</div>
                          )}
                        </td>
                        {/* <td className="py-2 px-4 text-gray-600 align-top">
                          {getTask(sub.parent_id)?.title || <span className="text-gray-400">-</span>}
                        </td> */}
                        <td className="py-2 px-4 align-top">
                          <span
                            className={
                              sub.priority === 'high'
                                ? 'bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold'
                                : sub.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-semibold'
                                : 'bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold'
                            }
                          >
                            {sub.priority.charAt(0).toUpperCase() + sub.priority.slice(1)}
                          </span>
                        </td>
                        <td className="py-2 px-4 align-top">
                          <span
                            className={
                              sub.status === 'done'
                                ? 'bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold'
                                : sub.status === 'in_progress'
                                ? 'bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-semibold'
                                : 'bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-semibold'
                            }
                          >
                            {sub.status ? sub.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : '-'}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-gray-600 align-top">{sub.start_date || '-'}</td>
                        <td className="py-2 px-4 text-gray-600 align-top">{sub.due_date || '-'}</td>
                        <td className="py-2 px-4 text-gray-600 align-top">
                          {sub.completed_at ? sub.completed_at.substring(0, 10) : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="py-2 px-4 text-gray-600 align-top">
                          {typeof sub.estimated_hours !== 'undefined' && sub.estimated_hours !== null && sub.estimated_hours !== ''
                            ? Number(sub.estimated_hours).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' jam'
                            : <span className="text-gray-400">-</span>
                          }
                        </td>
                        <td className="py-2 px-4 align-top">
                          {sub.link_issue ? (
                            <a
                              href={sub.link_issue}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline hover:text-blue-800"
                            >
                              Link
                            </a>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-4 flex gap-2 align-top">
                          <button
                            onClick={() => handleEdit(sub)}
                            className="p-2 rounded hover:bg-yellow-100 transition"
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-2.828 0L5 11.828a2 2 0 010-2.828L11.586 2.586a2 2 0 012.828 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="p-2 rounded hover:bg-red-100 transition"
                            title="Delete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* End DataTable */}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                className={`px-3 py-1 rounded ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 transition-all">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-0 relative animate-fade-in border border-blue-100">
              {/* Header */}
              <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-blue-50 rounded-t-3xl bg-gradient-to-r from-blue-50 to-blue-100">
                <h3 className="text-2xl font-extrabold text-blue-700 flex items-center gap-2 tracking-tight">
                  <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  {editingId ? 'Edit Task' : 'Add Task'}
                </h3>
                <button
                  className="text-gray-400 hover:text-gray-700 text-3xl font-bold focus:outline-none"
                  onClick={handleCloseModal}
                  aria-label="Close"
                  type="button"
                >
                  &times;
                </button>
              </div>
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4 px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700">Title</label>
                    <input
                      type="text"
                      name="title"
                      className="w-full border border-blue-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition shadow-sm bg-blue-50"
                      placeholder="Task title"
                      value={form.title}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700">Project</label>
                    <select
                      name="project_id"
                      className="w-full border border-blue-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition shadow-sm bg-blue-50"
                      value={form.project_id}
                      onChange={handleChange}
                    >
                      <option value="">-- Select Project --</option>
                      {projects.map((project) => (
                        <option key={project.id} value={String(project.id)}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700">Assignment</label>
                    <select
                      name="assignment_id"
                      className="w-full border border-blue-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition shadow-sm bg-blue-50"
                      value={form.assignment_id}
                      onChange={handleChange}
                    >
                      <option value="">-- Select User --</option>
                      {getProjectUsers(form.project_id).map((user) => (
                        <option key={user.id} value={String(user.id)}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700">Parent Task</label>
                    <select
                      name="parent_id"
                      className="w-full border border-blue-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition shadow-sm bg-blue-50"
                      value={form.parent_id}
                      onChange={handleChange}
                    >
                      <option value="">-- None --</option>
                      {tasks
                        .filter((t) => !editingId || t.id !== editingId)
                        .map((t) => (
                          <option key={t.id} value={String(t.id)}>
                            {t.title}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700">Priority</label>
                    <select
                      name="priority"
                      className="w-full border border-blue-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition shadow-sm bg-blue-50"
                      value={form.priority}
                      onChange={handleChange}
                    >
                      {priorities.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700">Status</label>
                    <select
                      name="status"
                      className="w-full border border-blue-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition shadow-sm bg-blue-50"
                      value={form.status}
                      onChange={handleChange}
                    >
                      {statuses.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700">Start Date</label>
                    <input
                      type="date"
                      name="start_date"
                      className="w-full border border-blue-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition shadow-sm bg-blue-50"
                      value={form.start_date}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700">Due Date</label>
                    <input
                      type="date"
                      name="due_date"
                      className="w-full border border-blue-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition shadow-sm bg-blue-50"
                      value={form.due_date}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700">Description</label>
                  <textarea
                    name="description"
                    className="w-full border border-blue-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition shadow-sm bg-blue-50"
                    placeholder="Description"
                    value={form.description}
                    onChange={handleChange}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700">Link Issue</label>
                    <input
                      type="text"
                      name="link_issue"
                      className="w-full border border-blue-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition shadow-sm bg-blue-50"
                      placeholder="Link Issue"
                      value={form.link_issue}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700">Completed At</label>
                    <input
                      type="date"
                      name="completed_at"
                      className="w-full border border-blue-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition shadow-sm bg-blue-50"
                      value={form.completed_at}
                      onChange={handleChange}
                      disabled={form.status !== 'done'}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1 text-gray-700">Estimated Hours</label>
                    <input
                      type="number"
                      name="estimated_hours"
                      className="w-full border border-blue-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition shadow-sm bg-blue-50"
                      placeholder="Estimated hours"
                      value={form.estimated_hours}
                      onChange={handleChange}
                      min={0}
                      step={0.25}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-8 justify-end">
                  <button
                    type="button"
                    className="bg-gray-100 text-gray-700 px-5 py-2 rounded-xl hover:bg-gray-200 transition font-semibold border border-gray-200"
                    onClick={handleCloseModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-7 py-2 rounded-xl hover:from-blue-600 hover:to-blue-800 transition font-bold shadow"
                  >
                    {editingId ? 'Update' : 'Add'} Task
                  </button>
                </div>
                {error && (
                  <div className="mt-2 p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>
                )}
              </form>
            </div>
          </div>
        )}
        {/* End Modal */}
        {/* Modal Delete Confirmation */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 transition-all">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 relative animate-fade-in">
              <button
                className="absolute top-3 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
                onClick={cancelDelete}
                aria-label="Close"
                type="button"
              >
                &times;
              </button>
              <div className="flex flex-col items-center">
                <svg className="w-12 h-12 text-red-500 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <h3 className="text-lg font-bold mb-2 text-gray-800">Delete Task</h3>
                <p className="mb-4 text-gray-600 text-center">Are you sure you want to delete this task?</p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={cancelDelete}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* End Modal Delete Confirmation */}
      </div>
    </AuthenticatedLayout>
  );
}