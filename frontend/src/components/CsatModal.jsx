import React, { useState } from 'react';
import { 
  X, 
  Star, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Heart
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';

const RATING_LABELS = {
  1: 'Terrible - Very dissatisfied',
  2: 'Poor - Needs significant improvement',
  3: 'Average - Issue resolved adequately',
  4: 'Good - Courteous and fast support',
  5: 'Outstanding - Exceeded all expectations!',
};

export default function CsatModal({ isOpen, onClose, ticketId, onFeedbackSubmitted, existingFeedback = null }) {
  const [rating, setRating] = useState(existingFeedback?.rating || 5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(existingFeedback?.comment || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) return;

    setLoading(true);
    setError(null);

    try {
      const res = await analyticsService.submitFeedback(ticketId, {
        rating,
        comment: comment.trim(),
        allowUpdate: true,
      });

      setSubmitted(true);
      setTimeout(() => {
        if (onFeedbackSubmitted) onFeedbackSubmitted(res.data);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  const activeRating = hoveredRating || rating;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Star className="h-5 w-5 fill-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Rate Support Experience</h2>
              <p className="text-xs text-slate-400">Ticket {ticketId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white">Thank You for Your Feedback!</h3>
            <p className="text-xs text-slate-400">
              Your rating has been recorded and will help our team improve service quality.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Star Rating Selector */}
            <div className="space-y-2 text-center">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                How satisfied were you with the resolution?
              </label>

              <div className="flex items-center justify-center space-x-2 py-2">
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const isFilled = starValue <= activeRating;
                  return (
                    <button
                      key={starValue}
                      type="button"
                      onClick={() => setRating(starValue)}
                      onMouseEnter={() => setHoveredRating(starValue)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="p-1.5 focus:outline-none transition-transform hover:scale-125 duration-150"
                    >
                      <Star
                        className={`h-8 w-8 transition ${
                          isFilled
                            ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                            : 'text-slate-600 hover:text-slate-500'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <p className="text-xs font-semibold text-amber-300 h-5">
                {RATING_LABELS[activeRating] || ''}
              </p>
            </div>

            {/* Comment Area */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-400">
                  Optional Comments or Suggestions
                </label>
                <span className="text-[11px] text-slate-500">{comment.length}/1000</span>
              </div>
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                placeholder="Tell us what went well or how we can do better next time..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 leading-relaxed"
              />
            </div>

            {/* Submit Actions */}
            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-600/20 transition disabled:opacity-50"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Submit Feedback</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
