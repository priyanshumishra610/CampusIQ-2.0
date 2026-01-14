/**
 * Admin Capabilities API
 * 
 * Provides admin-only access to system capability registry.
 * Enables visibility into system health and feature status.
 */

const express = require('express');
const pool = require('../../database/connection');
const {authenticateToken, authorizeRoles} = require('../../middleware/auth');
const {validate} = require('../../middleware/validation');
const {asyncHandler, assert} = require('../../middleware/errorHandler');
const {Errors} = require('../../utils/errors');
const {logAuditEvent, getClientIp} = require('../../services/auditLogger');
const {
  getAllCapabilities,
  getCapability,
  getCapabilityWithErrors,
  updateCapabilityStatus,
  getHealthSummary,
  CAPABILITY_STATUS,
} = require('../../services/capabilityRegistry');
const {z} = require('zod');

const router = express.Router();

// All routes require ADMIN role
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN'));

/**
 * Get all capabilities
 * GET /api/admin/capabilities
 */
router.get('/', asyncHandler(async (req, res) => {
  const capabilities = await getAllCapabilities();
  const summary = await getHealthSummary();
  
  res.json({
    success: true,
    data: {
      capabilities: capabilities.map(cap => ({
        id: cap.id,
        capabilityId: cap.capability_id,
        name: cap.name,
        status: cap.status,
        reason: cap.reason,
        ownerModule: cap.owner_module,
        lastChecked: cap.last_checked,
        lastError: cap.last_error,
        metadata: typeof cap.metadata === 'string' ? JSON.parse(cap.metadata) : cap.metadata,
        createdAt: cap.created_at,
        updatedAt: cap.updated_at,
      })),
      summary,
    },
  });
}));

/**
 * Get capability by ID
 * GET /api/admin/capabilities/:id
 */
router.get('/:id', validate({
  params: z.object({
    id: z.string().min(1),
  }),
}), asyncHandler(async (req, res) => {
  const capability = await getCapabilityWithErrors(req.params.id);
  
  assert(capability, Errors.notFound('Capability'));
  
  res.json({
    success: true,
    data: {
      id: capability.id,
      capabilityId: capability.capability_id,
      name: capability.name,
      status: capability.status,
      reason: capability.reason,
      ownerModule: capability.owner_module,
      lastChecked: capability.last_checked,
      lastError: capability.last_error,
      metadata: typeof capability.metadata === 'string' ? JSON.parse(capability.metadata) : capability.metadata,
      recentAuditEvents: capability.recentAuditEvents || [],
      createdAt: capability.created_at,
      updatedAt: capability.updated_at,
    },
  });
}));

/**
 * Update capability status
 * PUT /api/admin/capabilities/:id/status
 */
router.put('/:id/status', validate({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    status: z.enum(['stable', 'degraded', 'disabled']),
    reason: z.string().max(1000).optional().nullable(),
    lastError: z.string().max(1000).optional().nullable(),
  }),
}), asyncHandler(async (req, res) => {
  const {id} = req.params;
  const {status, reason, lastError} = req.body;
  
  // Get current capability for audit
  const currentCapability = await getCapability(id);
  assert(currentCapability, Errors.notFound('Capability'));
  
  // Update status
  const updated = await updateCapabilityStatus(id, status, reason, lastError);
  
  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'CAPABILITY_STATUS_UPDATED',
    entityType: 'capability',
    entityId: id,
    details: {
      capabilityId: id,
      capabilityName: currentCapability.name,
      oldStatus: currentCapability.status,
      newStatus: status,
      reason,
    },
    ipAddress: getClientIp(req),
    oldValue: JSON.stringify({status: currentCapability.status, reason: currentCapability.reason}),
    newValue: JSON.stringify({status, reason}),
    role: req.user.role,
  });
  
  res.json({
    success: true,
    data: {
      id: updated.id,
      capabilityId: updated.capability_id,
      name: updated.name,
      status: updated.status,
      reason: updated.reason,
      lastError: updated.last_error,
      updatedAt: updated.updated_at,
    },
  });
}));

/**
 * Get capability health summary
 * GET /api/admin/capabilities/health/summary
 */
router.get('/health/summary', asyncHandler(async (req, res) => {
  const summary = await getHealthSummary();
  
  res.json({
    success: true,
    data: summary,
  });
}));

module.exports = router;
