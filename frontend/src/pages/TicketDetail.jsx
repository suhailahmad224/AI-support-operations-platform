import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Ticket as TicketIcon, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Headphones, 
  ShieldCheck, 
  Activity, 
  ArrowRight, 
  Loader2, 
  Tag, 
  Calendar, 
  Play, 
  RotateCcw,
  Check,
  Building,
  Star
} from 'lucide-react';
import { ticketService } from '../services/ticketService';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import TicketConversation from '../components/TicketConversation';
import NotificationBell from '../components/NotificationBell';
import TicketAiPanel from '../components/TicketAiPanel';
import CsatModal from '../components/CsatModal';

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [auditHistory, setAuditHistory] = useState([]);
  const [agentsList, setAgentsList] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [csatModalOpen, setCsatModalOpen] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchTicketDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ticketService.getTicketById(id);
      setTicket(res.data.ticket);
      setAuditHistory(res.data.auditHistory || []);
      if (res.data.ticket.assignedAgent) {
        setSelectedAgentId(res.data.ticket.assignedAgent._id || '');
      }
    } catch (err) {
      setError(err.message || 'Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAgents = async () => {
    if (['admin', 'agent'].includes(user?.role)) {
      try {
        const res = await userService.getAgents();
        setAgentsList(res.data || []);
      } catch (err) {
        console.warn('Could not fetch agents list:', err.message);
      }
    }
  };

  useEffect(() => {
    fetchTicketDetails();
    fetchAgents();
  }, [fetchTicketDetails]);

  // Handle status update via State Machine
  const handleStatusChange = async (newStatus) => {
    setActionLoading(true);
    try {
      await ticketService.updateTicketStatus(ticket.ticketId, newStatus);
      showToast(`Ticket status updated to ${newStatus}`);
      fetchTicketDetails();
    } catch (err) {
      alert(err.message || 'Status transition failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Agent or Admin Claim
  const currentUserId = user?.id || user?._id;
  const isAssignedToMe = Boolean(
    ticket?.assignedAgent && (
      ticket.assignedAgent._id === currentUserId ||
      ticket.assignedAgent.id === currentUserId ||
      ticket.assignedAgent.email === user?.email
    )
  );
  const canStaffClaim = ['agent', 'admin'].includes(user?.role);

  const handleClaimTicket = async () => {
    setActionLoading(true);
    try {
      await ticketService.assignTicket(ticket.ticketId, currentUserId);
      showToast('You have claimed this ticket.');
      fetchTicketDetails();
    } catch (err) {
      alert(err.message || 'Failed to claim ticket');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Admin Assign
  const handleAssignAgent = async () => {
    setActionLoading(true);
    try {
      await ticketService.assignTicket(ticket.ticketId, selectedAgentId || null);
      showToast('Ticket assigned successfully.');
      fetchTicketDetails();
    } catch (err) {
      alert(err.message || 'Assignment failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
          <p className="text-slate-400 text-sm">Loading ticket details...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Error Loading Ticket</h2>
          <p className="text-sm text-slate-400">{error || 'Ticket not found'}</p>
          <Link
            to="/tickets"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Link>
        </div>
      </div>
    );
  }

  // Determine allowed next status transitions based on current state and role
  const getNextAllowedTransitions = () => {
    const transitions = [];
    const status = ticket.status;

    if (user.role === 'customer') {
      if (status !== 'CLOSED') {
        transitions.push({ status: 'CLOSED', label: 'Close Ticket', color: 'bg-slate-700 hover:bg-slate-600' });
      }
      if (status === 'RESOLVED') {
        transitions.push({ status: 'OPEN', label: 'Reopen Ticket', color: 'bg-amber-600 hover:bg-amber-500' });
      }
    } else {
      // Agent & Admin state transitions
      if (status === 'OPEN') {
        transitions.push({ status: 'IN_PROGRESS', label: 'Start Progress', color: 'bg-indigo-600 hover:bg-indigo-500' });
        transitions.push({ status: 'CLOSED', label: 'Close Ticket', color: 'bg-slate-700 hover:bg-slate-600' });
      } else if (status === 'ASSIGNED') {
        transitions.push({ status: 'IN_PROGRESS', label: 'Start Progress', color: 'bg-indigo-600 hover:bg-indigo-500' });
        transitions.push({ status: 'WAITING_FOR_CUSTOMER', label: 'Wait for Customer', color: 'bg-amber-600 hover:bg-amber-500' });
        transitions.push({ status: 'CLOSED', label: 'Close Ticket', color: 'bg-slate-700 hover:bg-slate-600' });
      } else if (status === 'IN_PROGRESS') {
        transitions.push({ status: 'WAITING_FOR_CUSTOMER', label: 'Wait for Customer', color: 'bg-amber-600 hover:bg-amber-500' });
        transitions.push({ status: 'RESOLVED', label: 'Resolve Ticket', color: 'bg-teal-600 hover:bg-teal-500' });
        transitions.push({ status: 'CLOSED', label: 'Close Ticket', color: 'bg-slate-700 hover:bg-slate-600' });
      } else if (status === 'WAITING_FOR_CUSTOMER') {
        transitions.push({ status: 'IN_PROGRESS', label: 'Resume Progress', color: 'bg-indigo-600 hover:bg-indigo-500' });
        transitions.push({ status: 'RESOLVED', label: 'Resolve Ticket', color: 'bg-teal-600 hover:bg-teal-500' });
      } else if (status === 'RESOLVED') {
        transitions.push({ status: 'CLOSED', label: 'Confirm & Close', color: 'bg-slate-700 hover:bg-slate-600' });
        transitions.push({ status: 'OPEN', label: 'Reopen Ticket', color: 'bg-amber-600 hover:bg-amber-500' });
      } else if (status === 'CLOSED') {
        if (user.role === 'admin') {
          transitions.push({ status: 'OPEN', label: 'Reopen Ticket', color: 'bg-amber-600 hover:bg-amber-500' });
        }
      }
    }

    return transitions;
  };

  const nextTransitions = getNextAllowedTransitions();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-slate-800 border border-emerald-500/40 shadow-2xl text-emerald-300 text-sm flex items-center space-x-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/tickets"
              className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-3 py-1.5 rounded-lg border border-slate-700 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Tickets</span>
            </Link>
            <div className="flex items-center space-x-2 font-mono">
              <span className="text-sm font-bold text-brand-400">{ticket.ticketId}</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                {ticket.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <NotificationBell />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Ticket Header & State Machine Stepper */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  {ticket.ticketId}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {ticket.category.replace('_', ' ')}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded border border-slate-600 text-slate-300">
                  Priority: {ticket.priority}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {ticket.title}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Opened on {new Date(ticket.createdAt).toLocaleString()} by{' '}
                <span className="text-slate-200 font-semibold">{ticket.customer?.name}</span>
                {ticket.resolvedAt && (
                  <span className="ml-3 text-teal-400">
                    &bull; Resolved on {new Date(ticket.resolvedAt).toLocaleDateString()}
                  </span>
                )}
                {ticket.closedAt && (
                  <span className="ml-3 text-slate-500">
                    &bull; Closed on {new Date(ticket.closedAt).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>

            {/* Top Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {canStaffClaim && !isAssignedToMe && (
                <button
                  onClick={handleClaimTicket}
                  disabled={actionLoading}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20 transition disabled:opacity-50"
                >
                  <Headphones className="h-3.5 w-3.5" />
                  <span>{ticket.assignedAgent ? 'Take Over / Claim Ticket' : 'Claim Ticket For Myself'}</span>
                </button>
              )}

              {nextTransitions.length > 0 && (
                <>
                  <span className="text-xs text-slate-400 font-medium">Next Action:</span>
                  {nextTransitions.map((act) => (
                    <button
                      key={act.status}
                      onClick={() => handleStatusChange(act.status)}
                      disabled={actionLoading}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition ${act.color} disabled:opacity-50`}
                    >
                      {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>{act.label}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* CSAT Customer Satisfaction Banner */}
          {['RESOLVED', 'CLOSED'].includes(ticket.status) && (
            <div className="pt-5 border-t border-slate-700/60">
              {ticket.feedback?.rating ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-4 w-4 ${
                              s <= ticket.feedback.rating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-amber-300">
                        Customer Satisfaction Review: {ticket.feedback.rating} / 5 Stars
                      </span>
                    </div>
                    {ticket.feedback.comment && (
                      <p className="text-xs text-slate-300 italic">
                        "{ticket.feedback.comment}"
                      </p>
                    )}
                    <div className="text-[10px] text-slate-500 font-mono">
                      Feedback recorded on {new Date(ticket.feedback.submittedAt).toLocaleDateString()}
                    </div>
                  </div>
                  {user?.role === 'customer' && (
                    <button
                      onClick={() => setCsatModalOpen(true)}
                      className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline self-start sm:self-auto"
                    >
                      Update Review
                    </button>
                  )}
                </div>
              ) : user?.role === 'customer' ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-850 to-amber-500/5 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                      <Star className="h-5 w-5 fill-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">How was your resolution experience?</h4>
                      <p className="text-xs text-slate-400">
                        This ticket is {ticket.status.toLowerCase()}. Please share your feedback to help our support team improve.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCsatModalOpen(true)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 shadow-md shadow-amber-500/20 transition self-start sm:self-auto"
                  >
                    <Star className="h-3.5 w-3.5 fill-slate-900" />
                    <span>Rate Support (1–5 Stars)</span>
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {/* Visual Lifecycle Stepper */}
          <div className="pt-6 border-t border-slate-700/60">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Ticket State Progression
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'].map(
                (step, idx) => {
                  const isCurrent = ticket.status === step;
                  return (
                    <div
                      key={step}
                      className={`p-3 rounded-xl border text-center transition flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-brand-500/20 border-brand-500 text-white font-bold ring-1 ring-brand-500 shadow-md'
                          : 'bg-slate-900/60 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-mono text-slate-400">Step {idx + 1}</span>
                      <span className="text-xs mt-1 truncate">{step.replace(/_/g, ' ')}</span>
                      {isCurrent && (
                        <span className="mt-1 inline-flex items-center justify-center text-[10px] text-brand-300">
                          Active State
                        </span>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>

        {/* 2-Column Layout: Details + Assignment Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column: AI Analysis, Description & Audit Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Ticket Intelligence Panel */}
            <TicketAiPanel 
              ticket={ticket} 
              onTicketUpdated={fetchTicketDetails} 
            />

            {/* Description Card */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-white">Ticket Description</h2>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </div>
            </div>

            {/* Live Ticket Conversation & Staff Notes */}
            <TicketConversation 
              ticketId={ticket.ticketId} 
              onMessageAdded={fetchTicketDetails} 
            />

            {/* Audit Log Timeline Card */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-indigo-400" />
                  <h2 className="text-base font-bold text-white">Immutable Activity Audit Trail</h2>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {auditHistory.length} event{auditHistory.length === 1 ? '' : 's'} logged
                </span>
              </div>

              {auditHistory.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No activity history recorded yet.</p>
              ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800">
                  {auditHistory.map((item) => (
                    <div key={item._id} className="relative flex items-start space-x-4 pl-2">
                      <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-brand-400 relative z-10">
                        {item.action === 'TICKET_CREATED' ? '✦' : '→'}
                      </div>
                      <div className="flex-1 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="font-bold text-white">
                            {item.action.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-400">
                          By <span className="text-slate-200 font-medium">{item.actorEmail}</span>{' '}
                          <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                            {item.actorRole}
                          </span>
                        </p>
                        {item.details && (
                          <div className="text-[11px] text-slate-400 pt-1 font-mono">
                            {item.details.fromStatus && (
                              <span>Transition: {item.details.fromStatus} → {item.details.toStatus}</span>
                            )}
                            {item.details.assignedToName && (
                              <span>Assigned to: {item.details.assignedToName}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Column: Customer Info & Assignment Controls */}
          <div className="space-y-6">
            {/* Customer Overview Card */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <User className="h-4 w-4 text-emerald-400" />
                <span>Requester Details</span>
              </h3>
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Name:</span>
                  <span className="font-semibold text-white">{ticket.customer?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="text-slate-300 truncate max-w-[150px]">{ticket.customer?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Department:</span>
                  <span className="text-slate-300">{ticket.customer?.department || 'General'}</span>
                </div>
              </div>
            </div>

            {/* Assigned Agent & Delegation Card */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Headphones className="h-4 w-4 text-blue-400" />
                <span>Support Agent Assignment</span>
              </h3>

              {isAssignedToMe ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span>Assigned to You</span>
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200">
                      Active Assignee
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    You have active ownership of this ticket.
                  </p>
                </div>
              ) : ticket.assignedAgent ? (
                <div className="space-y-3">
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Agent:</span>
                      <span className="font-semibold text-white">{ticket.assignedAgent.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email:</span>
                      <span className="text-slate-300 truncate max-w-[150px]">{ticket.assignedAgent.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Department:</span>
                      <span className="text-slate-300">{ticket.assignedAgent.department}</span>
                    </div>
                  </div>

                  {canStaffClaim && (
                    <button
                      onClick={handleClaimTicket}
                      disabled={actionLoading}
                      className="w-full py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
                    >
                      <Headphones className="h-4 w-4" />
                      <span>Take Over / Reassign to Myself</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-dashed border-slate-700 text-center space-y-3">
                  <p className="text-xs text-slate-400">This ticket is currently unassigned.</p>
                  {canStaffClaim ? (
                    <button
                      onClick={handleClaimTicket}
                      disabled={actionLoading}
                      className="w-full py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-md shadow-blue-600/20"
                    >
                      <Headphones className="h-4 w-4" />
                      <span>Claim Ticket For Myself</span>
                    </button>
                  ) : (
                    <p className="text-[11px] text-slate-500">Waiting for a support agent to triage.</p>
                  )}
                </div>
              )}

              {/* Admin Assignment Dropdown */}
              {user.role === 'admin' && (
                <div className="pt-3 border-t border-slate-700/60 space-y-3">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Reassign Agent
                  </label>
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="">-- Unassigned --</option>
                    {agentsList.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.department}) &bull; {agent.assignedTicketsCount || 0} active
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignAgent}
                    disabled={actionLoading}
                    className="w-full py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition disabled:opacity-50"
                  >
                    {actionLoading ? 'Updating...' : 'Update Assignment'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* CSAT Rating Modal */}
      <CsatModal
        isOpen={csatModalOpen}
        onClose={() => setCsatModalOpen(false)}
        ticketId={ticket.ticketId}
        existingFeedback={ticket.feedback}
        onFeedbackSubmitted={fetchTicketDetails}
      />
    </div>
  );
}
