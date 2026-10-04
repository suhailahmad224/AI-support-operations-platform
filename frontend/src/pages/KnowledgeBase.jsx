import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  BookOpen, 
  Search, 
  Sparkles, 
  ArrowLeft, 
  Tag, 
  Eye, 
  Calendar, 
  User, 
  ExternalLink, 
  Loader2, 
  AlertCircle, 
  Plus, 
  Settings, 
  HelpCircle,
  Clock,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { articleService } from '../services/articleService';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import KnowledgeAssistantModal from '../components/KnowledgeAssistantModal';

const CATEGORIES = [
  { id: '', label: 'All Articles' },
  { id: 'general', label: 'General' },
  { id: 'account', label: 'Account & Access' },
  { id: 'billing', label: 'Billing & Payments' },
  { id: 'technical', label: 'Technical & API' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
  { id: 'security', label: 'Security & 2FA' },
];

export default function KnowledgeBase() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [articles, setArticles] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleLoading, setArticleLoading] = useState(false);

  // AI Assistant Modal
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantQuery, setAssistantQuery] = useState('');

  const fetchArticles = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await articleService.getArticles({
        page,
        limit: 12,
        category: category || undefined,
        search: searchQuery.trim() || undefined,
      });
      setArticles(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      setError(err.message || 'Failed to load knowledge articles');
    } finally {
      setLoading(false);
    }
  }, [category, searchQuery]);

  useEffect(() => {
    fetchArticles(1);
  }, [fetchArticles]);

  // Load article if slug in URL
  const articleSlugParam = searchParams.get('slug');
  useEffect(() => {
    if (articleSlugParam) {
      loadArticleBySlug(articleSlugParam);
    } else {
      setSelectedArticle(null);
    }
  }, [articleSlugParam]);

  const loadArticleBySlug = async (slug) => {
    setArticleLoading(true);
    try {
      const res = await articleService.getArticle(slug);
      setSelectedArticle(res.data);
    } catch (err) {
      setError(err.message || 'Article not found');
    } finally {
      setArticleLoading(false);
    }
  };

  const handleSelectArticle = (slug) => {
    setSearchParams({ slug });
  };

  const handleBackToList = () => {
    setSearchParams({});
    setSelectedArticle(null);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchArticles(1);
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
              <BookOpen className="h-5 w-5 text-indigo-400" />
              <h1 className="text-base font-bold text-white tracking-tight">Knowledge Base</h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <NotificationBell />

            <button
              onClick={() => {
                setAssistantQuery('');
                setAssistantOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-brand-600 hover:from-indigo-500 hover:to-brand-500 shadow-sm transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Ask AI Assistant</span>
            </button>

            {user?.role === 'admin' && (
              <Link
                to="/admin/articles"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              >
                <Settings className="h-3.5 w-3.5 text-slate-400" />
                <span>Manage Articles</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Article Reader View */}
        {selectedArticle ? (
          <div className="space-y-6">
            <button
              onClick={handleBackToList}
              className="inline-flex items-center space-x-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to all articles</span>
            </button>

            {articleLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              </div>
            ) : (
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 sm:p-10 shadow-sm space-y-6">
                <div className="space-y-3 pb-6 border-b border-slate-700/60">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs uppercase font-bold px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {selectedArticle.category}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center space-x-1">
                      <Eye className="h-3.5 w-3.5 text-slate-500" />
                      <span>{selectedArticle.views} views</span>
                    </span>
                    <span className="text-xs text-slate-400 flex items-center space-x-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      <span>{new Date(selectedArticle.createdAt).toLocaleDateString()}</span>
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {selectedArticle.title}
                  </h1>

                  <div className="text-xs text-slate-400 flex items-center space-x-2">
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    <span>Written by {selectedArticle.author?.name || 'Platform Team'}</span>
                  </div>
                </div>

                {/* Article Content Render */}
                <div className="prose prose-invert max-w-none text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedArticle.content}
                </div>

                {/* Tags */}
                {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                  <div className="pt-6 border-t border-slate-700/60 flex items-center space-x-2">
                    <Tag className="h-4 w-4 text-slate-500" />
                    <div className="flex flex-wrap gap-1.5">
                      {selectedArticle.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Knowledge Base Explorer Grid View */
          <>
            {/* Search & Hero Section */}
            <div className="bg-gradient-to-r from-slate-800/80 via-indigo-950/40 to-slate-850 border border-slate-700/60 rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
              <div className="max-w-2xl space-y-2">
                <span className="text-xs uppercase font-mono tracking-wider font-bold text-indigo-400">
                  Self-Service Documentation & FAQ
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  How can we help you today?
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Search guides, technical troubleshooting steps, billing policies, and security recommendations.
                </p>
              </div>

              {/* Search Bar Form */}
              <form onSubmit={handleSearchSubmit} className="max-w-2xl flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by keywords, error codes, topics..."
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-sm"
                >
                  Search
                </button>
              </form>

              {/* Category Filter Chips */}
              <div className="flex flex-wrap gap-2 pt-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition ${
                      category === cat.id
                        ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Loading Indicator */}
            {loading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              </div>
            ) : articles.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-slate-800/40 rounded-2xl border border-slate-800">
                <BookOpen className="h-10 w-10 text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-slate-300">No articles found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try adjusting your search query or switching categories, or ask our Knowledge Assistant.
                </p>
                <button
                  onClick={() => {
                    setAssistantQuery(searchQuery);
                    setAssistantOpen(true);
                  }}
                  className="mt-2 inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Ask Knowledge Assistant</span>
                </button>
              </div>
            ) : (
              /* Articles Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((art) => (
                  <div
                    key={art._id}
                    onClick={() => handleSelectArticle(art.slug)}
                    className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/40 rounded-2xl p-6 transition flex flex-col justify-between cursor-pointer group shadow-sm"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-indigo-300">
                          {art.category}
                        </span>
                        <span className="text-[11px] text-slate-500 flex items-center space-x-1">
                          <Eye className="h-3 w-3" />
                          <span>{art.views}</span>
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition line-clamp-2">
                        {art.title}
                      </h3>

                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                        {art.content}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
                      <span>{new Date(art.createdAt).toLocaleDateString()}</span>
                      <span className="inline-flex items-center space-x-1 text-indigo-400 group-hover:translate-x-0.5 transition font-semibold">
                        <span>Read Guide</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* RAG Grounded Knowledge Assistant Modal */}
      <KnowledgeAssistantModal
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        initialQuery={assistantQuery}
        onSelectArticle={(slug) => handleSelectArticle(slug)}
      />
    </div>
  );
}
