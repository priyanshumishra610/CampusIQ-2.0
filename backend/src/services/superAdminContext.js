/**
 * Super Admin Context Service
 * 
 * Manages Super Admin authority model with safe, powerful controls.
 * Super Admin is treated as a PLATFORM OWNER, not a normal user.
 * 
 * Features:
 * - Destructive action tracking
 * - Impact analysis
 * - Confirmation workflows
 * - Enhanced audit logging
 * - GOD MODE indicators
 */

const pool = require('../database/connection');
const {logAuditEvent, getClientIp} = require('./auditLogger');
const {Errors} = require('../utils/errors');

/**
 * Destructive action types that require explicit confirmation
 */
const DESTRUCTIVE_ACTIONS = {
  PANEL_DELETE: {
    action: 'PANEL_DELETE',
    severity: 'high',
    reversible: false,
    impactCheck: async (entityId, req) => {
      // Check how many users are assigned to this panel
      const result = await pool.query(
        'SELECT COUNT(*) as count FROM user_panels WHERE panel_id = $1',
        [entityId]
      );
      const userCount = parseInt(result.rows[0].count);
      
      return {
        affectedUsers: userCount,
        message: userCount > 0 
          ? `This panel is assigned to ${userCount} user(s). They will lose access if deleted.`
          : 'No users are assigned to this panel.',
        requiresConfirmation: userCount > 0,
      };
    },
  },
  
  ROLE_DELETE: {
    action: 'ROLE_DELETE',
    severity: 'high',
    reversible: false,
    impactCheck: async (entityId, req) => {
      // Check how many users have this role
      const result = await pool.query(
        'SELECT COUNT(*) as count FROM user_roles WHERE role_id = $1',
        [entityId]
      );
      const userCount = parseInt(result.rows[0].count);
      
      return {
        affectedUsers: userCount,
        message: userCount > 0
          ? `This role is assigned to ${userCount} user(s). They will lose permissions if deleted.`
          : 'No users have this role.',
        requiresConfirmation: userCount > 0,
      };
    },
  },
  
  USER_DELETE: {
    action: 'USER_DELETE',
    severity: 'critical',
    reversible: false,
    impactCheck: async (entityId, req) => {
      // Check user's roles, panels, and dependencies
      const [rolesResult, panelsResult] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM user_roles WHERE user_id = $1', [entityId]),
        pool.query('SELECT COUNT(*) as count FROM user_panels WHERE user_id = $1', [entityId]),
      ]);
      
      return {
        affectedUsers: 1,
        message: 'Deleting this user will remove all their data and access. This cannot be undone.',
        requiresConfirmation: true,
      };
    },
  },
  
  CAPABILITY_DISABLE: {
    action: 'CAPABILITY_DISABLE',
    severity: 'high',
    reversible: true,
    impactCheck: async (capabilityId, req) => {
      // Check which routes/features depend on this capability
      return {
        affectedUsers: 'all',
        message: `Disabling this capability will affect all users. Related features will be unavailable.`,
        requiresConfirmation: true,
      };
    },
  },
  
  SYSTEM_CONFIG_CHANGE: {
    action: 'SYSTEM_CONFIG_CHANGE',
    severity: 'high',
    reversible: true,
    impactCheck: async (configKey, req) => {
      return {
        affectedUsers: 'all',
        message: `Changing this system configuration will affect the entire platform.`,
        requiresConfirmation: true,
      };
    },
  },
  
  USER_IMPERSONATE: {
    action: 'USER_IMPERSONATE',
    severity: 'medium',
    reversible: true,
    impactCheck: async (userId, req) => {
      const userResult = await pool.query('SELECT name, email, role FROM users WHERE id = $1', [userId]);
      const user = userResult.rows[0];
      
      return {
        affectedUsers: 1,
        message: `You will be impersonating ${user?.name || user?.email || userId}. All actions will be logged.`,
        requiresConfirmation: true,
      };
    },
  },
};

/**
 * Analyze impact of a destructive action
 * @param {string} actionType - Type of destructive action
 * @param {string} entityId - Entity ID
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Impact analysis
 */
const analyzeImpact = async (actionType, entityId, req) => {
  const actionConfig = DESTRUCTIVE_ACTIONS[actionType];
  
  if (!actionConfig) {
    return {
      severity: 'medium',
      reversible: false,
      requiresConfirmation: false,
      message: 'Action impact unknown.',
    };
  }
  
  const impact = await actionConfig.impactCheck(entityId, req);
  
  return {
    actionType,
    severity: actionConfig.severity,
    reversible: actionConfig.reversible,
    ...impact,
  };
};

/**
 * Log Super Admin action with enhanced context
 * @param {Object} options
 * @param {string} options.userId - Super Admin user ID
 * @param {string} options.action - Action name
 * @param {string} options.entityType - Entity type
 * @param {string} options.entityId - Entity ID
 * @param {Object} options.impact - Impact analysis
 * @param {Object} options.details - Additional details
 * @param {Object} options.req - Express request object
 */
const logSuperAdminAction = async ({
  userId,
  action,
  entityType,
  entityId,
  impact,
  details = {},
  req,
}) => {
  const auditDetails = {
    ...details,
    superAdminAction: true,
    impact: impact || {},
    ipAddress: getClientIp(req),
    timestamp: new Date().toISOString(),
  };
  
  await logAuditEvent({
    userId,
    action: `SUPER_ADMIN_${action}`,
    entityType,
    entityId,
    details: auditDetails,
    ipAddress: getClientIp(req),
    role: 'SUPER_ADMIN',
  });
};

/**
 * Require confirmation for destructive actions
 * @param {string} actionType - Type of action
 * @param {string} entityId - Entity ID
 * @param {Object} req - Express request object
 * @param {boolean} confirmed - Whether action is confirmed
 * @returns {Promise<Object>} Impact analysis
 * @throws {AppError} If confirmation required but not provided
 */
const requireConfirmation = async (actionType, entityId, req, confirmed = false) => {
  const impact = await analyzeImpact(actionType, entityId, req);
  
  if (impact.requiresConfirmation && !confirmed) {
    throw Errors.invalidInput(
      'Confirmation required for this action',
      {
        actionType,
        impact,
        requiresConfirmation: true,
      }
    );
  }
  
  return impact;
};

/**
 * Check if action requires confirmation
 * @param {string} actionType - Type of action
 * @param {string} entityId - Entity ID
 * @param {Object} req - Express request object
 * @returns {Promise<boolean>}
 */
const requiresConfirmation = async (actionType, entityId, req) => {
  const impact = await analyzeImpact(actionType, entityId, req);
  return impact.requiresConfirmation || false;
};

/**
 * Create impact summary for UI display
 * @param {Object} impact - Impact analysis
 * @returns {Object} Formatted impact summary
 */
const formatImpactSummary = (impact) => {
  return {
    severity: impact.severity,
    reversible: impact.reversible,
    affectedUsers: impact.affectedUsers,
    message: impact.message,
    warnings: impact.warnings || [],
    recommendations: impact.recommendations || [],
  };
};

/**
 * Validate Super Admin action safety
 * @param {string} actionType - Type of action
 * @param {Object} req - Express request object
 * @param {Object} options - Action options
 * @returns {Promise<Object>} Validation result
 */
const validateAction = async (actionType, req, options = {}) => {
  const {entityId, confirmed = false, skipImpactCheck = false} = options;
  
  if (!req.user || !req.user.isSuperAdmin) {
    throw Errors.permissionDenied('Super Admin access required');
  }
  
  let impact = null;
  
  if (!skipImpactCheck && entityId) {
    impact = await analyzeImpact(actionType, entityId, req);
    
    if (impact.requiresConfirmation && !confirmed) {
      return {
        valid: false,
        requiresConfirmation: true,
        impact: formatImpactSummary(impact),
      };
    }
  }
  
  return {
    valid: true,
    impact: impact ? formatImpactSummary(impact) : null,
  };
};

module.exports = {
  DESTRUCTIVE_ACTIONS,
  analyzeImpact,
  logSuperAdminAction,
  requireConfirmation,
  requiresConfirmation,
  formatImpactSummary,
  validateAction,
};
