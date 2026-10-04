import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Ticket as TicketIcon, 
  Send, 
  Loader2, 
  AlertCircle, 
  HelpCircle,
  Tag,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { ticketService } from '../services/ticketService';

export default function CreateTicket() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'MEDIUM',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    { value: 'technical', label: 'Technical Issue', desc: 'Bugs, errors, integration problems' },
    { value: 'billing', label: 'Billing & Payments', desc: 'Invoices, subscriptions, refunds' },
    { value: 'account', label: 'Account & Security', desc: 'Logins, credentials, permissions' },
    { value: 'feature_request', label: 'Feature Request', desc: 'Suggestions, product improvements' },
    { value: 'general', label: 'General Inquiry', desc: 'Questions, guidance, other topics' },
  ];

  const priorities = [
    { value: 'LOW', label: 'Low', color: 'border-slate-600 text-slate-300' },
    { value: 'MEDIUM', label: 'Medium', color: 'border-blue-500 text-blue-400' },
    { value: 'HIGH', label: 'High', color: 'border-amber-500 text-amber-400' },
    { value: 'URGENT', label: 'Urgent', color: 'border-rose-500 text-rose-400' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Please provide a ticket title.');
      return;
    }
    if (formData.description.trim().length < 10) {
      setError('Description must be at least 10 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await ticketService.createTicket(formData);
      const createdTicket = res.data;
      navigate(`/tickets/${createdTicket.ticketId}`);
    } catch (err) {
      setError(err.message || 'Failed to submit ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            to="/tickets"
            className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-3 py-1.5 rounded-lg border border-slate-700 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Tickets</span>
          </Link>
          <div className="flex items-center space-x-2">
            <TicketIcon className="h-4 w-4 text-indigo-400" />
            <span className="text-sm font-semibold text-white">New Support Request</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Create Support Ticket
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Submit your request to our support operations queue. An agent will review and triage your issue.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3 text-rose-300 text-xs">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Ticket Title / Subject
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Cannot process credit card payment for quarterly subscription"
                  className="w-full px-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition"
                />
              </div>
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories.map((cat) => (
                  <button
                    type="button"
                    key={cat.value}
                    onClick={() => setFormData({ ...formData, category: cat.value })}
                    className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      formData.category === cat.value
                        ? 'bg-brand-500/10 border-brand-500 text-white shadow-sm'
                        : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                    }`}
                  >
                    <span className="text-xs font-bold text-white">{cat.label}</span>
                    <span className="text-[11px] text-slate-400 mt-1">{cat.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Priority Level
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {priorities.map((p) => (
                  <button
                    type="button"
                    key={p.value}
                    onClick={() => setFormData({ ...formData, priority: p.value })}
                    className={`py-2.5 px-3 rounded-xl border text-center font-semibold text-xs transition ${
                      formData.priority === p.value
                        ? `bg-slate-800 border-2 ${p.color} ring-1 ring-white/10`
                        : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description Textarea */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Detailed Description
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  {formData.description.length} chars (min 10)
                </span>
              </div>
              <textarea
                required
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Please describe the issue in detail, including steps to reproduce, error codes, and business impact..."
                className="w-full px-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm transition"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-slate-700/60 flex items-center justify-end space-x-3">
              <Link
                to="/tickets"
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-500/20 disabled:opacity-50 transition"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Create Ticket</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
