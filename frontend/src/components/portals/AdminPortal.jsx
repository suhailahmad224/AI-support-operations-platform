import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Users, 
  Ticket as TicketIcon, 
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
  Sparkles,
  Inbox,
  UserCheck,
  AlertTriangle,
  UserCog,
  Plus,
  ArrowUpRight,
  BarChart3
} from 'lucide-react';
import { ticketService } from '../../services/ticketService';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';

export default function AdminPortal() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    assigned: 0,
    inProgress: 0,
    waiting: 0,
    resolved: 0,
    closed: 0,
    unassignedCount: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // User and Agent Metrics
  const [userStats, setUserStats] = useState({ totalUsers: 0, totalAgents: 0 });
  const [userStatsLoading, setUserStatsLoading] = useState(true);

  // Ticket Overview
  const [tickets, setTickets] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 8, total: 0, totalPages: 1 });
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Available Agents for quick assignment
  const [agentsList, setAgentsList] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await ticketService.getTicketStats();
      if (res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.warn('Could not load admin ticket stats:', err.message);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchUserMetrics = async () => {
    setUserStatsLoading(true);
    try {
      const [usersRes, agentsRes] = await Promise.all([
        userService.getUsers({ limit: 1 }),
        userService.getAgents(),
      ]);
      setUserStats({
        totalUsers: usersRes.meta?.total || 0,
        totalAgents: agentsRes.data?.length || 0,
      });
      setAgentsList(agentsRes.data || []);
    } catch (err) {
      console.warn('Could not load user stats:', err.message);
    } finally {
      setUserStatsLoading(false);
    }
  };

  const fetchTickets = useCallback(async (page = 1) => {
    setTicketsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 8,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      };
      const res = await ticketService.getTickets(params);
      setTickets(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      setError(err.message || 'Failed to fetch global tickets');
    } finally {
      setTicketsLoading(false);
    }
  }, [search, statusFilter, priorityFilter]);

  useEffect(() => {
    fetchStats();
    fetchUserMetrics();
    fetchTickets(1);
  }, [fetchTickets]);

  const handleRefresh = () => {
    fetchStats();
    fetchUserMetrics();
    fetchTickets(meta.page);
  };

  const handleAssignAgent = async (ticketId, agentId) => {
    try {
      await ticketService.assignTicket(ticketId, agentId);
      fetchStats();
      fetchTickets(meta.page);
    } catch (err) {
      alert(err.message || 'Failed to assign agent');
    }
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
      {/* Admin Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30 flex items-center space-x-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>System Administrator Console</span>
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Platform Command & Support Operations
          </h2>
          <p className="text-xs text-slate-400">
            Monitor organizational ticket volumes, supervise agent dispatch, and control platform access.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRefresh}
            className="p-2.5 text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 rounded-xl border border-slate-700 transition"
            title="Refresh statistics"
            aria-label="Refresh statistics"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <Link
            to="/admin/analytics"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 shadow-sm transition"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Analytics & CSAT</span>
          </Link>

          <Link
            to="/admin/users"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition"
          >
            <Users className="h-4 w-4" />
            <span>Manage Users & Agents</span>
          </Link>

          <Link
            to="/tickets/new"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-sm transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Ticket</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Global Volume */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4">
          <span className="text-xs font-medium text-slate-400">Global Tickets</span>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {statsLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-500" /> : stats.total}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Platform lifetime volume</p>
        </div>

        {/* Unassigned SLA Risk */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4">
          <span className="text-xs font-medium text-amber-400">Unassigned SLA</span>
          <div className="mt-2 text-2xl font-extrabold text-amber-400">
            {statsLoading ? <Loader2 className="h-5 w-5 animate-spin text-amber-500" /> : stats.unassignedCount}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Awaiting agent dispatch</p>
        </div>

        {/* In Progress */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4">
          <span className="text-xs font-medium text-indigo-400">Active Work</span>
          <div className="mt-2 text-2xl font-extrabold text-indigo-300">
            {statsLoading ? <Loader2 className="h-5 w-5 animate-spin text-indigo-500" /> : (stats.inProgress + stats.assigned)}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Assigned / In Progress</p>
        </div>

        {/* Waiting on Customer */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4">
          <span className="text-xs font-medium text-amber-300">Waiting Customer</span>
          <div className="mt-2 text-2xl font-extrabold text-amber-300">
            {statsLoading ? <Loader2 className="h-5 w-5 animate-spin text-amber-500" /> : stats.waiting}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Pending user replies</p>
        </div>

        {/* Resolved / Closed */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4">
          <span className="text-xs font-medium text-teal-400">Resolved Rate</span>
          <div className="mt-2 text-2xl font-extrabold text-teal-400">
            {statsLoading ? <Loader2 className="h-5 w-5 animate-spin text-teal-500" /> : (stats.resolved + stats.closed)}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Successful resolutions</p>
        </div>

        {/* Active Support Agents */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4">
          <span className="text-xs font-medium text-purple-400">Active Agents</span>
          <div className="mt-2 text-2xl font-extrabold text-purple-300">
            {userStatsLoading ? <Loader2 className="h-5 w-5 animate-spin text-purple-500" /> : userStats.totalAgents}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Rostered support staff</p>
        </div>
      </div>

      {/* Quick Access Operational Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* User & Agent Management Banner Link */}
        <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900/60 border border-indigo-500/20 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <UserCog className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">User & Agent Directory</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {userStats.totalUsers} registered users across departments &bull; Role permissions, activation, and assignments.
              </p>
            </div>
          </div>
          <Link
            to="/admin/users"
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-sm"
          >
            <span>Open Directory</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Ticket Lifecycle Operations Link */}
        <div className="bg-gradient-to-br from-brand-950/40 to-slate-900/60 border border-brand-500/20 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <TicketIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Full Ticket Directory</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Advanced search, historical audits, category triaging, and global SLA oversight.
              </p>
            </div>
          </div>
          <Link
            to="/tickets"
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 transition shadow-sm"
          >
            <span>View All Tickets</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Global Ticket Overview Table */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Filter / Search Header */}
        <div className="p-5 border-b border-slate-700/60 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-slate-900/40">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Inbox className="h-4 w-4 text-purple-400" />
              <span>Workspace Ticket Overview</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live enterprise feed. Reassign agents, inspect SLAs, and manage customer tickets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ticket title, ID, or user..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
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
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>

            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setPriorityFilter('');
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
                <th className="px-5 py-3">Title & Category</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Assigned Agent</th>
                <th className="px-5 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/30">
              {ticketsLoading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center space-y-2">
                      <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
                      <span>Loading ticket overview...</span>
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
                      <p className="text-sm font-semibold text-slate-200">No tickets found</p>
                      <p className="text-xs text-slate-500">
                        No support tickets matched the specified filters.
                      </p>
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
                      <span className="text-[11px] text-slate-400 capitalize">
                        {t.category?.replace('_', ' ')}
                      </span>
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
                    <td className="px-5 py-3.5">
                      <span className="text-slate-300 font-medium">{t.customer?.name || 'Customer'}</span>
                    </td>
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center space-x-2">
                        <select
                          value={t.assignedAgent?._id || t.assignedAgent || ''}
                          onChange={(e) => handleAssignAgent(t.ticketId, e.target.value)}
                          className="bg-slate-900 border border-slate-700 text-[11px] text-slate-300 rounded px-2 py-1 focus:ring-1 focus:ring-purple-500 outline-none max-w-[150px]"
                        >
                          <option value="">Unassigned</option>
                          {agentsList.map((ag) => (
                            <option key={ag._id} value={ag._id}>
                              {ag.name}
                            </option>
                          ))}
                        </select>
                      </div>
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
