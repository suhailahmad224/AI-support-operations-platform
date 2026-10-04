import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Ticket as TicketIcon, 
  Plus, 
  Search, 
  Filter, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Headphones, 
  ArrowRight, 
  RefreshCw,
  BookOpen
} from 'lucide-react';
import { ticketService } from '../services/ticketService';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';

export default function Tickets() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [queueTab, setQueueTab] = useState(user?.role === 'agent' ? 'assigned' : 'all');

  const fetchTickets = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        category: categoryFilter || undefined,
      };

      if (user?.role === 'agent') {
        if (queueTab === 'unassigned') {
          params.queue = 'unassigned';
        } else if (queueTab === 'all') {
          params.queue = 'all';
        }
      }

      const res = await ticketService.getTickets(params);
      setTickets(res.data);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter, categoryFilter, queueTab, user?.role]);

  useEffect(() => {
    fetchTickets(1);
  }, [fetchTickets]);

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'ASSIGNED':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'IN_PROGRESS':
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
      case 'WAITING_FOR_CUSTOMER':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'RESOLVED':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
      case 'CLOSED':
        return 'bg-slate-700/40 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-3 py-1.5 rounded-lg border border-slate-700 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </Link>
            <div className="flex items-center space-x-2">
              <TicketIcon className="h-5 w-5 text-brand-400" />
              <h1 className="text-base font-bold text-white tracking-tight">Support Tickets</h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <NotificationBell />

            <Link
              to="/knowledge"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            >
              <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
              <span>Knowledge Base</span>
            </Link>

            <Link
              to="/tickets/new"
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              <span>Create Ticket</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Agent Queue Tabs */}
        {user?.role === 'agent' && (
          <div className="flex items-center space-x-2 bg-slate-800/60 p-1.5 rounded-xl border border-slate-700/60 w-fit">
            <button
              onClick={() => setQueueTab('assigned')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                queueTab === 'assigned'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Assigned to Me
            </button>
            <button
              onClick={() => setQueueTab('unassigned')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                queueTab === 'unassigned'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Unassigned Triage Queue
            </button>
            <button
              onClick={() => setQueueTab('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                queueTab === 'all'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Workspace Tickets
            </button>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ticket ID (e.g. TCK-1001), title, or keywords..."
                className="w-full pl-10 pr-3.5 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
              >
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_FOR_CUSTOMER">Waiting for Customer</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
              >
                <option value="">All Categories</option>
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="account">Account</option>
                <option value="feature_request">Feature Request</option>
                <option value="general">General</option>
              </select>

              <button
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setPriorityFilter('');
                  setCategoryFilter('');
                }}
                className="p-2 text-slate-400 hover:text-white bg-slate-900/90 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition"
                title="Reset filters"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tickets Table / List */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 uppercase font-semibold text-[11px] text-slate-400 border-b border-slate-700/60">
                <tr>
                  <th className="px-5 py-3.5">Ticket ID</th>
                  <th className="px-5 py-3.5">Title & Category</th>
                  <th className="px-5 py-3.5">Priority</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Assigned Agent</th>
                  <th className="px-5 py-3.5">Created</th>
                  <th className="px-5 py-3.5 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center space-y-2">
                        <Loader2 className="h-6 w-6 text-brand-400 animate-spin" />
                        <span>Loading tickets...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-8 text-center text-rose-400">
                      <div className="flex flex-col items-center space-y-2">
                        <AlertCircle className="h-6 w-6" />
                        <span>{error}</span>
                        <button
                          onClick={() => fetchTickets(1)}
                          className="px-3 py-1 bg-slate-800 text-white rounded border border-slate-700 text-xs"
                        >
                          Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-5 py-12 text-center text-slate-400">
                      <div className="max-w-sm mx-auto space-y-3">
                        <TicketIcon className="h-8 w-8 text-slate-600 mx-auto" />
                        <p className="text-sm font-semibold text-slate-300">No tickets found</p>
                        <p className="text-xs text-slate-500">
                          No support tickets matched your current search filters or assigned queue.
                        </p>
                        <Link
                          to="/tickets/new"
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Create First Ticket</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr
                      key={t._id}
                      onClick={() => navigate(`/tickets/${t.ticketId}`)}
                      className="hover:bg-slate-800/50 cursor-pointer transition"
                    >
                      <td className="px-5 py-3.5 font-mono font-bold text-brand-400">
                        {t.ticketId}
                      </td>
                      <td className="px-5 py-3.5 max-w-xs">
                        <p className="font-semibold text-white truncate">{t.title}</p>
                        <span className="text-[11px] text-slate-400 capitalize">
                          {t.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${getPriorityBadge(
                            t.priority
                          )}`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(
                            t.status
                          )}`}
                        >
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-2">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate max-w-[120px]">{t.customer?.name || 'Customer'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {t.assignedAgent ? (
                          <div className="flex items-center space-x-2 text-indigo-300">
                            <Headphones className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[120px]">{t.assignedAgent.name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-500 border border-slate-700">
                              Unassigned
                            </span>
                            {['agent', 'admin'].includes(user?.role) && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await ticketService.assignTicket(t.ticketId, user?.id || user?._id);
                                    fetchTickets(meta.page);
                                  } catch (err) {
                                    alert(err.message || 'Failed to claim');
                                  }
                                }}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm"
                                title="Claim ticket for yourself"
                              >
                                Claim
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-slate-400 hover:text-white p-1">
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-800 text-xs text-slate-400 gap-4">
            <div>
              Showing <span className="font-semibold text-white">{tickets.length}</span> of{' '}
              <span className="font-semibold text-white">{meta.total}</span> tickets
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchTickets(meta.page - 1)}
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
                onClick={() => fetchTickets(meta.page + 1)}
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
    </div>
  );
}
