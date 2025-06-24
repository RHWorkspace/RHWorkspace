import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';

export default function Projects() {
  const { auth } = usePage().props;
  const currentUser = auth?.user;

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: '',
    desc: '',
    owner: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');
  const [showModal, setShowModal] = useState(false);

  // State for member management
  const [memberModalProject, setMemberModalProject] = useState(null);
  const [memberToAdd, setMemberToAdd] = useState('');
  const [memberError, setMemberError] = useState('');
  const [memberLoading, setMemberLoading] = useState(false);
  const [showModules, setShowModules] = useState({});

  // Tambahkan state untuk semua tasks
  const [tasks, setTasks] = useState([]);

  // Tambahkan state untuk edit role
  const [editingRoleUserId, setEditingRoleUserId] = useState(null);
  const [editingRoleValue, setEditingRoleValue] = useState('member');
  const [roleLoading, setRoleLoading] = useState(false);

  // Tambahkan state untuk show/hide member info per project
  const [showMembers, setShowMembers] = useState({});

  // State untuk modal module
  const [moduleModalProject, setModuleModalProject] = useState(null);
  const [modules, setModules] = useState([]);
  // Hapus desc dari state moduleForm
  const [moduleForm, setModuleForm] = useState({ name: '' });
  const [moduleError, setModuleError] = useState('');
  const [moduleLoading, setModuleLoading] = useState(false);

  // Tambahkan state untuk edit module
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [editingModuleName, setEditingModuleName] = useState('');

  useEffect(() => {
    fetchProjects();
    fetchUsers();
    fetchTasks();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/projects');
      setProjects(res.data);
    } catch {
      setError('Failed to fetch projects.');
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

  const fetchTasks = async () => {
    try {
      const res = await axios.get('/tasks');
      setTasks(res.data);
    } catch {
      setTasks([]);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = () => {
    setEditingId(null);
    setForm({ name: '', desc: '', owner: currentUser?.id || '' });
    setShowModal(true);
    setError('');
  };

  const handleEdit = (project) => {
    setEditingId(project.id);
    setForm({
      name: project.name || '',
      desc: project.desc || '',
      owner: currentUser?.id || '',
    });
    setShowModal(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, owner: currentUser?.id || '' };
      if (editingId) {
        await axios.put(`/projects/${editingId}`, payload);
        setNotification('Project updated successfully!');
      } else {
        await axios.post('/projects', payload);
        setNotification('Project added successfully!');
      }
      setShowModal(false);
      setForm({ name: '', desc: '', owner: '' });
      setEditingId(null);
      fetchProjects();
      setTimeout(() => setNotification(''), 2000);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.errors) {
        setError(
          Object.values(err.response.data.errors)
            .flat()
            .join(', ')
        );
      } else {
        setError('Failed to save project.');
      }
    }
  };

  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteProjectName, setDeleteProjectName] = useState('');

  const handleDelete = (id, name) => {
    setDeleteId(id);
    setDeleteProjectName(name);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`/projects/${deleteId}`);
      setNotification('Project deleted successfully!');
      setShowDeleteModal(false);
      setDeleteId(null);
      setDeleteProjectName('');
      fetchProjects();
      setTimeout(() => setNotification(''), 2000);
    } catch {
      setError('Failed to delete project.');
      setShowDeleteModal(false);
      setDeleteId(null);
      setDeleteProjectName('');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeleteId(null);
    setDeleteProjectName('');
  };

  const handleProjectClick = (projectId) => {
    router.get(`/tasks-page?project=${projectId}`);
  };

  // --- Member Management ---
  const openMemberModal = (project) => {
    // Selalu ambil data terbaru dari backend saat buka modal
    axios.get(`/projects/${project.id}`).then(res => {
      setMemberModalProject(res.data);
      setMemberToAdd('');
      setMemberError('');
    });
  };

  const closeMemberModal = () => {
    setMemberModalProject(null);
    setMemberToAdd('');
    setMemberError('');
  };

  const handleAddMember = async () => {
    if (!memberToAdd) {
      setMemberError('Please select a user.');
      return;
    }
    setMemberLoading(true);
    try {
      await axios.post(`/projects/${memberModalProject.id}/members`, {
        user_id: memberToAdd,
        role: memberModalProject.roleToAdd || 'member',
      });
      setNotification('Member added successfully!');
      // Refresh member list di modal
      const res = await axios.get(`/projects/${memberModalProject.id}`);
      setMemberModalProject(res.data);
      setMemberToAdd('');
      setMemberError('');
      // Refresh card project
      fetchProjects();
      setTimeout(() => setNotification(''), 2000);
    } catch (err) {
      setMemberError('Failed to add member.');
    }
    setMemberLoading(false);
  };

  const handleDeleteMember = async (userId) => {
    setMemberLoading(true);
    try {
      await axios.delete(`/projects/${memberModalProject.id}/members/${userId}`);
      setNotification('Member removed successfully!');
      // Refresh member list di modal
      const res = await axios.get(`/projects/${memberModalProject.id}`);
      setMemberModalProject(res.data);
      // Refresh card project
      fetchProjects();
      setTimeout(() => setNotification(''), 2000);
    } catch (err) {
      setMemberError('Failed to remove member.');
    }
    setMemberLoading(false);
  };

  // Handler untuk mulai edit role
  const startEditRole = (userId, currentRole) => {
    setEditingRoleUserId(userId);
    setEditingRoleValue(currentRole);
  };

  // Handler untuk simpan role baru
  const saveEditRole = async (userId) => {
    setRoleLoading(true);
    try {
      await axios.put(`/projects/${memberModalProject.id}/members/${userId}`, {
        role: editingRoleValue,
      });
      // Refresh member list di modal
      const res = await axios.get(`/projects/${memberModalProject.id}`);
      setMemberModalProject(res.data);
      setNotification('Role updated!');
      setTimeout(() => setNotification(''), 1500);
      setEditingRoleUserId(null);
    } catch {
      setMemberError('Failed to update role.');
    }
    setRoleLoading(false);
  };

  // Handler batal edit role
  const cancelEditRole = () => {
    setEditingRoleUserId(null);
    setEditingRoleValue('member');
  };

  // Helper untuk menghitung jumlah task per status pada project (tambahkan overdue)
  const getProjectTaskStats = (projectId) => {
    const projectTasks = tasks.filter(t => String(t.project_id) === String(projectId));
    const total = projectTasks.length;
    const todo = projectTasks.filter(t => t.status === 'todo').length;
    const inProgress = projectTasks.filter(t => t.status === 'in_progress').length;
    const done = projectTasks.filter(t => t.status === 'done').length;
    const now = new Date();
    const overdue = projectTasks.filter(
      t => t.status !== 'done' && t.due_date && new Date(t.due_date) < now
    ).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, todo, inProgress, done, overdue, percent };
  };

  const toggleShowMembers = (projectId) => {
    setShowMembers((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const toggleShowModules = (projectId) => {
    setShowModules((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  // Buka modal module
  const openModuleModal = (project) => {
    setModuleModalProject(project);
    setModules(project.modules || []);
    setModuleForm({ name: '' }); // Hapus desc
    setModuleError('');
  };

  // Tutup modal module
  const closeModuleModal = () => {
    setModuleModalProject(null);
    setModules([]);
    setModuleForm({ name: '' }); // Hapus desc
    setModuleError('');
  };

  // Tambah module
  const handleAddModule = async () => {
    if (!moduleForm.name) {
      setModuleError('Module name is required.');
      return;
    }
    setModuleLoading(true);
    try {
      // Kirim hanya name
      const res = await axios.post(`/projects/${moduleModalProject.id}/modules`, { name: moduleForm.name });
      setModules(res.data.project.modules);
      setModuleForm({ name: '' }); // Hapus desc
      setModuleError('');
      fetchProjects(); // refresh project list
    } catch {
      setModuleError('Failed to add module.');
    }
    setModuleLoading(false);
  };

  const startEditModule = (mod) => {
    setEditingModuleId(mod.id);
    setEditingModuleName(mod.name);
  };

  const cancelEditModule = () => {
    setEditingModuleId(null);
    setEditingModuleName('');
  };

  const handleEditModule = async (modId) => {
    if (!editingModuleName) {
      setModuleError('Module name is required.');
      return;
    }
    setModuleLoading(true);
    try {
      await axios.put(`/projects/${moduleModalProject.id}/modules/${modId}`, { name: editingModuleName });
      // Refresh modules
      const res = await axios.get(`/projects/${moduleModalProject.id}`);
      setModules(res.data.modules);
      setEditingModuleId(null);
      setEditingModuleName('');
      setModuleError('');
      fetchProjects();
    } catch {
      setModuleError('Failed to update module.');
    }
    setModuleLoading(false);
  };

  const handleDeleteModule = async (modId) => {
    if (!window.confirm('Delete this module? All related tasks will lose their module info.')) return;
    setModuleLoading(true);
    try {
      await axios.delete(`/projects/${moduleModalProject.id}/modules/${modId}`);
      // Refresh modules
      const res = await axios.get(`/projects/${moduleModalProject.id}`);
      setModules(res.data.modules);
      setModuleError('');
      fetchProjects();
    } catch {
      setModuleError('Failed to delete module.');
    }
    setModuleLoading(false);
  };

  return (
    <AuthenticatedLayout
      header={
        <h2 className="font-semibold text-xl text-gray-800 leading-tight">
          Projects
        </h2>
      }
    >
      <Head title="Projects" />
      <div className="max-w-7xl mx-auto py-8"> {/* Ubah max-w-4xl menjadi max-w-7xl agar lebih lebar */}
        {notification && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded shadow text-center font-semibold animate-fade-in">
            {notification}
          </div>
        )}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-center">Project List</h2>
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Add Project
          </button>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
        )}

        {/* Modal Add/Edit */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 transition-all">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 relative animate-fade-in border border-blue-100">
              <button
                className="absolute top-3 right-4 text-gray-400 hover:text-gray-700 text-3xl font-bold focus:outline-none"
                onClick={() => setShowModal(false)}
                aria-label="Close"
                type="button"
              >
                &times;
              </button>
              <h3 className="text-2xl font-extrabold mb-6 text-blue-700 flex items-center gap-2 tracking-tight">
                {editingId ? 'Edit Project' : 'Add Project'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block font-semibold mb-1 text-gray-700">Name</label>
                  <input
                    type="text"
                    name="name"
                    className="w-full border border-blue-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition shadow-sm"
                    placeholder="Project name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700">Description</label>
                  <textarea
                    name="desc"
                    className="w-full border border-blue-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition shadow-sm"
                    placeholder="Description"
                    value={form.desc}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700">Owner</label>
                  <input
                    type="text"
                    className="w-full border border-blue-200 rounded-xl px-4 py-2 bg-gray-100"
                    value={currentUser?.name || ''}
                    disabled
                  />
                </div>
                <div className="flex gap-2 mt-8 justify-end">
                  <button
                    type="button"
                    className="bg-gray-100 text-gray-700 px-5 py-2 rounded-xl hover:bg-gray-200 transition font-semibold border border-gray-200"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-7 py-2 rounded-xl hover:from-blue-600 hover:to-blue-800 transition font-bold shadow"
                  >
                    {editingId ? 'Update' : 'Add'} Project
                  </button>
                </div>
                {error && (
                  <div className="mt-2 p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>
                )}
              </form>
            </div>
          </div>
        )}
        {/* End Modal Add/Edit */}

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
                <h3 className="text-lg font-bold mb-2 text-gray-800">Delete Project</h3>
                <p className="mb-2 text-gray-600 text-center">
                  Are you sure you want to delete project <span className="font-bold text-red-600">{deleteProjectName}</span>?
                </p>
                <p className="mb-4 text-gray-500 text-center text-xs">
                  This action cannot be undone.
                </p>
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

        {/* Modal Member Management */}
        {memberModalProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 transition-all">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 relative animate-fade-in border border-blue-100">
              <button
                className="absolute top-3 right-4 text-gray-400 hover:text-gray-700 text-3xl font-bold focus:outline-none"
                onClick={closeMemberModal}
                aria-label="Close"
                type="button"
              >
                &times;
              </button>
              <h3 className="text-2xl font-extrabold mb-6 text-blue-700 flex items-center gap-2 tracking-tight">
                Manage Members - {memberModalProject.name}
              </h3>
              <div className="mb-4">
                <div className="font-semibold mb-2 text-gray-700">Current Members:</div>
                <div className="flex flex-col gap-2">
                  {memberModalProject.members && memberModalProject.members.length > 0 ? (
                    memberModalProject.members.map((m) => {
                      const hasInProgress = tasks.some(
                        (t) =>
                          String(t.project_id) === String(memberModalProject.id) &&
                          t.assignment_id === m.id &&
                          t.status === 'in_progress'
                      );
                      const badgeColor = hasInProgress
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-green-50 text-green-700 border-green-200';
                      return (
                        <div
                          key={m.id}
                          className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold border ${badgeColor}`}
                        >
                          <span>{m.name}</span>
                          {/* Edit Role */}
                          {editingRoleUserId === m.id ? (
                            <>
                              <select
                                className="border border-blue-200 rounded px-2 py-1 text-xs"
                                value={editingRoleValue}
                                onChange={e => setEditingRoleValue(e.target.value)}
                                disabled={roleLoading}
                              >
                                <option value="admin">Admin</option>
                                <option value="member">Member</option>
                                <option value="viewer">Viewer</option>
                                <option value="developer">Developer</option>
                                <option value="reporter">Reporter</option>
                                <option value="qa">QA</option>
                              </select>
                              <button
                                className="text-green-600 font-bold px-1"
                                onClick={() => saveEditRole(m.id)}
                                disabled={roleLoading}
                                title="Save"
                                type="button"
                              >✔</button>
                              <button
                                className="text-gray-400 font-bold px-1"
                                onClick={cancelEditRole}
                                disabled={roleLoading}
                                title="Cancel"
                                type="button"
                              >✕</button>
                            </>
                          ) : (
                            <>
                              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-normal">
                                {m.pivot?.role || m.role || 'member'}
                              </span>
                              <button
                                className="text-blue-500 hover:text-blue-700 text-xs underline ml-1"
                                onClick={() => startEditRole(m.id, m.pivot?.role || m.role || 'member')}
                                disabled={roleLoading}
                                type="button"
                              >
                                Edit
                              </button>
                            </>
                          )}
                          <button
                            className="ml-2 text-red-500 hover:text-red-700 focus:outline-none"
                            title="Remove"
                            disabled={memberLoading}
                            onClick={() => handleDeleteMember(m.id)}
                          >
                            &times;
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <span className="italic text-gray-400">No members</span>
                  )}
                </div>
              </div>
              <div className="mb-4">
                <div className="font-semibold mb-2 text-gray-700">Add Member:</div>
                <div className="flex gap-2 flex-wrap items-center">
                  <select
                    className="border border-blue-200 rounded px-3 py-2 min-w-[160px]"
                    value={memberToAdd}
                    onChange={e => setMemberToAdd(e.target.value)}
                  >
                    <option value="">Select user</option>
                    {users
                      .filter(u => !memberModalProject.members?.some(m => m.id === u.id))
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                      ))}
                  </select>
                  <select
                    className="border border-blue-200 rounded px-3 py-2 min-w-[120px]"
                    value={memberModalProject.roleToAdd || 'member'}
                    onChange={e =>
                      setMemberModalProject({
                        ...memberModalProject,
                        roleToAdd: e.target.value,
                      })
                    }
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                    <option value="developer">Developer</option>
                    <option value="reporter">Reporter</option>
                    <option value="qa">QA</option>
                  </select>
                  <button
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition font-semibold"
                    onClick={handleAddMember}
                    disabled={memberLoading}
                    type="button"
                  >
                    Add
                  </button>
                </div>
                {memberError && (
                  <div className="mt-2 p-2 bg-red-100 text-red-700 rounded text-sm">{memberError}</div>
                )}
              </div>
              <div className="flex gap-2 mt-8 justify-end">
                <button
                  type="button"
                  className="bg-gray-100 text-gray-700 px-5 py-2 rounded-xl hover:bg-gray-200 transition font-semibold border border-gray-200"
                  onClick={closeMemberModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {/* End Modal Member Management */}

        {/* Modal Manage Module */}
        {moduleModalProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 transition-all">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 relative animate-fade-in border border-purple-100">
              <button
                className="absolute top-3 right-4 text-gray-400 hover:text-gray-700 text-3xl font-bold focus:outline-none"
                onClick={closeModuleModal}
                aria-label="Close"
                type="button"
              >
                &times;
              </button>
              <h3 className="text-2xl font-extrabold mb-6 text-purple-700 flex items-center gap-2 tracking-tight">
                Manage Modules - {moduleModalProject.name}
              </h3>
              {/* Tambahkan max-h dan overflow-y-auto di sini */}
              <div className="mb-4 max-h-72 overflow-y-auto pr-2">
                <div className="font-semibold mb-2 text-gray-700">Current Modules:</div>
                <div className="flex flex-col gap-2">
                  {modules.length > 0 ? (
                    modules.map((mod) => {
                      // Summary bar per module
                      const moduleTasks = tasks.filter(
                        t => String(t.project_id) === String(moduleModalProject.id) && String(t.module_id) === String(mod.id)
                      );
                      const total = moduleTasks.length;
                      const done = moduleTasks.filter(t => t.status === 'done').length;
                      const percent = total === 0 ? 0 : Math.round((done / total) * 100);

                      return (
                        <div
                          key={mod.id}
                          className="flex flex-col gap-1 border border-purple-100 rounded-lg px-3 py-2 bg-purple-50"
                        >
                          <div className="flex items-center gap-2">
                            {editingModuleId === mod.id ? (
                              <>
                                <input
                                  type="text"
                                  className="border border-purple-200 rounded px-2 py-1 text-sm"
                                  value={editingModuleName}
                                  onChange={e => setEditingModuleName(e.target.value)}
                                  disabled={moduleLoading}
                                />
                                <button
                                  className="text-green-600 font-bold px-1"
                                  onClick={() => handleEditModule(mod.id)}
                                  disabled={moduleLoading}
                                  title="Save"
                                  type="button"
                                >✔</button>
                                <button
                                  className="text-gray-400 font-bold px-1"
                                  onClick={cancelEditModule}
                                  disabled={moduleLoading}
                                  title="Cancel"
                                  type="button"
                                >✕</button>
                              </>
                            ) : (
                              <>
                                <span className="font-semibold">{mod.name}</span>
                                <button
                                  className="text-yellow-500 hover:text-yellow-700 text-xs underline ml-2"
                                  onClick={() => startEditModule(mod)}
                                  disabled={moduleLoading}
                                  type="button"
                                >
                                  Edit
                                </button>
                                <button
                                  className="text-red-500 hover:text-red-700 text-xs underline ml-2"
                                  onClick={() => handleDeleteModule(mod.id)}
                                  disabled={moduleLoading}
                                  type="button"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                          {/* Bar summary per module */}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-600">Done:</span>
                            <span className="text-xs font-bold text-purple-700">{percent}%</span>
                            <div className="flex-1 h-2 bg-purple-100 rounded overflow-hidden">
                              <div
                                className="h-2 bg-gradient-to-r from-purple-400 to-purple-600 rounded"
                                style={{ width: `${percent}%`, transition: 'width 0.4s' }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 ml-2">{done}/{total}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <span className="italic text-gray-400">No modules</span>
                  )}
                </div>
              </div>
              <div className="mb-4">
                <div className="font-semibold mb-2 text-gray-700">Add Module:</div>
                <div className="flex gap-2 flex-wrap items-center">
                  <input
                    type="text"
                    className="border border-purple-200 rounded px-3 py-2 min-w-[160px]"
                    placeholder="Module name"
                    value={moduleForm.name}
                    onChange={e => setModuleForm({ name: e.target.value })}
                  />
                  <button
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition font-semibold"
                    onClick={handleAddModule}
                    disabled={moduleLoading}
                    type="button"
                  >
                    Add
                  </button>
                </div>
                {moduleError && (
                  <div className="mt-2 p-2 bg-red-100 text-red-700 rounded text-sm">{moduleError}</div>
                )}
              </div>
              <div className="flex gap-2 mt-8 justify-end">
                <button
                  type="button"
                  className="bg-gray-100 text-gray-700 px-5 py-2 rounded-xl hover:bg-gray-200 transition font-semibold border border-gray-200"
                  onClick={closeModuleModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {/* End Modal Manage Module */}

        {/* Card List */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {projects.length === 0 && (
            <div className="col-span-3 text-center py-6 text-gray-500 bg-gray-50 rounded-lg shadow">
              No projects found.
            </div>
          )}
          {projects.map((project) => {
            const stats = getProjectTaskStats(project.id);
            const memberBadges = (project.members || []).map((m) => {
              const hasInProgress = tasks.some(
                (t) =>
                  String(t.project_id) === String(project.id) &&
                  t.assignment_id === m.id &&
                  t.status === 'in_progress'
              );
              const badgeColor = hasInProgress
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-green-50 text-green-700 border-green-200';
              return (
                <span
                  key={m.id}
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeColor} mr-1 mb-1`}
                  title={hasInProgress ? 'Has task in progress' : 'Available'}
                >
                  <span className="font-bold">{m.name[0]}</span>
                  <span className="ml-1">{m.name.split(' ')[0]}</span>
                  <span className="ml-2 bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-normal">
                    {m.pivot?.role || m.role || 'member'}
                  </span>
                </span>
              );
            });

            return (
              <div
                key={project.id}
                className="bg-gradient-to-br from-blue-50 via-white to-blue-100 rounded-2xl shadow-lg p-8 flex flex-col justify-between border border-blue-200 hover:shadow-2xl transition group relative"
                style={{ minHeight: 340 }}
              >
                <div>
                  <h3
                    className="text-2xl font-extrabold text-blue-800 mb-1 cursor-pointer hover:underline tracking-tight group-hover:text-blue-600 transition"
                    onClick={() => handleProjectClick(project.id)}
                    title="Lihat Task Project"
                  >
                    {project.name}
                  </h3>
                  <p className="text-gray-600 mb-2 line-clamp-2">{project.desc}</p>
                  <div className="text-sm text-gray-500 mb-2">
                    <span className="font-semibold">Owner:</span>{' '}
                    {project.owner_user?.name || '-'}
                  </div>
                  <div className="text-sm text-gray-500 mb-3 flex flex-wrap items-center">
                    <span className="font-semibold mr-1">Members:</span>
                    <button
                      className="ml-1 text-blue-500 underline hover:text-blue-700 text-xs"
                      onClick={() => toggleShowMembers(project.id)}
                      type="button"
                    >
                      {showMembers[project.id] ? 'Hide' : 'Show'}
                    </button>
                    <button
                      className="ml-2 text-blue-500 underline hover:text-blue-700 text-xs"
                      onClick={() => openMemberModal(project)}
                      type="button"
                    >
                      Manage
                    </button>
                  </div>
                  {/* Show/hide member badges */}
                  {showMembers[project.id] && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {memberBadges.length > 0 ? (
                        memberBadges
                      ) : (
                        <span className="italic text-gray-400">No members</span>
                      )}
                    </div>
                  )}
                  {/* Progress & Task Info */}
                  <div className="mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-xs text-gray-700">Progress:</span>
                      <span className="text-xs font-bold text-blue-700">{stats.percent}%</span>
                      <div className="flex-1 h-2 bg-blue-100 rounded overflow-hidden">
                        <div
                          className="h-2 bg-gradient-to-r from-blue-400 to-blue-600 rounded"
                          style={{ width: `${stats.percent}%`, transition: 'width 0.4s' }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs text-gray-600 mt-1 flex-wrap">
                      <span>Total: <b>{stats.total}</b></span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded-full">To Do: <b>{stats.todo}</b></span>
                      <span className="bg-yellow-100 px-2 py-0.5 rounded-full">In Progress: <b>{stats.inProgress}</b></span>
                      <span className="bg-green-100 px-2 py-0.5 rounded-full">Done: <b>{stats.done}</b></span>
                      <span className="bg-red-100 px-2 py-0.5 rounded-full text-red-700">Overdue: <b>{stats.overdue}</b></span>
                    </div>
                  </div>
                  {/* Module Info */}
                  <div className="mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-xs text-gray-700">Modules:</span>
                      <button
                        className="text-blue-500 underline hover:text-blue-700 text-xs"
                        onClick={() => toggleShowModules(project.id)}
                        type="button"
                      >
                        {showModules[project.id] ? 'Hide' : 'Show'}
                      </button>
                      <button
                        className="text-blue-500 underline hover:text-blue-700 text-xs"
                        onClick={() => openModuleModal(project)}
                        type="button"
                      >
                        Manage
                      </button>
                    </div>
                    {showModules[project.id] && (
                      <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-1">
                        {(project.modules || []).length > 0 ? (
                          project.modules.map((mod) => {
                            // Hitung summary task per module
                            const moduleTasks = tasks.filter(
                              t => String(t.project_id) === String(project.id) && String(t.module_id) === String(mod.id)
                            );
                            const total = moduleTasks.length;
                            const done = moduleTasks.filter(t => t.status === 'done').length;
                            const percent = total === 0 ? 0 : Math.round((done / total) * 100);

                            return (
                              <div key={mod.id} className="mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border bg-purple-50 text-purple-700 border-purple-200">
                                    {mod.name}
                                  </span>
                                  <span className="text-xs text-gray-500">{done}/{total} done</span>
                                  <span className="text-xs text-purple-700 font-bold">{percent}%</span>
                                </div>
                                <div className="h-2 bg-purple-100 rounded overflow-hidden mt-1">
                                  <div
                                    className="h-2 bg-gradient-to-r from-purple-400 to-purple-600 rounded"
                                    style={{ width: `${percent}%`, transition: 'width 0.4s' }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <span className="italic text-gray-400">No modules</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                  <button
                    onClick={() => handleEdit(project)}
                    className="p-2 rounded hover:bg-yellow-100 transition"
                    title="Edit"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-2.828 0L5 11.828a2 2 0 010-2.828L11.586 2.586a2 2 0 012.828 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(project.id, project.name)}
                    className="p-2 rounded hover:bg-red-100 transition"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {/* Ribbon/Badge */}
                <div className="absolute top-0 right-0">
                  {stats.percent === 100 && (
                    <span className="bg-green-500 text-white text-[10px] px-2 py-1 rounded-bl-xl rounded-tr-2xl font-bold shadow">
                      Completed
                    </span>
                  )}
                  {stats.overdue > 0 && (
                    <span className="bg-red-500 text-white text-[10px] px-2 py-1 rounded-bl-xl rounded-tr-2xl font-bold shadow ml-1">
                      Overdue
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {/* End Card List */}
      </div>
    </AuthenticatedLayout>
  );
}