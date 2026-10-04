const Notification = require('../models/Notification');
const User = require('../models/User');
const emailService = require('./emailService');
const logger = require('../utils/logger');

/**
 * Notification Dispatcher Service
 * Creates in-app alerts and dispatches emails with duplicate prevention & privacy guards.
 */
class NotificationService {
  /**
   * Create notification and trigger email
   * @param {Object} params
   * @param {string|ObjectId} params.recipientId - Recipient user ID
   * @param {string|ObjectId} [params.senderId] - Triggering user ID
   * @param {string|ObjectId} [params.ticketIdRef] - Ticket document ObjectId
   * @param {string} [params.ticketId] - Ticket human ID (e.g. TCK-1001)
   * @param {string} params.type - TICKET_ASSIGNED | NEW_MESSAGE | STATUS_CHANGED | TICKET_CREATED
   * @param {string} params.title - Notification title
   * @param {string} params.content - Safe notification preview text
   * @param {boolean} [params.sendEmailAlert=true] - Whether to trigger email
   */
  async notify({
    recipientId,
    senderId = null,
    ticketIdRef = null,
    ticketId = '',
    type,
    title,
    content,
    sendEmailAlert = true,
  }) {
    try {
      if (!recipientId) return null;

      // Prevent sending notification to self (e.g. if recipient is the sender)
      if (senderId && senderId.toString() === recipientId.toString()) {
        return null;
      }

      // Duplicate prevention: Check if an identical unread notification exists within the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const existingUnread = await Notification.findOne({
        recipient: recipientId,
        ticket: ticketIdRef,
        type,
        isRead: false,
        createdAt: { $gte: fiveMinutesAgo },
      });

      if (existingUnread) {
        // Update content/timestamp rather than creating duplicate spam
        existingUnread.content = content;
        existingUnread.title = title;
        await existingUnread.save();
        return existingUnread;
      }

      // Create in-app notification
      const notification = await Notification.create({
        recipient: recipientId,
        sender: senderId,
        ticket: ticketIdRef,
        ticketId,
        type,
        title,
        content,
        isRead: false,
      });

      // Dispatch email notification asynchronously
      if (sendEmailAlert) {
        this.dispatchEmail({
          recipientId,
          type,
          title,
          content,
          ticketId,
        }).catch((err) => {
          logger.warn(`[NotificationService] Email dispatch caught error: ${err.message}`);
        });
      }

      return notification;
    } catch (error) {
      logger.error(`[NotificationService] Failed to create notification: ${error.message}`);
      return null;
    }
  }

  /**
   * Helper to dispatch email to recipient
   */
  async dispatchEmail({ recipientId, type, title, content, ticketId }) {
    try {
      const recipient = await User.findById(recipientId).select('name email isEmailNotificationsEnabled');
      if (!recipient || !recipient.email) return;

      const subject = ticketId ? `[AI Support] [${ticketId}] ${title}` : `[AI Support] ${title}`;
      const text = `Hello ${recipient.name},\n\n${content}\n\nYou can view your ticket and respond in the platform portal.\n\nBest regards,\nSupport Operations Team`;

      await emailService.sendEmail({
        to: recipient.email,
        subject,
        text,
      });
    } catch (err) {
      logger.warn(`[NotificationService] Email helper failed: ${err.message}`);
    }
  }
}

module.exports = new NotificationService();
