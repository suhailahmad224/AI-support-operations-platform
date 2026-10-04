const AuditLog = require('../models/AuditLog');
const logger = require('./logger');
const { redactSensitiveData } = require('./sanitize');

/**
 * Asynchronously record an immutable audit event
 */
const recordAuditLog = async ({
  actor,
  action,
  entityType = 'Ticket',
  entityId,
  details = {},
  req = null,
}) => {
  try {
    const ipAddress = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || '';
    const userAgent = req?.headers['user-agent'] || '';

    // Sanitize any sensitive details before storing in database
    const sanitizedDetails = redactSensitiveData(details);

    await AuditLog.create({
      actor: actor._id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action,
      entityType,
      entityId: String(entityId),
      ipAddress: String(ipAddress),
      userAgent: String(userAgent),
      details: sanitizedDetails,
    });
  } catch (err) {
    // Audit logging failure should not crash the main business request
    logger.warn('Failed to record audit log:', err.message);
  }
};

module.exports = { recordAuditLog };
