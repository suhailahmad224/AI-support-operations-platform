import api from '../config/api';

export const articleService = {
  /**
   * Fetch paginated articles with optional search and category filters
   */
  getArticles: async (params = {}) => {
    return await api.get('/articles', { params });
  },

  /**
   * Fetch a single article by slug or ID
   */
  getArticle: async (slugOrId) => {
    return await api.get(`/articles/${slugOrId}`);
  },

  /**
   * Create new article (Admin only)
   */
  createArticle: async (articleData) => {
    return await api.post('/articles', articleData);
  },

  /**
   * Update article (Admin only)
   */
  updateArticle: async (id, articleData) => {
    return await api.put(`/articles/${id}`, articleData);
  },

  /**
   * Toggle article publish status (Admin only)
   */
  togglePublishStatus: async (id) => {
    return await api.patch(`/articles/${id}/publish`);
  },

  /**
   * Delete article (Admin only)
   */
  deleteArticle: async (id) => {
    return await api.delete(`/articles/${id}`);
  },

  /**
   * Search knowledge base chunks via RAG lexical engine
   */
  searchRag: async (query, options = {}) => {
    return await api.post('/articles/rag/search', {
      query,
      topK: options.topK || 4,
      category: options.category,
    });
  },

  /**
   * Ask the grounded Knowledge Base Assistant (RAG)
   */
  askAssistant: async (query, category) => {
    return await api.post('/articles/rag/ask', {
      query,
      category,
    });
  },
};
