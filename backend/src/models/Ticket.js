const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Ticket title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Ticket description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer reference is required'],
    },
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    category: {
      type: String,
      enum: {
        values: ['billing', 'technical', 'account', 'feature_request', 'general'],
        message: 'Invalid ticket category',
      },
      default: 'general',
    },
    priority: {
      type: String,
      enum: {
        values: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
        message: 'Invalid ticket priority',
      },
      default: 'MEDIUM',
    },
    status: {
      type: String,
      enum: {
        values: [
          'OPEN',
          'ASSIGNED',
          'IN_PROGRESS',
          'WAITING_FOR_CUSTOMER',
          'RESOLVED',
          'CLOSED',
        ],
        message: 'Invalid ticket status',
      },
      default: 'OPEN',
    },
    sentiment: {
      type: String,
      enum: ['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'FRUSTRATED'],
      default: 'NEUTRAL',
    },
    intent: {
      type: String,
      default: 'GENERAL_SUPPORT',
    },
    aiSummary: {
      type: String,
      default: '',
    },
    aiSuggestedResponse: {
      type: String,
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    attachments: {
      type: [String],
      default: [],
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    firstResponseAt: {
      type: Date,
      default: null,
    },
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      comment: {
        type: String,
        maxlength: [1000, 'Comment cannot exceed 1000 characters'],
        trim: true,
        default: '',
      },
      submittedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: Generate human-friendly unique ticket ID (TCK-XXXXX) if not set
ticketSchema.pre('save', async function (next) {
  if (!this.ticketId) {
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    this.ticketId = `TCK-${randomSuffix}`;
  }

  // Update lifecycle timestamps
  if (this.isModified('status')) {
    if (this.status === 'RESOLVED' && !this.resolvedAt) {
      this.resolvedAt = new Date();
    }
    if (this.status === 'CLOSED' && !this.closedAt) {
      this.closedAt = new Date();
    }
    if (['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(this.status)) {
      this.resolvedAt = null;
      this.closedAt = null;
    }
  }

  next();
});

// Indexes for query performance
ticketSchema.index({ ticketId: 1 }, { unique: true });
ticketSchema.index({ customer: 1, status: 1 });
ticketSchema.index({ assignedAgent: 1, status: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ category: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ 'feedback.rating': 1 });
ticketSchema.index({ firstResponseAt: 1 });
ticketSchema.index({ title: 'text', description: 'text', ticketId: 'text' });

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
