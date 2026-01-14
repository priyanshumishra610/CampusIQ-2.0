
**
 * Leave Approval Service
 * Handles approval timeline tracking, pending duration, and escalation
 */

const pool = require('../database/connection');

/**
 * Calculate pending duration in hours
 * @param {Date} createdAt - Request creation timestamp
 * @returns {number} Hours pending
 */
const calculatePendingDuration = (createdAt) => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now - created;
  return Math.floor(diffMs / (1000 * 60 * 60)); // Convert to hours
};

/**
 * Update pending duration for a leave request
 * @param {string} requestId - Leave request ID
 */
const updatePendingDuration = async (requestId) => {
  const result = await pool.query(
    `SELECT created_at, status FROM leave_requests WHERE id = $1`,
    [requestId]
  );

  if (result.rows.length === 0) return;

  const request = result.rows[0];
  
  if (request.status === 'PENDING') {
    const hours = calculatePendingDuration(request.created_at);
    await pool.query(
      `UPDATE leave_requests 
       SET pending_duration_hours = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [hours, requestId]
    );
  }
};

/**
 * Check if escalation should be triggered
 * @param {string} requestId - Leave request ID
 * @param {number} escalationThresholdHours - Hours before escalation (default: 48)
 * @returns {Promise<Object>} {shouldEscalate: boolean, reason?: string}
 */
const checkEscalation = async (requestId, escalationThresholdHours = 48) => {
  const result = await pool.query(
    `SELECT created_at, status, pending_duration_hours, escalation_triggered_at,
            manager_approval_status, hr_approval_status, requires_hr_approval
     FROM leave_requests WHERE id = $1`,
    [requestId]
  );

  if (result.rows.length === 0) {
    return {shouldEscalate: false, reason: 'Request not found'};
  }

  const request = result.rows[0];

  // Already escalated
  if (request.escalation_triggered_at) {
    return {shouldEscalate: false, reason: 'Already escalated'};
  }

  // Not pending
  if (request.status !== 'PENDING') {
    return {shouldEscalate: false, reason: 'Request not pending'};
  }

  const hours = request.pending_duration_hours || calculatePendingDuration(request.created_at);

  if (hours >= escalationThresholdHours) {
    let reason = `Leave request pending for ${hours} hours`;
    
    if (request.requires_hr_approval && request.manager_approval_status === 'PENDING') {
      reason += ' - Manager approval pending';
    } else if (request.requires_hr_approval && request.hr_approval_status === 'PENDING') {
      reason += ' - HR approval pending';
    } else if (!request.requires_hr_approval && request.manager_approval_status === 'PENDING') {
      reason += ' - Manager approval pending';
    }

    return {shouldEscalate: true, reason, hours};
  }

  return {shouldEscalate: false};
};

/**
 * Trigger escalation for a leave request
 * @param {string} requestId - Leave request ID
 * @param {string} reason - Escalation reason
 * @param {string} escalatedBy - User ID who triggered escalation
 */
const triggerEscalation = async (requestId, reason, escalatedBy = null) => {
  await pool.query(
    `UPDATE leave_requests 
     SET escalation_triggered_at = CURRENT_TIMESTAMP,
         escalation_reason = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [reason, requestId]
  );

  // Get request details for notification
  const result = await pool.query(
    `SELECT lr.*, e.first_name, e.last_name, e.employee_id, e.reporting_manager_id
     FROM leave_requests lr
     JOIN employees e ON lr.employee_id = e.id
     WHERE lr.id = $1`,
    [requestId]
  );

  return result.rows[0];
};

/**
 * Get approval timeline for a leave request
 * @param {string} requestId - Leave request ID
 * @returns {Promise<Object>} Timeline data
 */
const getApprovalTimeline = async (requestId) => {
  const result = await pool.query(
    `SELECT 
       lr.id,
       lr.created_at as submitted_at,
       lr.manager_approval_status,
       lr.manager_approved_at,
       lr.manager_approved_by,
       lr.hr_approval_status,
       lr.hr_approved_at,
       lr.hr_approved_by,
       lr.status as final_status,
       lr.approved_at as final_approved_at,
       lr.approved_by as final_approved_by,
       lr.pending_duration_hours,
       lr.escalation_triggered_at,
       lr.escalation_reason,
       u1.name as manager_approved_by_name,
       u2.name as hr_approved_by_name,
       u3.name as final_approved_by_name
     FROM leave_requests lr
     LEFT JOIN users u1 ON lr.manager_approved_by = u1.id
     LEFT JOIN users u2 ON lr.hr_approved_by = u2.id
     LEFT JOIN users u3 ON lr.approved_by = u3.id
     WHERE lr.id = $1`,
    [requestId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  
  const timeline = {
    submittedAt: row.submitted_at,
    pendingDurationHours: row.pending_duration_hours,
    escalationTriggeredAt: row.escalation_triggered_at,
    escalationReason: row.escalation_reason,
    managerApproval: {
      status: row.manager_approval_status,
      approvedAt: row.manager_approved_at,
      approvedBy: row.manager_approved_by,
      approvedByName: row.manager_approved_by_name,
    },
    hrApproval: {
      status: row.hr_approval_status,
      approvedAt: row.hr_approved_at,
      approvedBy: row.hr_approved_by,
      approvedByName: row.hr_approved_by_name,
    },
    finalApproval: {
      status: row.final_status,
      approvedAt: row.final_approved_at,
      approvedBy: row.final_approved_by,
      approvedByName: row.final_approved_by_name,
    },
  };

  return timeline;
};

/**
 * Batch update pending durations for all pending requests
 * Called periodically by a background job
 */
const batchUpdatePendingDurations = async () => {
  const result = await pool.query(
    `SELECT id, created_at FROM leave_requests WHERE status = 'PENDING'`
  );

  for (const row of result.rows) {
    const hours = calculatePendingDuration(row.created_at);
    await pool.query(
      `UPDATE leave_requests 
       SET pending_duration_hours = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [hours, row.id]
    );
  }

  return result.rows.length;
};

module.exports = {
  calculatePendingDuration,
  updatePendingDuration,
  checkEscalation,
  triggerEscalation,
  getApprovalTimeline,
  batchUpdatePendingDurations,
};
