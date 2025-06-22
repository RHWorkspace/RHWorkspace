import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';

const AVATAR_COLORS = [
  'from-pink-400 to-pink-600',
  'from-blue-400 to-blue-600',
  'from-green-400 to-green-600',
  'from-yellow-400 to-yellow-600',
  'from-purple-400 to-purple-600',
  'from-indigo-400 to-indigo-600',
  'from-red-400 to-red-600',
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Users() {
  const { auth } = usePage().props;
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [filterGmail, setFilterGmail] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [perPage] = useState(5);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add' | 'edit'
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
  const [editId, setEditId] = useState(null);
  const [formError, setFormError] = useState('');
  const [showDeleteId, setShowDeleteId] = useState(null);
  const firstInputRef = useRef(null);

  // Sorting state
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (showModal && firstInputRef.current) {
      setTimeout(() => firstInputRef.current.focus(), 100);
    }
  }, [showModal]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/users');
      setUsers(res.data);
    } catch {
      setUsers([]);
      setToast({ show: true, message: 'Failed to fetch users.', type: 'error' });
    }
    setLoading(false);
  };

  // Sorting logic
  const sortedUsers = [...users].sort((a, b) => {
    let valA = a[sortBy] || '';
    let valB = b[sortBy] || '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredUsers = sortedUsers.filter(
    (user) =>
      (user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())) &&
      (!filterGmail || user.email.endsWith('@gmail.com'))
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / perPage);
  const paginatedUsers = filteredUsers.slice((page - 1) * perPage, page * perPage);

  // Modal handlers
  const openAddModal = () => {
    setModalType('add');
    setForm({ name: '', email: '', password: '', password_confirmation: '' });
    setEditId(null);
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setModalType('edit');
    setForm({ name: user.name, email: user.email, password: '', password_confirmation: '' });
    setEditId(user.id);
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormError('');
    setEditId(null);
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    // Simple email validation
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      setFormError('Email is invalid.');
      return;
    }
    try {
      if (modalType === 'add') {
        await axios.post('/users', form);
        setToast({ show: true, message: 'User added successfully!', type: 'success' });
      } else {
        await axios.put(`/users/${editId}`, form);
        setToast({ show: true, message: 'User updated successfully!', type: 'success' });
      }
      fetchUsers();
      closeModal();
    } catch (err) {
      if (err.response && err.response.data && err.response.data.errors) {
        setFormError(
          Object.values(err.response.data.errors).flat().join(', ')
        );
      } else {
        setFormError('Failed to save user.');
      }
      setToast({ show: true, message: 'Failed to save user.', type: 'error' });
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/users/${id}`);
      fetchUsers();
      setShowDeleteId(null);
      setToast({ show: true, message: 'User deleted.', type: 'success' });
    } catch {
      setToast({ show: true, message: 'Failed to delete user.', type: 'error' });
    }
  };

  // Sorting handler
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  // Toast auto close
  useEffect(() => {
    if (toast.show) {
      const t = setTimeout(() => setToast({ ...toast, show: false }), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  return (
    <AuthenticatedLayout user={auth.user}>
      <Head title="Manage Users" />
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-full p-6 shadow-lg flex flex-col items-center animate-bounceIn">
            <svg className="animate-spin h-8 w-8 text-blue-500 mb-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span className="text-blue-700 font-semibold">Loading...</span>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <div className={`fixed top-6 right-6 z-50 transition-all duration-500 ${toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
        <div className={`px-6 py-3 rounded shadow-lg text-white font-semibold flex items-center gap-2
          ${toast.type === 'success' ? 'bg-gradient-to-r from-green-500 to-green-700' : 'bg-gradient-to-r from-red-500 to-red-700'}`}>
          {toast.type === 'success' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.message}
          <button className="ml-4 text-white font-bold" onClick={() => setToast({ ...toast, show: false })}>×</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4a4 4 0 10-8 0 4 4 0 008 0zm6 4a4 4 0 00-3-3.87M9 16a4 4 0 00-3 3.87" />
          </svg>
          Manage Users
          <span className="ml-2 bg-gradient-to-r from-blue-400 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow">
            {users.length} users
          </span>
        </h1>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            className="border border-gray-300 rounded px-3 py-2 w-full max-w-xs focus:ring-2 focus:ring-blue-200 transition"
            placeholder="Search name or email..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition shadow"
            onClick={fetchUsers}
            disabled={loading}
            title="Refresh"
          >
            <svg className="h-5 w-5 mx-auto" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582M20 20v-5h-.581M5 19A9 9 0 1119 5" />
            </svg>
          </button>
          <button
            className="bg-gradient-to-r from-green-400 to-green-600 text-white px-4 py-2 rounded hover:from-green-500 hover:to-green-700 transition font-bold shadow"
            onClick={openAddModal}
            title="Add User"
          >
            + Add
          </button>
          <label className="flex items-center gap-1 ml-4 text-sm">
            <input
              type="checkbox"
              checked={filterGmail}
              onChange={e => setFilterGmail(e.target.checked)}
              className="accent-blue-600"
            />
            Only @gmail.com
          </label>
        </div>
        <div className="overflow-x-auto rounded shadow">
          <table className="w-full text-sm bg-white border-separate border-spacing-y-1">
            <thead>
              <tr>
                <th className="py-3 px-4 text-left font-semibold w-10 bg-blue-50 text-blue-800 rounded-s-lg">#</th>
                <th
                  className="py-3 px-4 text-left font-semibold bg-blue-50 text-blue-800 cursor-pointer select-none"
                  onClick={() => handleSort('name')}
                >
                  Name
                  <span className="ml-1 align-middle">
                    {sortBy === 'name' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : <span className="text-gray-300">▲</span>}
                  </span>
                </th>
                <th
                  className="py-3 px-4 text-left font-semibold bg-blue-50 text-blue-800 cursor-pointer select-none"
                  onClick={() => handleSort('email')}
                >
                  Email
                  <span className="ml-1 align-middle">
                    {sortBy === 'email' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : <span className="text-gray-300">▲</span>}
                  </span>
                </th>
                <th className="py-3 px-4 text-left font-semibold bg-blue-50 text-blue-800 rounded-e-lg">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400 bg-white rounded-xl">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-10 h-10 text-blue-200" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75h.008v.008H9.75V9.75zm4.5 0h.008v.008h-.008V9.75zm-6.364 4.364a5 5 0 017.072 0" />
                      </svg>
                      No users found.
                    </div>
                  </td>
                </tr>
              )}
              {paginatedUsers.map((user, idx) => (
                <tr
                  key={user.id}
                  className={`transition-all duration-200 hover:bg-blue-100/60 ${idx % 2 === 1 ? 'bg-blue-50/30' : 'bg-white'} rounded-lg border border-blue-100
                    ${editId === user.id || showDeleteId === user.id ? 'ring-2 ring-blue-400/40' : ''}`}
                >
                  <td className="py-3 px-4 rounded-s-lg font-semibold text-blue-900 align-middle">
                    {(page - 1) * perPage + idx + 1}
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-800 flex items-center gap-3 align-middle">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(user.name)} text-white font-bold text-base shadow-lg border-2 border-white`}>
                      {user.name?.[0]?.toUpperCase() || '-'}
                    </span>
                    <span className="text-base">{user.name}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 align-middle">
                    <span className="inline-flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 01-8 0m8 0a4 4 0 00-8 0m8 0V8a4 4 0 00-8 0v4m8 0v4a4 4 0 01-8 0v-4" />
                      </svg>
                      {user.email}
                    </span>
                  </td>
                  <td className="py-3 px-4 flex gap-2 rounded-e-lg align-middle">
                    <button
                      className="p-2 rounded-full hover:bg-yellow-100 transition shadow"
                      onClick={() => openEditModal(user)}
                      title="Edit"
                    >
                      <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-2.828 0L5 11.828a2 2 0 010-2.828L11.586 2.586a2 2 0 012.828 0z" />
                      </svg>
                    </button>
                    <button
                      className="p-2 rounded-full hover:bg-red-100 transition shadow"
                      onClick={() => setShowDeleteId(user.id)}
                      title="Delete"
                    >
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              className="px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >⏮ First</button>
            <button
              className="px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >Prev</button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                className={`px-3 py-1 rounded transition font-bold ${page === i + 1 ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-blue-100'}`}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >Next</button>
            <button
              className="px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
            >Last ⏭</button>
          </div>
        )}
        <div className="mt-6 text-xs text-gray-400 text-center">
          Total users: <span className="font-bold text-blue-700">{filteredUsers.length}</span>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 animate-fadeIn"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 relative animate-modalPop"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
              onClick={closeModal}
              aria-label="Close"
              type="button"
            >
              &times;
            </button>
            <h3 className="text-xl font-bold mb-4 text-blue-700">
              {modalType === 'add' ? 'Add User' : 'Edit User'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1 text-gray-700">Name</label>
                <input
                  type="text"
                  name="name"
                  className="w-full border border-blue-200 rounded px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
                  placeholder="Full name"
                  value={form.name}
                  onChange={handleFormChange}
                  required
                  ref={firstInputRef}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  className="w-full border border-blue-200 rounded px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
                  placeholder="Email"
                  value={form.email}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-700">
                  Password {modalType === 'edit' && <span className="text-xs text-gray-400">(leave blank to keep current)</span>}
                </label>
                <input
                  type="password"
                  name="password"
                  className="w-full border border-blue-200 rounded px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
                  placeholder={modalType === 'add' ? "Password" : "New password (optional)"}
                  value={form.password}
                  onChange={handleFormChange}
                  minLength={modalType === 'add' ? 6 : 0}
                  required={modalType === 'add'}
                />
              </div>
              {modalType === 'add' && (
                <div>
                  <label className="block font-semibold mb-1 text-gray-700">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="password_confirmation"
                    className="w-full border border-blue-200 rounded px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
                    placeholder="Confirm password"
                    value={form.password_confirmation}
                    onChange={handleFormChange}
                    minLength={6}
                    required
                  />
                </div>
              )}
              {formError && (
                <div className="p-2 bg-red-100 text-red-700 rounded text-sm">{formError}</div>
              )}
              <div className="flex gap-2 justify-end mt-6">
                <button
                  type="button"
                  className="bg-gray-100 text-gray-700 px-5 py-2 rounded hover:bg-gray-200 border border-gray-200 transition"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-7 py-2 rounded hover:from-blue-600 hover:to-blue-800 font-bold shadow transition"
                >
                  {modalType === 'add' ? 'Add' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Delete Confirmation */}
      {showDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 relative animate-modalPop">
            <button
              className="absolute top-3 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
              onClick={() => setShowDeleteId(null)}
              aria-label="Close"
              type="button"
            >
              &times;
            </button>
            <div className="flex flex-col items-center">
              <svg className="w-12 h-12 text-red-500 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <h3 className="text-lg font-bold mb-2 text-gray-800">Delete User</h3>
              <p className="mb-2 text-gray-600 text-center">
                Are you sure you want to delete this user?
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowDeleteId(null)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteId)}
                  className="bg-gradient-to-r from-red-500 to-red-700 text-white px-6 py-2 rounded hover:from-red-600 hover:to-red-800 font-semibold shadow transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Animations */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        .animate-fadeIn { animation: fadeIn 0.3s; }
        @keyframes modalPop { 0% { transform: scale(0.95); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
        .animate-modalPop { animation: modalPop 0.25s; }
        @keyframes bounceIn { 0% { transform: scale(0.8); opacity: 0.5 } 100% { transform: scale(1); opacity: 1 } }
        .animate-bounceIn { animation: bounceIn 0.3s; }
      `}</style>
    </AuthenticatedLayout>
  );
}
