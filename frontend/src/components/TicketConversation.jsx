import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Lock, 
  Send, 
  Loader2, 
  AlertCircle, 
  User, 
  Headphones, 
  ShieldCheck, 
  Clock, 
  RefreshCw,
  Info,
  Sparkles,
  Edit3,
  X,
  Check
} from 'lucide-react';
import { messageService } from '../services/messageService';
import { aiService } from '../services/aiService';
import { useAuth } from '../context/AuthContext';

export default function TicketConversation({ ticketId, onMessageAdded }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // Composer state
  const [messageText, setMessageText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [composerError, setComposerError] = useState('');

  // AI Reply Draft State
  const [aiDraft, setAiDraft] = useState('');
  const [aiRationale, setAiRationale] = useState('');
  const [loadingAiDraft, setLoadingAiDraft] = useState(false);
  const [showAiDraftBox, setShowAiDraftBox] = useState(false);
  const [aiDraftError, setAiDraftError] = useState('');

  const messagesEndRef = useRef(null);

  const handleGenerateAiReply = async () => {
    setLoadingAiDraft(true);
    setAiDraftError('');
    try {
      const res = await aiService.suggestReply(ticketId);
      setAiDraft(res.data.suggestedReply || '');
      setAiRationale(res.data.rationale || '');
      setShowAiDraftBox(true);
    } catch (err) {
      setAiDraftError(err.message || 'Failed to generate AI reply suggestion');
    } finally {
      setLoadingAiDraft(false);
    }
  };

  const handleInsertDraft = (targetInternal) => {
    setMessageText(aiDraft);
    setIsInternal(targetInternal);
    setShowAiDraftBox(false);
  };

  const handleDiscardDraft = () => {
    setAiDraft('');
    setShowAiDraftBox(false);
  };

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await messageService.getMessages(ticketId);
      setMessages(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ticketId) {
      fetchMessages();
    }
  }, [ticketId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, loading]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) {
      setComposerError('Message text cannot be empty.');
      return;
    }

    setSending(true);
    setComposerError('');

    try {
      const payload = {
        message: messageText.trim(),
        isInternal: isInternal && ['agent', 'admin'].includes(user?.role),
      };

      const res = await messageService.sendMessage(ticketId, payload);
      setMessageText('');
      setMessages((prev) => [...prev, res.data]);
      if (onMessageAdded) onMessageAdded();
    } catch (err) {
      setComposerError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
            <ShieldCheck className="h-3 w-3" />
            <span>Admin</span>
          </span>
        );
      case 'agent':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
            <Headphones className="h-3 w-3" />
            <span>Staff Agent</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
            <User className="h-3 w-3" />
            <span>Customer</span>
          </span>
        );
    }
  };

  const canPostInternal = ['agent', 'admin'].includes(user?.role);

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl shadow-xl overflow-hidden flex flex-col font-sans">
      {/* Conversation Header */}
      <div className="p-4 sm:p-5 border-b border-slate-700/60 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center space-x-2">
              <span>Ticket Conversation</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-normal">
                {messages.length} {messages.length === 1 ? 'entry' : 'entries'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Chronological communication log &bull; Customer replies and staff internal notes
            </p>
          </div>
        </div>

        <button
          onClick={fetchMessages}
          disabled={loading}
          className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
          title="Refresh conversation"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Messages Thread Container */}
      <div className="p-4 sm:p-6 space-y-4 max-h-[500px] overflow-y-auto bg-slate-900/30">
        {loading ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center space-y-2">
            <Loader2 className="h-6 w-6 text-brand-400 animate-spin" />
            <span className="text-xs">Loading conversation history...</span>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-rose-400 flex flex-col items-center space-y-2">
            <AlertCircle className="h-6 w-6" />
            <span className="text-xs">{error}</span>
            <button
              onClick={fetchMessages}
              className="px-3 py-1 bg-slate-800 text-white rounded text-xs border border-slate-700 hover:bg-slate-700"
            >
              Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="py-10 text-center text-slate-500 space-y-2">
            <MessageSquare className="h-8 w-8 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">No messages in this ticket yet</p>
            <p className="text-[11px] text-slate-500">
              Start the discussion by writing a reply below.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isNote = msg.isInternal;
            const isMe = msg.sender?._id === (user?.id || user?._id);

            return (
              <div
                key={msg._id}
                className={`rounded-xl p-4 transition border ${
                  isNote
                    ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                    : msg.senderRole === 'customer'
                    ? 'bg-slate-800/80 border-slate-700/70 text-slate-200'
                    : 'bg-indigo-950/20 border-indigo-500/30 text-slate-200'
                }`}
              >
                {/* Message Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-700/40">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-xs text-white">
                      {msg.sender?.name || 'User'}
                    </span>
                    {getRoleBadge(msg.senderRole)}

                    {isNote && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        <Lock className="h-3 w-3" />
                        <span>Private Internal Note (Staff Only)</span>
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(msg.createdAt).toLocaleString()}</span>
                  </span>
                </div>

                {/* Message Body */}
                <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.message}
                </p>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer Area */}
      <div className="p-4 sm:p-5 border-t border-slate-700/60 bg-slate-900/80">
        {/* Mode Selector & AI Assistant for Staff */}
        {canPostInternal && (
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsInternal(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  !isInternal
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white bg-slate-800/80'
                }`}
              >
                Public Reply to Customer
              </button>
              <button
                type="button"
                onClick={() => setIsInternal(true)}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isInternal
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white bg-slate-800/80'
                }`}
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Private Internal Note</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleGenerateAiReply}
              disabled={loadingAiDraft}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 transition shadow-sm disabled:opacity-50"
              title="Generate simulated AI draft response"
            >
              {loadingAiDraft ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-400" />
                  <span>Drafting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-brand-400" />
                  <span>✨ AI Draft Assistant (Mock)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* AI Draft Suggestion Box */}
        {showAiDraftBox && (
          <div className="mb-4 p-4 rounded-xl bg-slate-900 border border-brand-500/40 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-brand-400" />
                <span className="text-xs font-bold text-white">
                  Simulated AI Response Suggestion (Mock Engine)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-brand-500/10 text-brand-300 border border-brand-500/20">
                  Review & Edit Before Sending
                </span>
              </div>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
                title="Discard suggestion"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {aiRationale && (
              <p className="text-[11px] text-slate-400 italic">
                Rationale: {aiRationale}
              </p>
            )}

            <textarea
              rows="4"
              value={aiDraft}
              onChange={(e) => setAiDraft(e.target.value)}
              className="w-full p-3 bg-slate-950/80 border border-slate-700 rounded-lg text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 font-sans"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-amber-400/90 font-medium">
                ⚠️ Never sent automatically. Review and edit before sending to customer.
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
                >
                  Discard Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertDraft(false)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 transition shadow-sm"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Insert into Public Reply</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertDraft(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/40 transition"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Insert into Internal Note</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {aiDraftError && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center space-x-2 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{aiDraftError}</span>
          </div>
        )}

        {/* Internal Note Banner Warning */}
        {isInternal && canPostInternal && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center space-x-2 text-[11px] text-amber-300 font-medium">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            <span>
              Internal Note mode active: This note is strictly invisible to the customer and will only be seen by authorized staff.
            </span>
          </div>
        )}

        {composerError && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center space-x-2 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{composerError}</span>
          </div>
        )}

        {/* Composer Form */}
        <form onSubmit={handleSendMessage} className="space-y-3">
          <textarea
            rows="3"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={
              isInternal
                ? 'Type private note for agents & admins (e.g. investigation details, logs)...'
                : 'Type your message or response to this support ticket...'
            }
            className={`w-full p-3 bg-slate-900 border rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition ${
              isInternal
                ? 'border-amber-500/50 focus:ring-amber-500'
                : 'border-slate-700 focus:ring-brand-500'
            }`}
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              {messageText.length} / 5000 characters
            </span>

            <button
              type="submit"
              disabled={sending || !messageText.trim()}
              className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                isInternal
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-brand-600 hover:bg-brand-500'
              }`}
            >
              {sending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>{isInternal ? 'Post Internal Note' : 'Send Reply'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
