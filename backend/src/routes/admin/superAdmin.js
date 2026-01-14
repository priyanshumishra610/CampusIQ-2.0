/**
 * Super Admin API
 * 
 * Comprehensive Super Admin endpoints providing platform owner controls:
 * - Panel Architecture Control
 * - Feature & Capability Control
 * - Identity & Access Management
 * - Rules & Governance
 * 
 * All actions are:
 * - Impact-analyzed before execution
 * - Audit-logged with enhanced context
 * - Require confirmation for destructive actions
 * - Marked with GOD MODE indicators
 */

const express = require('express');
const pool = require('../../database/connection');
const {authenticateToken} = require('../../middleware/auth');
const {requireSuperAdmin, requireDestructiveConfirmation, auditSuperAdminAction, addGodModeIndicator} = require('../../middleware/superAdmin');
const superAdminContext = require('../../services/superAdminContext');
const {asyncHandler, assert} = require('../../middleware/errorHandler');
const {Errors} = require('../../utils/errors');
const {logAuditEvent, getClientIp} = require('../../services/auditLogger');
const jwt = require('jsonwebtoken');

const router = express.Router();

// All routes require Super Admin access
router.use(authenticateToken);
router.use(requireSuperAdmin);
router.use(addGodModeIndicator);

/**
 * Get impact analysis for a destructive action
 * GET /api/admin/super-admin/impact/:actionType/:entityId
 */
router.get('/impact/:actionType/:entityId', asyncHandler(async (req, res) => {
  const {actionType, entityId} = req.params;
  
  const impact = await superAdminContext.analyzeImpact(actionType, entityId, req);
  
  res.json({
    success: true,
    data: {
      actionType,
      entityId,
      impact: superAdminContext.formatImpactSummary(impact),
    },
    superAdminAction: true,
  });
}));

/**
 * User Impersonation
 * POST /api/admin/super-admin/impersonate
 * 
 * Allows Super Admin to impersonate another user for support/debugging.
 * All actions are logged with impersonation context.
 */
router.post('/impersonate',
  requireDestructiveConfirmation('USER_IMPERSONATE', (req) => req.body.userId),
  asyncHandler(async (req, res) => {
    const {userId, confirmed} = req.body;
    
    assert(userId, Errors.invalidInput('userId is required'));
    assert(confirmed === true, Errors.invalidInput('Confirmation required for impersonation'));
    
    // Verify user exists
    const userResult = await pool.query(
      'SELECT id, email, name, role, admin_role FROM users WHERE id = $1',
      [userId]
    );
    assert(userResult.rows.length > 0, Errors.notFound('User'));
    
    const targetUser = userResult.rows[0];
    
    // Prevent impersonating other Super Admins (safety measure)
    const {isSuperAdmin} = require('../../services/roleService');
    const targetIsSuper = await isSuperAdmin(userId);
    assert(!targetIsSuper, Errors.permissionDenied('Cannot impersonate Super Admin users'));
    
    // Get impact analysis
    const impact = await superAdminContext.analyzeImpact('USER_IMPERSONATE', userId, req);
    
    // Generate impersonation token (marked with impersonation context)
    const impersonationToken = jwt.sign(
      {
        userId: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        impersonatedBy: req.user.id,
        impersonation: true,
      },
      process.env.JWT_SECRET,
      {expiresIn: '1h'} // Short-lived token
    );
    
    // Log Super Admin action
    await superAdminContext.logSuperAdminAction({
      userId: req.user.id,
      action: 'USER_IMPERSONATE',
      entityType: 'user',
      entityId: userId,
      impact,
      details: {
        targetUserId: userId,
        targetUserEmail: targetUser.email,
        targetUserName: targetUser.name,
        confirmed,
      },
      req,
    });
    
    res.json({
      success: true,
      data: {
        token: impersonationToken,
        user: {
          id: targetUser.id,
          email: targetUser.email,
          name: targetUser.name,
          role: targetUser.role,
        },
        impersonatedBy: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
        },
        expiresIn: '1h',
      },
      superAdminAction: true,
      impersonation: true,
    });
  })
);

/**
 * End impersonation
 * POST /api/admin/super-admin/impersonate/end
 */
router.post('/impersonate/end', asyncHandler(async (req, res) => {
  // Log end of impersonation
  await superAdminContext.logSuperAdminAction({
    userId: req.user.id,
    action: 'USER_IMPERSONATION_ENDED',
    entityType: 'session',
    entityId: req.user.id,
    details: {
      sessionEnded: true,
    },
    req,
  });
  
  res.json({
    success: true,
    data: {message: 'Impersonation ended'},
    superAdminAction: true,
  });
}));

/**
 * Get Super Admin audit trail
 * GET /api/admin/super-admin/audit
 */
router.get('/audit', asyncHandler(async (req, res) => {
  const {limit = 100, action, entityType} = req.query;
  
  let query = `
    SELECT * FROM audit_logs 
    WHERE action LIKE 'SUPER_ADMIN_%'
  `;
  const params = [];
  let paramCount = 1;
  
  if (action) {
    query += ` AND action = $${paramCount++}`;
    params.push(action);
  }
  
  if (entityType) {
    query += ` AND entity_type = $${paramCount++}`;
    params.push(entityType);
  }
  
  query += ` ORDER BY created_at DESC LIMIT $${paramCount++}`;
  params.push(limit);
  
  const result = await pool.query(query, params);
  
  res.json({
    success: true,
    data: {
      logs: result.rows.map(row => ({
        id: row.id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        userId: row.user_id,
        details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
        ipAddress: row.ip_address,
        timestamp: row.created_at,
      })),
    },
    superAdminAction: true,
  });
}));

/**
 * Get system health summary (Super Admin view)
 * GET /api/admin/super-admin/health
 */
router.get('/health', asyncHandler(async (req, res) => {
  // Get capability health
  const capabilityRegistry = require('../../services/capabilityRegistry');
  const healthSummary = await capabilityRegistry.getHealthSummary();
  
  // Get panel stats
  const panelStats = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'published') as published,
      COUNT(*) FILTER (WHERE status = 'draft') as draft,
      COUNT(*) FILTER (WHERE is_system_panel = TRUE) as system
    FROM panels
  `);
  
  // Get user stats
  const userStats = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT role) as role_count
    FROM users
  `);
  
  res.json({
    success: true,
    data: {
      capabilities: healthSummary,
      panels: panelStats.rows[0],
      users: userStats.rows[0],
    },
    superAdminAction: true,
  });
}));

module.exports = router;
