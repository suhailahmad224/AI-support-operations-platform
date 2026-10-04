import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Headphones, 
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
  Play,
  Check,
  RotateCcw,
  User
} from 'lucide-react';
import { ticketService } from '../../services/ticketService';
import { useAuth } from '../../context/AuthContext';

export default function AgentPortal() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState({
    myAssigned: 0,
    myInProgress: 0,
    myWaiting: 0,
    myResolved: 0,
    unassignedQueue: 0,
    totalGlobal: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const [tickets, setTickets] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 8, total: 0, totalPages: 1 });
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Filters
  const [queueTab, setQueueTab] = useState('assigned'); // 'assigned', 'unassigned', 'all'
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await ticketService.getTicketStats();
      if (res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.warn('Could not load agent stats:', err.message);
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
        limit: 8,
        search: search.trim() || undefined,
        priority: priorityFilter || undefined,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
      };

      if (queueTab === 'unassigned') {
        params.queue = 'unassigned';
      } else if (queueTab === 'all') {
        params.queue = 'all';
      }
      // If queueTab === 'assigned', backend defaults to assignedAgent: req.user._id

      const res = await ticketService.getTickets(params);
      setTickets(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      setError(err.message || 'Failed to fetch agent tickets');
    } finally {
      setTicketsLoading(false);
    }
  }, [queueTab, search, priorityFilter, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchStats();
    fetchTickets(1);
  }, [fetchTickets]);

  const handleRefresh = () => {
    fetchStats();
    fetchTickets(meta.page);
  };

  // Quick In-line Status Updates
  const handleQuickStatus = async (e, ticketId, newStatus) => {
    e.stopPropagation();
    setActionLoadingId(ticketId);
    try {
      await ticketService.updateTicketStatus(ticketId, newStatus);
      showToast(`Ticket ${ticketId} updated to ${newStatus}`);
      fetchStats();
      fetchTickets(meta.page);
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick Claim Ticket
  const handleClaim = async (e, ticketId) => {
    e.stopPropagation();
    setActionLoadingId(ticketId);
    try {
      const myId = user?.id || user?._id;
      await ticketService.assignTicket(ticketId, myId);
      showToast(`Claimed ${ticketId} successfully! Assigned to you.`);
      fetchStats();
      fetchTickets(meta.page);
    } catch (err) {
      alert(err.message || 'Failed to claim ticket');
    } finally {
      setActionLoadingId(null);
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
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 text-xs font-semibold animate-bounce">
          <Check className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Agent Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
              Support Agent Portal
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Agent Operations Console &bull; {user?.name}
          </h2>
          <p className="text-xs text-slate-400">
            Manage your assigned workload, pick up unassigned queue requests, and drive resolutions.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="p-2.5 text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 rounded-xl border border-slate-700 transition"
            title="Refresh ticket queue"
            aria-label="Refresh ticket queue"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link
            to="/tickets"
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
          >
            <span>Full Ticket Directory</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Agent Workload KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Assigned to Me */}
        <div 
          onClick={() => setQueueTab('assigned')}
          className={`cursor-pointer transition rounded-2xl p-4 border relative overflow-hidden ${
            queueTab === 'assigned' 
              ? 'bg-blue-900/20 border-blue-500/50 ring-1 ring-blue-500/30' 
              : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-blue-400">My Assigned</span>
            <UserCheck className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2.5">
            {statsLoading ? (
              <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />
            ) : (
              <span className="text-2xl font-extrabold text-white">{stats.myAssigned}</span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Active tickets in your queue</p>
        </div>

        {/* In Progress */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-indigo-400">In Progress</span>
            <Sparkles className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2.5">
            {statsLoading ? (
              <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />
            ) : (
              <span className="text-2xl font-extrabold text-indigo-300">{stats.myInProgress}</span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Under active review</p>
        </div>

        {/* Waiting for Customer */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400">Waiting</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2.5">
            {statsLoading ? (
              <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />
            ) : (
              <span className="text-2xl font-extrabold text-amber-300">{stats.myWaiting}</span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Customer reply pending</p>
        </div>

        {/* Unassigned Triage Queue */}
        <div 
          onClick={() => setQueueTab('unassigned')}
          className={`cursor-pointer transition rounded-2xl p-4 border relative overflow-hidden ${
            queueTab === 'unassigned' 
              ? 'bg-amber-900/20 border-amber-500/50 ring-1 ring-amber-500/30' 
              : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400">Unassigned</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2.5">
            {statsLoading ? (
              <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />
            ) : (
              <span className="text-2xl font-extrabold text-amber-400">{stats.unassignedQueue}</span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Requires agent claim</p>
        </div>

        {/* Resolved */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-teal-400">Resolved</span>
            <CheckCircle2 className="h-4 w-4 text-teal-400" />
          </div>
          <div className="mt-2.5">
            {statsLoading ? (
              <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />
            ) : (
              <span className="text-2xl font-extrabold text-teal-400">{stats.myResolved}</span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Closed by your account</p>
        </div>
      </div>

      {/* Main Agent Ticket Operations Surface */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl shadow-sm overflow-hidden">
        {/* Queue Switcher and Search/Filter Bar */}
        <div className="p-5 border-b border-slate-700/60 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-slate-900/40">
          {/* Queue Tab Buttons */}
          <div className="flex items-center space-x-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 self-start">
            <button
              onClick={() => setQueueTab('assigned')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                queueTab === 'assigned'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Assigned to Me ({stats.myAssigned})
            </button>
            <button
              onClick={() => setQueueTab('unassigned')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                queueTab === 'unassigned'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Unassigned Queue ({stats.unassignedQueue})
            </button>
            <button
              onClick={() => setQueueTab('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                queueTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Workspace Tickets
            </button>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-56">
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
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
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
                setPriorityFilter('');
                setStatusFilter('');
                setCategoryFilter('');
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
                <th className="px-4 py-3">Ticket ID</th>
                <th className="px-4 py-3">Issue Title</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Assigned To</th>
                <th className="px-4 py-3 text-center">Quick Workflow Actions</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/30">
              {ticketsLoading ? (
                <tr>
                  <td colSpan="8" className="px-5 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center space-y-2">
                      <Loader2 className="h-6 w-6 text-brand-400 animate-spin" />
                      <span>Loading active support queue...</span>
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
                        className="px-3 py-1 bg-slate-800 text-white rounded border border-slate-700 text-xs hover:bg-slate-700"
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
                      <Inbox className="h-10 w-10 text-slate-600 mx-auto" />
                      <p className="text-sm font-semibold text-slate-200">No tickets found in this queue</p>
                      <p className="text-xs text-slate-500">
                        {queueTab === 'unassigned'
                          ? 'Great job! The unassigned triage queue is completely clear.'
                          : queueTab === 'assigned'
                          ? 'You currently have no tickets assigned to your queue. Check the unassigned queue to claim one!'
                          : 'No tickets matched the filter criteria.'}
                      </p>
                      {queueTab === 'assigned' && stats.unassignedQueue > 0 && (
                        <button
                          onClick={() => setQueueTab('unassigned')}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>View Unassigned Queue ({stats.unassignedQueue})</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                tickets.map((t) => {
                  const isClaimable = !t.assignedAgent;
                  const isAssignedToMe = Boolean(
                    t.assignedAgent && (
                      t.assignedAgent._id === (user?.id || user?._id) ||
                      t.assignedAgent.id === (user?.id || user?._id) ||
                      t.assignedAgent.email === user?.email
                    )
                  );
                  const isActionLoading = actionLoadingId === t.ticketId;

                  return (
                    <tr
                      key={t._id}
                      onClick={() => navigate(`/tickets/${t.ticketId}`)}
                      className="hover:bg-slate-800/40 cursor-pointer transition"
                    >
                      <td className="px-4 py-3.5 font-mono font-bold text-brand-400">
                        {t.ticketId}
                      </td>
                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="font-semibold text-white truncate">{t.title}</p>
                        <p className="text-[11px] text-slate-500 capitalize">{t.category?.replace('_', ' ')}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${getPriorityBadge(
                            t.priority
                          )}`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                            t.status
                          )}`}
                        >
                          {t.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate max-w-[100px]">{t.customer?.name || 'Customer'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {t.assignedAgent ? (
                          <span className={`text-[11px] font-medium ${isAssignedToMe ? 'text-blue-300 font-bold' : 'text-slate-400'}`}>
                            {isAssignedToMe ? 'You' : t.assignedAgent.name}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Quick Status Workflow Action Buttons */}
                      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1.5">
                          {isActionLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-brand-400" />
                          ) : isClaimable ? (
                            <button
                              onClick={(e) => handleClaim(e, t.ticketId)}
                              className="px-2.5 py-1 rounded text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm"
                              title="Claim this ticket for yourself"
                            >
                              Claim Ticket
                            </button>
                          ) : (
                            <>
                              {t.status !== 'IN_PROGRESS' && t.status !== 'RESOLVED' && t.status !== 'CLOSED' && (
                                <button
                                  onClick={(e) => handleQuickStatus(e, t.ticketId, 'IN_PROGRESS')}
                                  className="px-2 py-1 rounded text-[10px] font-semibold bg-indigo-600/80 hover:bg-indigo-600 text-white border border-indigo-500/40 transition"
                                  title="Mark as In Progress"
                                >
                                  Start
                                </button>
                              )}
                              {t.status === 'IN_PROGRESS' && (
                                <button
                                  onClick={(e) => handleQuickStatus(e, t.ticketId, 'WAITING_FOR_CUSTOMER')}
                                  className="px-2 py-1 rounded text-[10px] font-semibold bg-amber-600/80 hover:bg-amber-600 text-white border border-amber-500/40 transition"
                                  title="Mark as Waiting for Customer"
                                >
                                  Wait
                                </button>
                              )}
                              {['IN_PROGRESS', 'WAITING_FOR_CUSTOMER'].includes(t.status) && (
                                <button
                                  onClick={(e) => handleQuickStatus(e, t.ticketId, 'RESOLVED')}
                                  className="px-2 py-1 rounded text-[10px] font-semibold bg-teal-600/80 hover:bg-teal-600 text-white border border-teal-500/40 transition"
                                  title="Resolve Ticket"
                                >
                                  Resolve
                                </button>
                              )}
                              {t.status === 'RESOLVED' && (
                                <span className="text-[10px] text-teal-400 font-semibold flex items-center space-x-1">
                                  <Check className="h-3 w-3" />
                                  <span>Resolved</span>
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tickets/${t.ticketId}`);
                          }}
                          className="inline-flex items-center space-x-1 text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition"
                        >
                          <span>View</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
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
