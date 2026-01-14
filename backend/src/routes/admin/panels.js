/**
 * Panel Management API
 * 
 * Super Admin only endpoints for managing panels.
 * Panels define workspace configurations (theme, navigation, capabilities, permissions).
 * Uses Super Admin authority model with impact analysis and enhanced audit logging.
 */

const express = require('express');
const pool = require('../../database/connection');
const {authenticateToken} = require('../../middleware/auth');
const {requireSuperAdmin, requireDestructiveConfirmation, auditSuperAdminAction} = require('../../middleware/superAdmin');
const superAdminContext = require('../../services/superAdminContext');
const {asyncHandler, assert} = require('../../middleware/errorHandler');
const {Errors} = require('../../utils/errors');
const panelService = require('../../services/panelService');

const router = express.Router();

// All routes require Super Admin access with enhanced audit logging
router.use(authenticateToken);
router.use(requireSuperAdmin);

/**
 * Get all panels
 * GET /api/admin/panels
 */
router.get('/', asyncHandler(async (req, res) => {
  const {includeArchived, includeDraft} = req.query;
  
  const panels = await panelService.getAllPanels({
    includeArchived: includeArchived === 'true',
    includeDraft: includeDraft !== 'false',
  });
  
  // Get user counts for each panel
  const panelsWithStats = await Promise.all(
    panels.map(async (panel) => {
      const userCount = await pool.query(
        'SELECT COUNT(*) as count FROM user_panels WHERE panel_id = $1',
        [panel.id]
      );
      
      return {
        id: panel.id,
        name: panel.name,
        description: panel.description,
        themeConfig: panel.theme_config,
        navigationConfig: panel.navigation_config,
        capabilityOverrides: panel.capability_overrides,
        permissionSet: panel.permission_set,
        isSystemPanel: panel.is_system_panel,
        status: panel.status,
        userCount: parseInt(userCount.rows[0].count),
        createdAt: panel.created_at,
        updatedAt: panel.updated_at,
      };
    })
  );
  
  res.json({
    success: true,
    data: {panels: panelsWithStats},
  });
}));

/**
 * Get single panel
 * GET /api/admin/panels/:id
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const panel = await panelService.getPanel(req.params.id);
  assert(panel, Errors.notFound('Panel'));
  
  // Get capabilities
  const capabilities = await panelService.getPanelCapabilities(req.params.id);
  
  res.json({
    success: true,
    data: {
      ...panel,
      themeConfig: panel.theme_config,
      navigationConfig: panel.navigation_config,
      capabilityOverrides: panel.capability_overrides,
      capabilities,
    },
  });
}));

/**
 * Create new panel
 * POST /api/admin/panels
 */
router.post('/', asyncHandler(async (req, res) => {
  const {
    name,
    description,
    themeConfig,
    navigationConfig,
    capabilityOverrides,
    permissionSet,
  } = req.body;
  
  assert(name, Errors.invalidInput('name is required'));
  assert(name.length > 0, Errors.invalidInput('name cannot be empty'));
  
  const panel = await panelService.createPanel({
    name,
    description,
    themeConfig,
    navigationConfig,
    capabilityOverrides,
    permissionSet: permissionSet || [],
    createdBy: req.user.id,
  });
  
  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'PANEL_CREATED',
    entityType: 'panel',
    entityId: panel.id,
    details: {
      name,
      description,
    },
    ipAddress: getClientIp(req),
    role: req.user.role,
  });
  
  res.status(201).json({
    success: true,
    data: {
      id: panel.id,
      name: panel.name,
      description: panel.description,
      status: panel.status,
      themeConfig: panel.theme_config,
      navigationConfig: panel.navigation_config,
    },
  });
}));

/**
 * Update panel
 * PUT /api/admin/panels/:id
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const panel = await panelService.getPanel(req.params.id);
  assert(panel, Errors.notFound('Panel'));
  
  // System panels have limited updates
  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.themeConfig !== undefined) updates.theme_config = req.body.themeConfig;
  if (req.body.navigationConfig !== undefined) updates.navigation_config = req.body.navigationConfig;
  if (req.body.capabilityOverrides !== undefined) updates.capability_overrides = req.body.capabilityOverrides;
  if (req.body.permissionSet !== undefined) updates.permission_set = req.body.permissionSet;
  if (req.body.status !== undefined && !panel.is_system_panel) {
    updates.status = req.body.status;
  }
  
  const updated = await panelService.updatePanel(req.params.id, updates);
  
  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'PANEL_UPDATED',
    entityType: 'panel',
    entityId: req.params.id,
    details: {
      changes: Object.keys(updates),
    },
    ipAddress: getClientIp(req),
    role: req.user.role,
  });
  
  res.json({
    success: true,
    data: {
      id: updated.id,
      name: updated.name,
      status: updated.status,
    },
  });
}));

/**
 * Clone panel
 * POST /api/admin/panels/:id/clone
 */
router.post('/:id/clone', asyncHandler(async (req, res) => {
  const {name} = req.body;
  assert(name, Errors.invalidInput('name is required'));
  
  const cloned = await panelService.clonePanel(req.params.id, name, req.user.id);
  
  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'PANEL_CLONED',
    entityType: 'panel',
    entityId: cloned.id,
    details: {
      originalPanelId: req.params.id,
      newName: name,
    },
    ipAddress: getClientIp(req),
    role: req.user.role,
  });
  
  res.status(201).json({
    success: true,
    data: {
      id: cloned.id,
      name: cloned.name,
    },
  });
}));

/**
 * Get impact analysis for panel deletion
 * GET /api/admin/panels/:id/impact
 */
router.get('/:id/impact', asyncHandler(async (req, res) => {
  const panelId = req.params.id;
  const impact = await superAdminContext.analyzeImpact('PANEL_DELETE', panelId, req);
  
  res.json({
    success: true,
    data: {
      actionType: 'PANEL_DELETE',
      entityId: panelId,
      impact: superAdminContext.formatImpactSummary(impact),
    },
    superAdminAction: true,
  });
}));

/**
 * Delete panel (with impact analysis and confirmation)
 * DELETE /api/admin/panels/:id?confirmed=true
 */
router.delete('/:id', 
  requireDestructiveConfirmation('PANEL_DELETE', (req) => req.params.id),
  asyncHandler(async (req, res) => {
    const panelId = req.params.id;
    
    // Get impact (already checked in middleware)
    const impact = req.actionImpact || await superAdminContext.analyzeImpact('PANEL_DELETE', panelId, req);
    
    // Delete panel
    await panelService.deletePanel(panelId);
    
    // Log Super Admin action with impact (middleware will also log)
    await superAdminContext.logSuperAdminAction({
      userId: req.user.id,
      action: 'PANEL_DELETE',
      entityType: 'panel',
      entityId: panelId,
      impact,
      details: {
        affectedUsers: impact.affectedUsers,
      },
      req,
    });
    
    res.json({
      success: true,
      data: {
        message: 'Panel deleted successfully',
        impact: superAdminContext.formatImpactSummary(impact),
      },
      superAdminAction: true,
    });
  })
);

/**
 * Assign panel to user
 * POST /api/admin/panels/:id/assign-user
 */
router.post('/:id/assign-user', asyncHandler(async (req, res) => {
  const {userId, isDefault} = req.body;
  
  assert(userId, Errors.invalidInput('userId is required'));
  
  // Verify user exists
  const userResult = await pool.query('SELECT id, email FROM users WHERE id = $1', [userId]);
  assert(userResult.rows.length > 0, Errors.notFound('User'));
  
  await panelService.assignPanelToUser(userId, req.params.id, req.user.id, isDefault === true);
  
  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'PANEL_ASSIGNED',
    entityType: 'user_panel',
    entityId: `${userId}:${req.params.id}`,
    details: {
      userId,
      panelId: req.params.id,
      isDefault,
    },
    ipAddress: getClientIp(req),
    role: req.user.role,
  });
  
  res.json({
    success: true,
    data: {message: 'Panel assigned successfully'},
  });
}));

/**
 * Remove panel from user
 * DELETE /api/admin/panels/:id/assign-user/:userId
 */
router.delete('/:id/assign-user/:userId', asyncHandler(async (req, res) => {
  await panelService.removePanelFromUser(req.params.userId, req.params.id);
  
  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'PANEL_REMOVED',
    entityType: 'user_panel',
    entityId: `${req.params.userId}:${req.params.id}`,
    details: {
      userId: req.params.userId,
      panelId: req.params.id,
    },
    ipAddress: getClientIp(req),
    role: req.user.role,
  });
  
  res.json({
    success: true,
    data: {message: 'Panel removed successfully'},
  });
}));

/**
 * Publish panel (change status from draft to published)
 * POST /api/admin/panels/:id/publish
 */
router.post('/:id/publish', asyncHandler(async (req, res) => {
  const panel = await panelService.getPanel(req.params.id);
  assert(panel, Errors.notFound('Panel'));
  
  const updated = await panelService.updatePanel(req.params.id, {status: 'published'});
  
  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'PANEL_PUBLISHED',
    entityType: 'panel',
    entityId: req.params.id,
    details: {
      name: panel.name,
    },
    ipAddress: getClientIp(req),
    role: req.user.role,
  });
  
  res.json({
    success: true,
    data: {
      id: updated.id,
      status: updated.status,
    },
  });
}));

module.exports = router;
