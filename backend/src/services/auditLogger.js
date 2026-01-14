/**
 * Centralized Audit Logging Service
 * Persists all critical actions to audit_logs table
 */

const pool = require('../database/connection');

/**
 * Log an audit event
 * @param {Object} options
 * @param {string} options.userId - User ID performing the action
 * @param {string} options.action - Action name (e.g., 'LEAVE_APPROVED', 'PAYROLL_GENERATED')
 * @param {string} options.entityType - Entity type (e.g., 'leave_request', 'payroll_record')
 * @param {string} options.entityId - Entity ID
 * @param {Object} options.details - Additional details (JSONB)
 * @param {string} options.ipAddress - IP address of the request
 * @param {string} options.oldValue - Previous value (for updates)
 * @param {string} options.newValue - New value (for updates)
 * @param {string} options.role - User role at time of action
 */
const logAuditEvent = async ({
  userId,
  action,
  entityType,
  entityId,
  details = {},
  ipAddress = null,
  oldValue = null,
  newValue = null,
  role = null,
}) => {
  try {
    // Build details object
    const auditDetails = {
      ...details,
      ...(oldValue && {oldValue}),
      ...(newValue && {newValue}),
      ...(role && {userRole: role}),
    };

    await pool.query(
      `INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id, details, ip_address, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [
        userId,
        action,
        entityType,
        entityId,
        JSON.stringify(auditDetails),
        ipAddress,
      ]
    );
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main flow
    console.error('[AuditLogger] Failed to log audit event:', error);
    console.error('[AuditLogger] Event details:', {
      userId,
      action,
      entityType,
      entityId,
    });
  }
};

/**
 * Express middleware to automatically log requests
 * Use this for routes that need automatic audit logging
 */
const auditMiddleware = (action, entityType) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json to log after response
    res.json = function(data) {
      // Log the action
      logAuditEvent({
        userId: req.user?.id,
        action,
        entityType,
        entityId: req.params?.id || req.body?.id || null,
        details: {
          method: req.method,
          path: req.path,
          ...(req.body && Object.keys(req.body).length > 0 && {requestBody: req.body}),
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        role: req.user?.role,
      }).catch(err => {
        console.error('[AuditMiddleware] Error logging:', err);
      });
      
      return originalJson(data);
    };
    
    next();
  };
};

/**
 * Helper to get IP address from request
 */
const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    null
  );
};

module.exports = {
  logAuditEvent,
  auditMiddleware,
  getClientIp,
};
