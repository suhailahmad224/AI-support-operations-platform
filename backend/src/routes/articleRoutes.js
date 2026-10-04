const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const {
  validateCreateArticle,
  validateUpdateArticle,
  validateRagSearch,
  validateRagAsk,
} = require('../validators/articleValidator');

// --- RAG & Search Routes (Define before /:slugOrId to avoid route collision) ---
router.post('/rag/search', optionalAuth, validateRagSearch, articleController.searchKnowledgeRag);
router.post('/rag/ask', optionalAuth, validateRagAsk, articleController.askKnowledgeAssistant);

// --- Public / Knowledge Base Explorer Routes ---
router.get('/', optionalAuth, articleController.getArticles);
router.get('/:slugOrId', optionalAuth, articleController.getArticleBySlugOrId);

// --- Admin-Only Management Routes ---
router.post('/', protect, authorize('admin'), validateCreateArticle, articleController.createArticle);
router.put('/:id', protect, authorize('admin'), validateUpdateArticle, articleController.updateArticle);
router.patch('/:id/publish', protect, authorize('admin'), articleController.togglePublishStatus);
router.delete('/:id', protect, authorize('admin'), articleController.deleteArticle);

module.exports = router;
