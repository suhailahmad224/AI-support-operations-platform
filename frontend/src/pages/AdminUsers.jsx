import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Power, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  Headphones, 
  UserCheck, 
  Building, 
  Hash, 
  RefreshCw 
} from 'lucide-react';
import { userService } from '../services/userService';
import UserModal from '../components/UserModal';
import ConfirmationModal from '../components/ConfirmationModal';
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../context/AuthContext';

export default function AdminUsers() {
  const { user: currentAdmin } = useAuth();

  const [users, setUsers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userModalMode, setUserModalMode] = useState('create');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    isDanger: false,
    action: null,
  });

  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        department: deptFilter || undefined,
        status: statusFilter || undefined,
      };

      const res = await userService.getUsers(params);
      setUsers(res.data);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, deptFilter, statusFilter]);

  const fetchAgents = async () => {
    try {
      const res = await userService.getAgents();
      setAgents(res.data || []);
    } catch (err) {
      console.warn('Could not fetch agents workload:', err.message);
    }
  };

  useEffect(() => {
    fetchUsers(1);
    fetchAgents();
  }, [fetchUsers]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setSelectedUser(null);
    setUserModalMode('create');
    setUserModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setUserModalMode('edit');
    setUserModalOpen(true);
  };

  // Submit Create or Edit User
  const handleUserModalSubmit = async (formData) => {
    setActionLoading(true);
    try {
      if (userModalMode === 'create') {
        await userService.createUser(formData);
        showToast(`User ${formData.email} created successfully.`);
      } else {
        await userService.updateUser(selectedUser.id, formData);
        showToast(`User ${selectedUser.email} updated successfully.`);
      }
      setUserModalOpen(false);
      fetchUsers(meta.page);
      fetchAgents();
    } catch (err) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger Toggle Status
  const handleToggleStatus = (user) => {
    if (user.id === currentAdmin?.id) {
      alert('You cannot deactivate your own administrator account.');
      return;
    }

    const action = user.isActive ? 'deactivate' : 'activate';
    setConfirmModal({
      isOpen: true,
      title: `${action === 'deactivate' ? 'Deactivate' : 'Activate'} User Account`,
      message: `Are you sure you want to ${action} ${user.name} (${user.email})? ${
        action === 'deactivate'
          ? 'They will no longer be able to log in or access the platform.'
          : 'They will be allowed to log in and use the platform.'
      }`,
      confirmText: action === 'deactivate' ? 'Deactivate Account' : 'Activate Account',
      isDanger: action === 'deactivate',
      action: async () => {
        setActionLoading(true);
        try {
          await userService.toggleUserStatus(user.id);
          showToast(`Account for ${user.email} ${action}d successfully.`);
          setConfirmModal({ ...confirmModal, isOpen: false });
          fetchUsers(meta.page);
          fetchAgents();
        } catch (err) {
          alert(err.message || 'Status toggle failed');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // Trigger Delete User
  const handleDeleteUser = (user) => {
    if (user.id === currentAdmin?.id) {
      alert('You cannot delete your own administrator account.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Delete User Account Permanently',
      message: `Are you sure you want to delete ${user.name} (${user.email})? This action is permanent and cannot be undone.`,
      confirmText: 'Delete User',
      isDanger: true,
      action: async () => {
        setActionLoading(true);
        try {
          await userService.deleteUser(user.id);
          showToast(`User ${user.email} deleted successfully.`);
          setConfirmModal({ ...confirmModal, isOpen: false });
          fetchUsers(meta.page);
          fetchAgents();
        } catch (err) {
          alert(err.message || 'Failed to delete user');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <ShieldAlert className="h-3 w-3" />
            <span>Admin</span>
          </span>
        );
      case 'agent':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Headphones className="h-3 w-3" />
            <span>Agent</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <UserCheck className="h-3 w-3" />
            <span>Customer</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-3 py-1.5 rounded-lg border border-slate-700 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-indigo-400" />
              <h1 className="text-base font-bold text-white tracking-tight">
                User & Agent Directory
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <NotificationBell />

            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 shadow-sm transition"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add New Account</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-slate-800 border border-emerald-500/40 shadow-2xl text-emerald-300 text-sm flex items-center space-x-2 animate-bounce">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Support Agents Workload Overview Grid */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Headphones className="h-5 w-5 text-blue-400" />
                <span>Support Agent Roster & Workload Allocation</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Active support staff workload indicators for ticket balancing
              </p>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {agents.length} Registered Agent{agents.length === 1 ? '' : 's'}
            </span>
          </div>

          {agents.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              No support agents found. Create an agent account using the button above.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-sm">
                        {agent.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white truncate max-w-[140px]">{agent.name}</h4>
                        <p className="text-[11px] text-slate-400 truncate max-w-[140px]">{agent.email}</p>
                      </div>
                    </div>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        agent.isActive ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-600'
                      }`}
                      title={agent.isActive ? 'Active' : 'Inactive'}
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span className="text-slate-400">Department:</span>
                      <span className="font-medium text-slate-200">{agent.department}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-300">
                      <span className="text-slate-400">Assigned Tickets:</span>
                      <span className="font-bold text-brand-300">{agent.assignedTicketsCount || 0}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-brand-500 h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(100, ((agent.assignedTicketsCount || 0) / 10) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Directory Controls & Table */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-3.5 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="agent">Support Agent</option>
                <option value="customer">Customer</option>
              </select>

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
              >
                <option value="">All Departments</option>
                <option value="Support">Support</option>
                <option value="Engineering">Engineering</option>
                <option value="Billing">Billing</option>
                <option value="Operations">Operations</option>
                <option value="General">General</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <button
                onClick={() => {
                  setSearch('');
                  setRoleFilter('');
                  setDeptFilter('');
                  setStatusFilter('');
                }}
                className="p-2 text-slate-400 hover:text-white bg-slate-900/90 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition"
                title="Reset filters"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* User Data Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-700/60">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 uppercase font-semibold text-[11px] text-slate-400 border-b border-slate-700/60">
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Workload</th>
                  <th className="px-5 py-3.5">Joined</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center space-y-2">
                        <Loader2 className="h-6 w-6 text-brand-400 animate-spin" />
                        <span>Loading directory...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-8 text-center text-rose-400">
                      <div className="flex flex-col items-center space-y-2">
                        <AlertCircle className="h-6 w-6" />
                        <span>{error}</span>
                        <button
                          onClick={() => fetchUsers(1)}
                          className="px-3 py-1 bg-slate-800 text-white rounded border border-slate-700 text-xs"
                        >
                          Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                      No accounts matched your search or filters.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{u.name}</p>
                            <p className="text-[11px] text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">{getRoleBadge(u.role)}</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] font-medium text-slate-300">
                          {u.department}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            u.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-700/40 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {u.role === 'agent' ? (
                          <span className="font-bold text-brand-300">{u.assignedTicketsCount || 0} tickets</span>
                        ) : (
                          <span className="text-slate-500">--</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
                            title="Edit user"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={u.id === currentAdmin?.id}
                            className={`p-1.5 rounded-lg border transition ${
                              u.isActive
                                ? 'text-amber-400 hover:text-amber-300 bg-slate-800/80 hover:bg-amber-500/20 border-slate-700 hover:border-amber-500/30'
                                : 'text-emerald-400 hover:text-emerald-300 bg-slate-800/80 hover:bg-emerald-500/20 border-slate-700 hover:border-emerald-500/30'
                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                            title={u.isActive ? 'Deactivate account' : 'Activate account'}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={u.id === currentAdmin?.id}
                            className="p-1.5 text-rose-400 hover:text-rose-300 bg-slate-800/80 hover:bg-rose-500/20 rounded-lg border border-slate-700 hover:border-rose-500/30 transition disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Delete account permanently"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4 pt-2">
            <div>
              Showing{' '}
              <span className="font-semibold text-white">
                {users.length > 0 ? (meta.page - 1) * meta.limit + 1 : 0}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-white">
                {Math.min(meta.page * meta.limit, meta.total)}
              </span>{' '}
              of <span className="font-semibold text-white">{meta.total}</span> accounts
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchUsers(meta.page - 1)}
                disabled={!meta.hasPrevPage || loading}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Previous</span>
              </button>

              <span className="px-2 py-1 font-semibold text-white">
                Page {meta.page} of {meta.totalPages}
              </span>

              <button
                onClick={() => fetchUsers(meta.page + 1)}
                disabled={!meta.hasNextPage || loading}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* User Modal (Create/Edit) */}
      <UserModal
        isOpen={userModalOpen}
        mode={userModalMode}
        initialData={selectedUser}
        isLoading={actionLoading}
        onSubmit={handleUserModalSubmit}
        onClose={() => setUserModalOpen(false)}
      />

      {/* Confirmation Modal (Delete/Status Toggle) */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        isDanger={confirmModal.isDanger}
        isLoading={actionLoading}
        onConfirm={confirmModal.action}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
}
