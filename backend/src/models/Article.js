const mongoose = require('mongoose');
const { chunkText } = require('../services/rag/chunker');

const chunkSubSchema = new mongoose.Schema(
  {
    chunkIndex: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    charCount: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Article title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Article slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Article content is required'],
      minlength: [10, 'Content must be at least 10 characters'],
      maxlength: [30000, 'Content cannot exceed 30000 characters'],
    },
    category: {
      type: String,
      enum: {
        values: ['general', 'account', 'billing', 'technical', 'troubleshooting', 'security'],
        message: 'Invalid knowledge base category',
      },
      default: 'general',
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      set: (tags) => (Array.isArray(tags) ? tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean) : []),
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Article author is required'],
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    chunks: {
      type: [chunkSubSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-chunk content before save if content was modified
articleSchema.pre('save', function (next) {
  if (this.isModified('content') || !this.chunks || this.chunks.length === 0) {
    this.chunks = chunkText(this.content, { chunkSize: 450, overlap: 60 });
  }

  // Auto-slugify if slug is empty
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  next();
});

// Full-text search index for fast keyword matching
articleSchema.index(
  {
    title: 'text',
    content: 'text',
    tags: 'text',
  },
  {
    weights: {
      title: 10,
      tags: 5,
      content: 1,
    },
    name: 'ArticleTextIndex',
  }
);

const Article = mongoose.model('Article', articleSchema);

module.exports = Article;
