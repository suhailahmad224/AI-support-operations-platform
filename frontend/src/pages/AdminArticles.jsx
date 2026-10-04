import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Plus, 
  Search, 
  ArrowLeft, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Loader2, 
  Tag, 
  Layers, 
  ExternalLink,
  X,
  Check
} from 'lucide-react';
import { articleService } from '../services/articleService';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';

const CATEGORIES = [
  'general',
  'account',
  'billing',
  'technical',
  'troubleshooting',
  'security',
];

export default function AdminArticles() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [articles, setArticles] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Editor Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('general');
  const [tagsInput, setTagsInput] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchArticles = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await articleService.getArticles({
        page,
        limit: 20,
        search: search.trim() || undefined,
        category: categoryFilter || undefined,
        published: statusFilter !== '' ? statusFilter : undefined,
      });
      setArticles(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      setError(err.message || 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchArticles(1);
  }, [fetchArticles]);

  const handleOpenCreate = () => {
    setEditingArticle(null);
    setTitle('');
    setSlug('');
    setCategory('general');
    setTagsInput('');
    setContent('');
    setIsPublished(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (art) => {
    setEditingArticle(art);
    setTitle(art.title);
    setSlug(art.slug);
    setCategory(art.category);
    setTagsInput(Array.isArray(art.tags) ? art.tags.join(', ') : '');
    setContent(art.content);
    setIsPublished(art.isPublished);
    setModalOpen(true);
  };

  const handleTitleChange = (val) => {
    setTitle(val);
    if (!editingArticle) {
      // Auto slugify when creating new article
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generated);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSaving(true);
    setError(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const payload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      category,
      tags,
      content: content.trim(),
      isPublished,
    };

    try {
      if (editingArticle) {
        await articleService.updateArticle(editingArticle._id, payload);
        showToast('Article updated successfully');
      } else {
        await articleService.createArticle(payload);
        showToast('Knowledge article created and chunked successfully');
      }
      setModalOpen(false);
      fetchArticles(1);
    } catch (err) {
      setError(err.message || 'Failed to save article');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (art) => {
    try {
      await articleService.togglePublishStatus(art._id);
      showToast(`Article ${art.isPublished ? 'unpublished' : 'published'} successfully`);
      fetchArticles(meta.page);
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (art) => {
    if (!window.confirm(`Are you sure you want to delete "${art.title}"?`)) return;
    try {
      await articleService.deleteArticle(art._id);
      showToast('Article deleted successfully');
      fetchArticles(meta.page);
    } catch (err) {
      alert(err.message || 'Failed to delete article');
    }
  };

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
              to="/knowledge"
              className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-3 py-1.5 rounded-lg border border-slate-700 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Knowledge Base</span>
            </Link>
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-purple-400" />
              <h1 className="text-base font-bold text-white tracking-tight">Manage Knowledge Articles</h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Admin
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <NotificationBell />

            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              <span>New Article</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Filters Card */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search articles by title or keyword..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Statuses (Published & Drafts)</option>
              <option value="true">Published Only</option>
              <option value="false">Drafts Only</option>
            </select>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Articles Table */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="h-5 w-5 text-indigo-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Article Registry ({meta.total})
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            </div>
          ) : articles.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              No articles match the current criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Title & Slug</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Views</th>
                    <th className="py-3 px-4">Author</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {articles.map((art) => (
                    <tr key={art._id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-medium text-white max-w-xs">
                        <Link
                          to={`/knowledge?slug=${art.slug}`}
                          className="hover:text-indigo-300 transition font-bold line-clamp-1"
                        >
                          {art.title}
                        </Link>
                        <span className="text-[11px] font-mono text-slate-500 line-clamp-1">
                          /{art.slug}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-indigo-300">
                          {art.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {art.isPublished ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Check className="h-3 w-3" />
                            <span>Published</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <EyeOff className="h-3 w-3" />
                            <span>Draft</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {art.views || 0}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400">
                        {art.author?.name || 'Platform'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(art.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => handleTogglePublish(art)}
                          title={art.isPublished ? 'Unpublish to Draft' : 'Publish Article'}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
                        >
                          {art.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-emerald-400" />}
                        </button>
                        <button
                          onClick={() => handleOpenEdit(art)}
                          title="Edit Article"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(art)}
                          title="Delete Article"
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Editor Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-850">
              <h2 className="text-base font-bold text-white">
                {editingArticle ? 'Edit Knowledge Article' : 'Create New Knowledge Article'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Article Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. How to Configure Two-Factor Authentication"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Slug (URL Path)</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="how-to-configure-2fa"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="2fa, security, login, account"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-400">Content (Markdown / Plain Text) *</label>
                  <span className="text-[11px] text-slate-500">{content.length} characters</span>
                </div>
                <textarea
                  required
                  rows={10}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write clear, comprehensive steps and documentation..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans leading-relaxed"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="publishedToggle"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="publishedToggle" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Publish immediately (Uncheck to save as draft)
                </label>
              </div>

              <div className="p-4 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingArticle ? 'Save Changes' : 'Create & Auto-Chunk Article'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
