/**
 * Super Admin Middleware
 * 
 * Provides enhanced middleware for Super Admin routes with:
 * - Impact analysis
 * - Confirmation requirements
 * - Enhanced audit logging
 * - GOD MODE indicators
 */

const {isSuperAdmin} = require('../services/roleService');
const superAdminContext = require('../services/superAdminContext');
const {Errors} = require('../utils/errors');
const {asyncHandler} = require('./errorHandler');

/**
 * Require Super Admin access
 * Middleware that ensures only Super Admins can access the route
 */
const requireSuperAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json(Errors.authRequired().toResponse());
  }
  
  const isSuper = await isSuperAdmin(req.user.id);
  
  if (!isSuper) {
    return res.status(403).json(
      Errors.permissionDenied('Super Admin access required').toResponse()
    );
  }
  
  // Add Super Admin indicator to request
  req.isSuperAdmin = true;
  req.superAdminUserId = req.user.id;
  
  next();
});

/**
 * Require confirmation for destructive actions
 * @param {string} actionType - Type of destructive action
 * @param {Function} entityIdExtractor - Function to extract entity ID from request
 */
const requireDestructiveConfirmation = (actionType, entityIdExtractor = (req) => req.params.id) => {
  return asyncHandler(async (req, res, next) => {
    const entityId = entityIdExtractor(req);
    const confirmed = req.body.confirmed === true || req.query.confirmed === 'true';
    
    const validation = await superAdminContext.validateAction(
      actionType,
      req,
      {entityId, confirmed}
    );
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CONFIRMATION_REQUIRED',
          message: 'Confirmation required for this destructive action',
          impact: validation.impact,
        },
      });
    }
    
    // Store impact in request for logging
    req.actionImpact = validation.impact;
    req.actionType = actionType;
    req.entityId = entityId;
    
    next();
  });
};

/**
 * Enhanced audit logging for Super Admin actions
 * Automatically logs all Super Admin actions with impact context
 */
const auditSuperAdminAction = (actionName) => {
  return asyncHandler(async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json to log after response
    res.json = function(data) {
      // Only log if request was successful
      if (data.success !== false) {
        superAdminContext.logSuperAdminAction({
          userId: req.user.id,
          action: actionName,
          entityType: req.actionType || req.route?.path,
          entityId: req.entityId || req.params?.id,
          impact: req.actionImpact,
          details: {
            method: req.method,
            path: req.path,
            ...(req.body && Object.keys(req.body).length > 0 && {requestBody: req.body}),
          },
          req,
        }).catch(err => {
          console.error('[SuperAdminAudit] Error logging:', err);
        });
      }
      
      return originalJson(data);
    };
    
    next();
  });
};

/**
 * Add GOD MODE indicator to response
 * Makes it clear this is a Super Admin action
 */
const addGodModeIndicator = (req, res, next) => {
  // Add header to indicate Super Admin action
  res.setHeader('X-Super-Admin-Action', 'true');
  
  // If response is JSON, add indicator
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    if (data && typeof data === 'object') {
      data.superAdminAction = true;
      data.timestamp = new Date().toISOString();
    }
    return originalJson(data);
  };
  
  next();
};

/**
 * Combined middleware: Require Super Admin + Enhanced Audit + GOD MODE indicator
 */
const superAdminRoute = (actionName, requireConfirmation = null) => {
  const middlewares = [
    requireSuperAdmin,
    addGodModeIndicator,
  ];
  
  // Add confirmation requirement if specified
  if (requireConfirmation) {
    middlewares.push(requireDestructiveConfirmation(requireConfirmation));
  }
  
  // Add audit logging
  middlewares.push(auditSuperAdminAction(actionName));
  
  return middlewares;
};

module.exports = {
  requireSuperAdmin,
  requireDestructiveConfirmation,
  auditSuperAdminAction,
  addGodModeIndicator,
  superAdminRoute,
};
