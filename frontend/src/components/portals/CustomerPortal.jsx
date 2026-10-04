import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Ticket as TicketIcon, 
  Plus, 
  Search, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  FileQuestion,
  HelpCircle,
  Sparkles,
  Inbox
} from 'lucide-react';
import { ticketService } from '../../services/ticketService';
import { useAuth } from '../../context/AuthContext';

export default function CustomerPortal() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    waiting: 0,
    resolved: 0,
    closed: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const [tickets, setTickets] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 5, total: 0, totalPages: 1 });
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await ticketService.getTicketStats();
      if (res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.warn('Could not load ticket statistics:', err.message);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchTickets = useCallback(async (page = 1) => {
    setTicketsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 6,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      };
      const res = await ticketService.getTickets(params);
      setTickets(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      setError(err.message || 'Failed to fetch tickets');
    } finally {
      setTicketsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchStats();
    fetchTickets(1);
  }, [fetchTickets]);

  const handleRefresh = () => {
    fetchStats();
    fetchTickets(meta.page);
  };

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
    <div className="space-y-6">
      {/* Customer Quick Header & Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Customer Support Center
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Welcome back, {user?.name}
          </h2>
          <p className="text-xs text-slate-400">
            Track your ongoing requests, submit new issues, or review past resolutions.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="p-2.5 text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 rounded-xl border border-slate-700 transition"
            title="Refresh ticket data"
            aria-label="Refresh ticket data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link
            to="/tickets/new"
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-500/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Ticket</span>
          </Link>
        </div>
      </div>

      {/* Ticket Statistics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Tickets */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Tickets</span>
            <div className="h-8 w-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-300">
              <TicketIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            {statsLoading ? (
              <Loader2 className="h-6 w-6 text-slate-500 animate-spin" />
            ) : (
              <span className="text-2xl font-extrabold text-white">{stats.total}</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Submitted from your account</p>
        </div>

        {/* Open Tickets */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400">Open Tickets</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            {statsLoading ? (
              <Loader2 className="h-6 w-6 text-slate-500 animate-spin" />
            ) : (
              <span className="text-2xl font-extrabold text-emerald-400">{stats.open}</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting triage & agent pickup</p>
        </div>

        {/* In Progress */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-400">In Progress</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            {statsLoading ? (
              <Loader2 className="h-6 w-6 text-slate-500 animate-spin" />
            ) : (
              <span className="text-2xl font-extrabold text-indigo-300">{stats.inProgress}</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Currently being investigated</p>
        </div>

        {/* Resolved */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-teal-400">Resolved</span>
            <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            {statsLoading ? (
              <Loader2 className="h-6 w-6 text-slate-500 animate-spin" />
            ) : (
              <span className="text-2xl font-extrabold text-teal-400">{stats.resolved}</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Successfully addressed</p>
        </div>
      </div>

      {/* Tickets List Section */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Filter / Search Header */}
        <div className="p-5 border-b border-slate-700/60 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-slate-900/40">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Inbox className="h-4 w-4 text-brand-400" />
              <span>My Support Tickets</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any ticket to view status progress and communication history.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ticket title or ID..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_CUSTOMER">Waiting for Customer</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>

            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('');
              }}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-900 rounded-lg border border-slate-700 transition"
              title="Reset filters"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 uppercase font-semibold text-[11px] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Ticket ID</th>
                <th className="px-5 py-3">Issue Title</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Submitted</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/30">
              {ticketsLoading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center space-y-2">
                      <Loader2 className="h-6 w-6 text-brand-400 animate-spin" />
                      <span>Loading your support tickets...</span>
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
                        onClick={() => fetchTickets(1)}
                        className="px-3 py-1 bg-slate-800 text-white rounded border border-slate-700 text-xs hover:bg-slate-700"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-3">
                      <FileQuestion className="h-10 w-10 text-slate-600 mx-auto" />
                      <p className="text-sm font-semibold text-slate-200">No support tickets found</p>
                      <p className="text-xs text-slate-500">
                        {search || statusFilter
                          ? 'No tickets matched your filter criteria. Try clearing filters.'
                          : "You haven't submitted any support requests yet. We are here to help!"}
                      </p>
                      <Link
                        to="/tickets/new"
                        className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 shadow-sm"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Submit First Ticket</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr
                    key={t._id}
                    onClick={() => navigate(`/tickets/${t.ticketId}`)}
                    className="hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    <td className="px-5 py-3.5 font-mono font-bold text-brand-400">
                      {t.ticketId}
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <p className="font-semibold text-white truncate">{t.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">{t.description}</p>
                    </td>
                    <td className="px-5 py-3.5 capitalize text-slate-400">
                      {t.category?.replace('_', ' ')}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border ${getPriorityBadge(
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
                        {t.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tickets/${t.ticketId}`);
                        }}
                        className="inline-flex items-center space-x-1 text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition"
                      >
                        <span>Details</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3 bg-slate-900/30">
          <div>
            Showing <span className="font-semibold text-white">{tickets.length}</span> of{' '}
            <span className="font-semibold text-white">{meta.total}</span> tickets
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchTickets(meta.page - 1)}
              disabled={!meta.hasPrevPage || ticketsLoading}
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
              disabled={!meta.hasNextPage || ticketsLoading}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
