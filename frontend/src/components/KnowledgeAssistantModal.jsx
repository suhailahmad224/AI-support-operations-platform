import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Search, 
  BookOpen, 
  ExternalLink, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { articleService } from '../services/articleService';

export default function KnowledgeAssistantModal({ isOpen, onClose, onSelectArticle, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const quickQuestions = [
    'How do I reset my password?',
    'What is your refund policy?',
    'How to fix 504 Gateway Timeout?',
    'How do I configure Two-Factor Authentication (2FA)?',
  ];

  const handleAsk = async (questionToAsk) => {
    const q = (questionToAsk || query).trim();
    if (!q || q.length < 3) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await articleService.askAssistant(q);
      setResult(res.data);
    } catch (err) {
      setError(err.message || 'Failed to generate assistant response');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickClick = (q) => {
    setQuery(q);
    handleAsk(q);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-brand-500 flex items-center justify-center shadow-md shadow-brand-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Knowledge Assistant (RAG)</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300">
                  Mock AI
                </span>
              </h2>
              <p className="text-xs text-slate-400">Ask questions grounded in our verified documentation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Query Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk();
            }}
            className="space-y-3"
          >
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask any question about our platform, security, or billing..."
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-11 pr-24 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="absolute right-2 top-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 transition shadow-sm"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Ask AI'}
              </button>
            </div>

            {/* Quick Questions Pills */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Suggested queries:</span>
              <div className="flex flex-wrap gap-1.5">
                {quickQuestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleQuickClick(q)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 hover:text-white transition text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="py-10 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
              <p className="text-xs">Searching knowledge base chunks & synthesizing response...</p>
            </div>
          )}

          {/* AI Answer & Citations */}
          {result && (
            <div className="space-y-4 pt-2">
              <div className="p-5 rounded-xl bg-slate-800/90 border border-brand-500/30 shadow-md space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 text-brand-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Synthesized Knowledge Response
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
                    Confidence: {Math.round(result.confidence * 100)}%
                  </span>
                </div>

                <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {result.answer}
                </div>

                {/* Simulated Disclaimer */}
                <div className="pt-2 flex items-center space-x-1.5 text-[11px] text-amber-400/90 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                  <span>
                    Simulated Mock AI response grounded in retrieved documentation excerpts.
                  </span>
                </div>
              </div>

              {/* Source Citations */}
              {result.sources && result.sources.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Referenced Knowledge Sources ({result.sources.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.sources.map((src, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          if (onSelectArticle) {
                            onSelectArticle(src.slug);
                            onClose();
                          }
                        }}
                        className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-750 border border-slate-700/60 hover:border-brand-500/50 cursor-pointer transition space-y-1.5 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-900 text-indigo-300 border border-slate-700">
                            {src.category}
                          </span>
                          <ExternalLink className="h-3.5 w-3.5 text-slate-500 group-hover:text-brand-400 transition" />
                        </div>
                        <h5 className="text-xs font-bold text-white group-hover:text-brand-300 line-clamp-1 transition">
                          {src.title}
                        </h5>
                        {src.excerpt && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-snug">
                            {src.excerpt}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs text-slate-400 text-center">
                  No direct article excerpts matched this query.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-850 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            Close Assistant
          </button>
        </div>
      </div>
    </div>
  );
}
