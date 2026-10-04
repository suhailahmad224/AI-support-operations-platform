import React, { useState } from 'react';
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Tag, 
  TrendingUp, 
  Check, 
  HelpCircle,
  RefreshCw,
  Zap,
  ShieldAlert,
  BookOpen
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { useAuth } from '../context/AuthContext';
import KnowledgeAssistantModal from './KnowledgeAssistantModal';

export default function TicketAiPanel({ ticket, onTicketUpdated }) {
  const { user } = useAuth();
  const [kbModalOpen, setKbModalOpen] = useState(false);
  const [analysis, setAnalysis] = useState(
    ticket.aiSummary
      ? {
          summary: ticket.aiSummary,
          sentiment: ticket.sentiment || 'NEUTRAL',
          intent: ticket.intent || 'GENERAL_SUPPORT',
          suggestedCategory: ticket.category,
          suggestedPriority: ticket.priority,
          tags: ticket.tags || [],
          provider: 'mock',
          isSimulated: true,
        }
      : null
  );

  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  const canApplyTriage = ['agent', 'admin'].includes(user?.role);

  const handleRunAnalysis = async () => {
    setLoading(true);
    setError(null);
    setAppliedSuccess(false);

    try {
      const res = await aiService.analyzeTicket(ticket.ticketId);
      setAnalysis(res.data);
    } catch (err) {
      setError(err.message || 'Failed to generate AI analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleApplySuggestions = async () => {
    if (!analysis) return;
    setApplying(true);
    setError(null);

    try {
      await aiService.applyAnalysis(ticket.ticketId, {
        suggestedCategory: analysis.suggestedCategory,
        suggestedPriority: analysis.suggestedPriority,
        sentiment: analysis.sentiment,
        intent: analysis.intent,
        summary: analysis.summary,
        tags: analysis.tags,
        applyCategory: true,
        applyPriority: true,
      });

      setAppliedSuccess(true);
      setTimeout(() => setAppliedSuccess(false), 4000);
      if (onTicketUpdated) onTicketUpdated();
    } catch (err) {
      setError(err.message || 'Failed to apply AI suggestions');
    } finally {
      setApplying(false);
    }
  };

  const getSentimentBadge = (sentiment) => {
    switch (sentiment) {
      case 'POSITIVE':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'FRUSTRATED':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'NEGATIVE':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-brand-500/30 rounded-2xl shadow-xl overflow-hidden font-sans">
      {/* Panel Header */}
      <div className="p-4 sm:p-5 border-b border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400 shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                AI Ticket Copilot Intelligence
              </h3>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20">
                Mock Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Deterministic rule-based summary, sentiment, category, and triage recommendations
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={() => setKbModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 transition"
            title="Search verified documentation for this issue"
          >
            <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
            <span>Search KB</span>
          </button>

          <button
            onClick={handleRunAnalysis}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-md shadow-brand-500/20 transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5" />
                <span>{analysis ? 'Re-Analyze Ticket' : 'Analyze Ticket'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Panel Body */}
      <div className="p-5 sm:p-6 space-y-5">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{error}</p>
              <button
                onClick={handleRunAnalysis}
                className="mt-1.5 underline hover:text-white"
              >
                Click here to retry
              </button>
            </div>
          </div>
        )}

        {appliedSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-2 text-xs text-emerald-300 font-medium">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>AI suggestions successfully applied to the ticket!</span>
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center flex flex-col items-center space-y-3">
            <Loader2 className="h-8 w-8 text-brand-400 animate-spin" />
            <p className="text-xs font-medium text-slate-300">
              Running deterministic AI analysis on ticket content...
            </p>
            <p className="text-[11px] text-slate-500">
              Evaluating title, description, and keywords via Mock Provider.
            </p>
          </div>
        ) : !analysis ? (
          <div className="py-6 text-center text-slate-400 space-y-2">
            <Sparkles className="h-8 w-8 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-300">No AI analysis generated yet</p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Click "Analyze Ticket" above to automatically generate a concise executive summary, detect customer sentiment, and compute triage priority.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Executive Summary */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center space-x-1.5">
                <Check className="h-3 w-3 text-brand-400" />
                <span>Executive Summary</span>
              </span>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                {analysis.summary}
              </p>
            </div>

            {/* Metrics & Categorization Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Sentiment */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Customer Sentiment</span>
                <div className="mt-1.5">
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border uppercase ${getSentimentBadge(analysis.sentiment)}`}>
                    {analysis.sentiment}
                  </span>
                </div>
              </div>

              {/* Intent */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Detected Intent</span>
                <div className="mt-1.5">
                  <span className="text-xs font-bold text-white truncate block">
                    {analysis.intent.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Suggested Category */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Suggested Category</span>
                <div className="mt-1.5">
                  <span className="text-xs font-bold text-brand-300 capitalize">
                    {analysis.suggestedCategory.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Suggested Priority */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Suggested Priority</span>
                <div className="mt-1.5">
                  <span className="text-xs font-bold text-amber-400">
                    {analysis.suggestedPriority}
                  </span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {analysis.tags && analysis.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 font-medium mr-1 flex items-center space-x-1">
                  <Tag className="h-3 w-3" />
                  <span>Tags:</span>
                </span>
                {analysis.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Staff Action: Apply Suggestions */}
            {canApplyTriage && (
              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-[11px] text-slate-400">
                  Review the recommendations above before updating ticket fields.
                </p>

                <button
                  onClick={handleApplySuggestions}
                  disabled={applying}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition disabled:opacity-50 self-start sm:self-auto"
                >
                  {applying ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Applying Changes...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Apply AI Triage to Ticket</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Embedded Grounded Knowledge Assistant Modal */}
      <KnowledgeAssistantModal
        isOpen={kbModalOpen}
        onClose={() => setKbModalOpen(false)}
        initialQuery={ticket.title}
      />
    </div>
  );
}
