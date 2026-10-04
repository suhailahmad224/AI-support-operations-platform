const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: [true, 'Ticket reference is required'],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender reference is required'],
    },
    senderRole: {
      type: String,
      enum: ['customer', 'agent', 'admin'],
      required: true,
    },
    message: {
      type: String,
      required: [true, 'Message content cannot be empty'],
      trim: true,
      minlength: [1, 'Message must be at least 1 character'],
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    isInternal: {
      type: Boolean,
      default: false,
      index: true,
    },
    attachments: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient chronological message retrieval
messageSchema.index({ ticket: 1, createdAt: 1 });
messageSchema.index({ ticket: 1, isInternal: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
