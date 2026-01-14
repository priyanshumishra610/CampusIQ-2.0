/**
 * Leave Approval Enhancements Routes
 * Adds approval timeline, pending duration tracking, and escalation hooks
 */

const express = require('express');
const pool = require('../../database/connection');
const {authenticateToken} = require('../../middleware/auth');
const {authorizeRoles} = require('../../middleware/auth');
const {logAuditEvent, getClientIp} = require('../../services/auditLogger');
const {getApprovalTimeline, checkEscalation, triggerEscalation, updatePendingDuration} = require('../../services/leaveApprovalService');
const {asyncHandler, assert} = require('../../middleware/errorHandler');
const {Errors} = require('../../utils/errors');
const {capabilityRequired} = require('../../middleware/capabilityCheck');

const router = express.Router();

// All routes require leave capability
router.use(capabilityRequired('leave'));

/**
 * Get approval timeline for a leave request
 * GET /api/hr/leave/requests/:id/timeline
 */
router.get('/requests/:id/timeline', authenticateToken, asyncHandler(async (req, res) => {
  const timeline = await getApprovalTimeline(req.params.id);
  
  assert(timeline, Errors.notFound('Leave request'));

  // Check permissions - employee can see own timeline, HR can see all
  const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
  assert(userResult.rows.length > 0, Errors.notFound('User'));

  const userRole = userResult.rows[0].role;
  const isHR = ['HR_ADMIN', 'HR_MANAGER', 'HR_STAFF'].includes(userRole);

  if (!isHR) {
    // Check if user is the employee
    const requestResult = await pool.query(
      `SELECT e.user_id FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       WHERE lr.id = $1`,
      [req.params.id]
    );
    
    assert(requestResult.rows.length > 0, Errors.notFound('Leave request'));
    assert(
      requestResult.rows[0].user_id === req.user.id,
      Errors.permissionDenied('You can only view your own leave request timeline')
    );
  }

  res.json({
    success: true,
    data: timeline,
  });
}));

/**
 * Check escalation status for a leave request
 * GET /api/hr/leave/requests/:id/escalation-check
 */
router.get('/requests/:id/escalation-check', authenticateToken, authorizeRoles('HR_ADMIN', 'HR_MANAGER', 'ADMIN'), asyncHandler(async (req, res) => {
  const {thresholdHours = 48} = req.query;
  const escalationCheck = await checkEscalation(req.params.id, parseInt(thresholdHours));

  res.json({
    success: true,
    data: escalationCheck,
  });
}));

/**
 * Trigger escalation for a leave request
 * POST /api/hr/leave/requests/:id/escalate
 */
router.post('/requests/:id/escalate', authenticateToken, authorizeRoles('HR_ADMIN', 'HR_MANAGER', 'ADMIN'), asyncHandler(async (req, res) => {
  const {reason} = req.body;

  const escalationCheck = await checkEscalation(req.params.id);
  
  assert(escalationCheck.shouldEscalate, Errors.invalidInput(
    escalationCheck.reason || 'Escalation conditions not met'
  ));

  const escalatedRequest = await triggerEscalation(
    req.params.id,
    reason || escalationCheck.reason,
    req.user.id
  );

  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'LEAVE_ESCALATED',
    entityType: 'leave_request',
    entityId: req.params.id,
    details: {
      reason: reason || escalationCheck.reason,
      pendingHours: escalationCheck.hours,
    },
    ipAddress: getClientIp(req),
    role: req.user.role,
  });

  // Notify HR admins
  const io = req.app.get('io');
  if (io) {
    const hrUsersResult = await pool.query(
      "SELECT id FROM users WHERE role IN ('HR_ADMIN', 'HR_MANAGER') LIMIT 10"
    );
    
    for (const hrUser of hrUsersResult.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, related_id, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [
          hrUser.id,
          'Leave Request Escalated',
          `Leave request ${req.params.id} has been escalated: ${reason || escalationCheck.reason}`,
          'LEAVE_ESCALATION',
          req.params.id,
        ]
      );

      io.to(`user-${hrUser.id}`).emit('notification', {
        title: 'Leave Request Escalated',
        message: `Leave request has been escalated`,
        type: 'LEAVE_ESCALATION',
        relatedId: req.params.id,
      });
    }
  }

  res.json({
    success: true,
    data: {
      requestId: req.params.id,
      escalatedAt: new Date().toISOString(),
      reason: reason || escalationCheck.reason,
    },
  });
}));

/**
 * Update pending duration for a leave request (internal/background job)
 * POST /api/hr/leave/requests/:id/update-pending-duration
 */
router.post('/requests/:id/update-pending-duration', authenticateToken, asyncHandler(async (req, res) => {
  // This endpoint can be called by background jobs or admins
  await updatePendingDuration(req.params.id);

  res.json({
    success: true,
    message: 'Pending duration updated',
  });
}));

module.exports = router;
