const mongoose = require('mongoose');
const Article = require('../models/Article');
const retrieverService = require('../services/rag/retrieverService');
const aiService = require('../services/ai/aiService');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');
const { escapeRegex } = require('../utils/sanitize');

/**
 * Generate a clean URL-friendly slug
 */
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Knowledge Base & RAG Controller
 */
class ArticleController {
  /**
   * Create new knowledge article (Admin only)
   * POST /api/articles
   */
  async createArticle(req, res, next) {
    try {
      const { title, content, category = 'general', tags = [], isPublished = true } = req.body;
      let slug = req.body.slug ? slugify(req.body.slug) : slugify(title);

      if (!slug) {
        slug = `article-${Date.now()}`;
      }

      // Check for duplicate slug
      const existing = await Article.findOne({ slug });
      if (existing) {
        throw new ApiError(409, `An article with slug "${slug}" already exists`);
      }

      const article = new Article({
        title,
        slug,
        content,
        category,
        tags,
        isPublished: Boolean(isPublished),
        author: req.user._id,
      });

      await article.save();
      await article.populate('author', 'name email role');

      logger.info(`[KnowledgeBase] Admin ${req.user.email} created article: "${article.title}" (${article.slug})`);

      return ApiResponse.success(res, article, 'Knowledge article created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List knowledge base articles with search, filtering, and pagination
   * GET /api/articles
   */
  async getArticles(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
      const skip = (page - 1) * limit;

      const { category, search, published } = req.query;
      const isAdmin = req.user?.role === 'admin';

      // Build query filter
      const filter = {};

      // Security guard: Non-admins can ONLY view published articles
      if (!isAdmin) {
        filter.isPublished = true;
      } else if (published !== undefined) {
        filter.isPublished = published === 'true';
      }

      if (category) {
        filter.category = category;
      }

      // Keyword search across title, content, tags (with ReDoS escaping)
      if (search && search.trim()) {
        const cleanSearch = escapeRegex(search.trim());
        const regex = new RegExp(cleanSearch, 'i');
        filter.$or = [{ title: regex }, { content: regex }, { tags: regex }, { slug: regex }];
      }

      const [articles, total] = await Promise.all([
        Article.find(filter)
          .select('-chunks') // Exclude heavy chunks from card listing
          .populate('author', 'name email role')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Article.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit) || 1;

      return ApiResponse.paginated(
        res,
        articles,
        {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        'Knowledge base articles retrieved'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single article by slug or ID
   * GET /api/articles/:slugOrId
   */
  async getArticleBySlugOrId(req, res, next) {
    try {
      const { slugOrId } = req.params;
      const isAdmin = req.user?.role === 'admin';

      const isObjectId = mongoose.Types.ObjectId.isValid(slugOrId);
      const query = isObjectId ? { $or: [{ _id: slugOrId }, { slug: slugOrId }] } : { slug: slugOrId };

      const article = await Article.findOne(query).populate('author', 'name email role');

      if (!article) {
        throw new ApiError(404, 'Knowledge article not found');
      }

      // Permission check: Unpublished drafts cannot be viewed by ordinary users
      if (!article.isPublished && !isAdmin) {
        throw new ApiError(404, 'Knowledge article not found or unpublished');
      }

      // Atomically increment view count (fire and forget)
      Article.updateOne({ _id: article._id }, { $inc: { views: 1 } }).exec();

      return ApiResponse.success(res, article, 'Article retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update article (Admin only)
   * PUT /api/articles/:id
   */
  async updateArticle(req, res, next) {
    try {
      const { id } = req.params;
      const { title, content, slug, category, tags, isPublished } = req.body;

      const isObjectId = mongoose.Types.ObjectId.isValid(id);
      const query = isObjectId ? { $or: [{ _id: id }, { slug: id }] } : { slug: id };

      const article = await Article.findOne(query);
      if (!article) {
        throw new ApiError(404, 'Knowledge article not found');
      }

      // Check slug uniqueness if updating slug
      if (slug && slugify(slug) !== article.slug) {
        const cleanSlug = slugify(slug);
        const duplicate = await Article.findOne({ slug: cleanSlug, _id: { $ne: article._id } });
        if (duplicate) {
          throw new ApiError(409, `An article with slug "${cleanSlug}" already exists`);
        }
        article.slug = cleanSlug;
      }

      if (title !== undefined) article.title = title;
      if (content !== undefined) article.content = content;
      if (category !== undefined) article.category = category;
      if (tags !== undefined) article.tags = tags;
      if (isPublished !== undefined) article.isPublished = Boolean(isPublished);

      await article.save();
      await article.populate('author', 'name email role');

      logger.info(`[KnowledgeBase] Admin ${req.user.email} updated article "${article.slug}"`);

      return ApiResponse.success(res, article, 'Article updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle article publish status (Admin only)
   * PATCH /api/articles/:id/publish
   */
  async togglePublishStatus(req, res, next) {
    try {
      const { id } = req.params;
      const isObjectId = mongoose.Types.ObjectId.isValid(id);
      const query = isObjectId ? { $or: [{ _id: id }, { slug: id }] } : { slug: id };

      const article = await Article.findOne(query);
      if (!article) {
        throw new ApiError(404, 'Knowledge article not found');
      }

      article.isPublished = !article.isPublished;
      await article.save();

      return ApiResponse.success(
        res,
        {
          _id: article._id,
          slug: article.slug,
          isPublished: article.isPublished,
        },
        `Article ${article.isPublished ? 'published' : 'unpublished'} successfully`
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete article (Admin only)
   * DELETE /api/articles/:id
   */
  async deleteArticle(req, res, next) {
    try {
      const { id } = req.params;
      const isObjectId = mongoose.Types.ObjectId.isValid(id);
      const query = isObjectId ? { $or: [{ _id: id }, { slug: id }] } : { slug: id };

      const article = await Article.findOneAndDelete(query);
      if (!article) {
        throw new ApiError(404, 'Knowledge article not found');
      }

      logger.info(`[KnowledgeBase] Admin ${req.user.email} deleted article "${article.slug}"`);

      return ApiResponse.success(res, { slug: article.slug }, 'Article deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * RAG Lexical Chunk Search
   * POST /api/articles/rag/search
   */
  async searchKnowledgeRag(req, res, next) {
    try {
      const { query, topK = 4, category } = req.body;
      const isAdmin = req.user?.role === 'admin';

      const chunks = await retrieverService.retrieveRelevantChunks(query, {
        topK: parseInt(topK, 10) || 4,
        category,
        includeUnpublished: isAdmin, // Only admins can see chunks from unpublished articles
      });

      return ApiResponse.success(
        res,
        {
          query,
          count: chunks.length,
          chunks,
        },
        'Knowledge chunks retrieved'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * RAG Knowledge Assistant Q&A
   * POST /api/articles/rag/ask
   */
  async askKnowledgeAssistant(req, res, next) {
    try {
      const { query, category } = req.body;
      const isAdmin = req.user?.role === 'admin';

      // 1. Retrieve top chunks using lexical BM25/TF-IDF retriever
      const retrievedChunks = await retrieverService.retrieveRelevantChunks(query, {
        topK: 3,
        category,
        includeUnpublished: isAdmin,
      });

      // 2. Pass query and retrieved chunks to AI service
      const assistantResult = await aiService.answerKnowledgeQuery({
        query,
        retrievedChunks,
      });

      return ApiResponse.success(
        res,
        {
          query,
          ...assistantResult,
          retrievedCount: retrievedChunks.length,
        },
        'Knowledge assistant response generated'
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ArticleController();
