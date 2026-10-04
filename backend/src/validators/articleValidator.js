const ApiResponse = require('../utils/apiResponse');

const ALLOWED_CATEGORIES = ['general', 'account', 'billing', 'technical', 'troubleshooting', 'security'];
const slugRegex = /^[a-z0-9-]+$/;

/**
 * Validate Article Creation
 */
const validateCreateArticle = (req, res, next) => {
  const { title, content, slug, category, tags, isPublished } = req.body;
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    errors.push('Article title is required and must be at least 3 characters');
  } else if (title.trim().length > 200) {
    errors.push('Article title cannot exceed 200 characters');
  }

  if (!content || typeof content !== 'string' || content.trim().length < 10) {
    errors.push('Article content is required and must be at least 10 characters');
  } else if (content.length > 30000) {
    errors.push('Article content cannot exceed 30,000 characters');
  }

  if (slug !== undefined && slug !== null && slug !== '') {
    if (typeof slug !== 'string' || slug.trim().length < 3 || slug.trim().length > 200) {
      errors.push('Slug must be between 3 and 200 characters');
    } else if (!slugRegex.test(slug.trim())) {
      errors.push('Slug may only contain lowercase alphanumeric characters and hyphens');
    }
  }

  if (category !== undefined && !ALLOWED_CATEGORIES.includes(category)) {
    errors.push(`Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`);
  }

  if (tags !== undefined && !Array.isArray(tags)) {
    errors.push('Tags must be an array of strings');
  }

  if (isPublished !== undefined && typeof isPublished !== 'boolean') {
    errors.push('isPublished must be a boolean');
  }

  if (errors.length > 0) {
    return ApiResponse.error(res, 'Validation Error', 400, errors, 'VALIDATION_ERROR');
  }

  req.body.title = title.trim();
  req.body.content = content.trim();
  if (slug) req.body.slug = slug.trim().toLowerCase();
  next();
};

/**
 * Validate Article Update
 */
const validateUpdateArticle = (req, res, next) => {
  const { title, content, slug, category, tags, isPublished } = req.body;
  const errors = [];

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length < 3) {
      errors.push('Article title must be at least 3 characters');
    } else if (title.trim().length > 200) {
      errors.push('Article title cannot exceed 200 characters');
    }
  }

  if (content !== undefined) {
    if (typeof content !== 'string' || content.trim().length < 10) {
      errors.push('Article content must be at least 10 characters');
    } else if (content.length > 30000) {
      errors.push('Article content cannot exceed 30,000 characters');
    }
  }

  if (slug !== undefined) {
    if (typeof slug !== 'string' || slug.trim().length < 3 || slug.trim().length > 200) {
      errors.push('Slug must be between 3 and 200 characters');
    } else if (!slugRegex.test(slug.trim())) {
      errors.push('Slug may only contain lowercase alphanumeric characters and hyphens');
    }
  }

  if (category !== undefined && !ALLOWED_CATEGORIES.includes(category)) {
    errors.push(`Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`);
  }

  if (tags !== undefined && !Array.isArray(tags)) {
    errors.push('Tags must be an array of strings');
  }

  if (isPublished !== undefined && typeof isPublished !== 'boolean') {
    errors.push('isPublished must be a boolean');
  }

  if (errors.length > 0) {
    return ApiResponse.error(res, 'Validation Error', 400, errors, 'VALIDATION_ERROR');
  }

  if (title) req.body.title = title.trim();
  if (content) req.body.content = content.trim();
  if (slug) req.body.slug = slug.trim().toLowerCase();
  next();
};

/**
 * Validate RAG Search
 */
const validateRagSearch = (req, res, next) => {
  const { query, topK, category } = req.body;
  const errors = [];

  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    errors.push('Search query is required and must be at least 2 characters');
  } else if (query.trim().length > 200) {
    errors.push('Search query cannot exceed 200 characters');
  }

  if (topK !== undefined) {
    const num = parseInt(topK, 10);
    if (isNaN(num) || num < 1 || num > 10) {
      errors.push('topK must be an integer between 1 and 10');
    }
  }

  if (category !== undefined && !ALLOWED_CATEGORIES.includes(category)) {
    errors.push(`Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`);
  }

  if (errors.length > 0) {
    return ApiResponse.error(res, 'Validation Error', 400, errors, 'VALIDATION_ERROR');
  }

  req.body.query = query.trim();
  next();
};

/**
 * Validate RAG Ask
 */
const validateRagAsk = (req, res, next) => {
  const { query, category } = req.body;
  const errors = [];

  if (!query || typeof query !== 'string' || query.trim().length < 3) {
    errors.push('Question query is required and must be at least 3 characters');
  } else if (query.trim().length > 500) {
    errors.push('Question query cannot exceed 500 characters');
  }

  if (category !== undefined && !ALLOWED_CATEGORIES.includes(category)) {
    errors.push(`Category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`);
  }

  if (errors.length > 0) {
    return ApiResponse.error(res, 'Validation Error', 400, errors, 'VALIDATION_ERROR');
  }

  req.body.query = query.trim();
  next();
};

module.exports = {
  validateCreateArticle,
  validateUpdateArticle,
  validateRagSearch,
  validateRagAsk,
};
