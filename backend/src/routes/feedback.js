/**
 * Feedback + Suggestion System Routes
 * Supports anonymous & identified feedback, categories, severity, admin moderation
 */

const express = require('express');
const pool = require('../../database/connection');
const {authenticateToken} = require('../../middleware/auth');
const {authorizeRoles} = require('../../middleware/auth');
const {logAuditEvent, getClientIp} = require('../../services/auditLogger');
const {asyncHandler, assert} = require('../../middleware/errorHandler');
const {Errors} = require('../../utils/errors');
const {capabilityRequired} = require('../../middleware/capabilityCheck');
const {validate} = require('../../middleware/validation');

const router = express.Router();

// All routes require feedback capability
router.use(capabilityRequired('feedback'));

/**
 * Get all feedback with filters
 * GET /api/feedback
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const {
    category,
    status,
    severity,
    submittedBy,
    assignedTo,
    page = 1,
    limit = 20,
  } = req.query;

  const offset = (page - 1) * limit;
  const userRole = req.user.role;
  const isAdmin = ['ADMIN', 'HR_ADMIN', 'HR_MANAGER'].includes(userRole);

  let query = `
    SELECT f.*,
           u1.name as submitted_by_name,
           u2.name as assigned_to_name,
           u3.name as reviewed_by_name
    FROM feedback f
    LEFT JOIN users u1 ON f.submitted_by = u1.id AND f.is_anonymous = FALSE
    LEFT JOIN users u2 ON f.assigned_to = u2.id
    LEFT JOIN users u3 ON f.reviewed_by = u3.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 0;

  // Non-admins can only see their own feedback
  if (!isAdmin) {
    paramCount++;
    query += ` AND (f.submitted_by = $${paramCount} OR f.is_anonymous = TRUE)`;
    params.push(req.user.id);
  } else if (submittedBy) {
    paramCount++;
    query += ` AND f.submitted_by = $${paramCount}`;
    params.push(submittedBy);
  }

  if (category) {
    paramCount++;
    query += ` AND f.category = $${paramCount}`;
    params.push(category);
  }

  if (status) {
    paramCount++;
    query += ` AND f.status = $${paramCount}`;
    params.push(status);
  }

  if (severity) {
    paramCount++;
    query += ` AND f.severity = $${paramCount}`;
    params.push(severity);
  }

  if (assignedTo && isAdmin) {
    paramCount++;
    query += ` AND f.assigned_to = $${paramCount}`;
    params.push(assignedTo);
  }

  query += ` ORDER BY f.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) FROM feedback WHERE 1=1';
  const countParams = [];
  let countParamCount = 0;

  if (!isAdmin) {
    countParamCount++;
    countQuery += ` AND (submitted_by = $${countParamCount} OR is_anonymous = TRUE)`;
    countParams.push(req.user.id);
  } else if (submittedBy) {
    countParamCount++;
    countQuery += ` AND submitted_by = $${countParamCount}`;
    countParams.push(submittedBy);
  }

  if (category) {
    countParamCount++;
    countQuery += ` AND category = $${countParamCount}`;
    countParams.push(category);
  }

  if (status) {
    countParamCount++;
    countQuery += ` AND status = $${countParamCount}`;
    countParams.push(status);
  }

  if (severity) {
    countParamCount++;
    countQuery += ` AND severity = $${countParamCount}`;
    countParams.push(severity);
  }

  if (assignedTo && isAdmin) {
    countParamCount++;
    countQuery += ` AND assigned_to = $${countParamCount}`;
    countParams.push(assignedTo);
  }

  const countResult = await pool.query(countQuery, countParams);

  res.json({
    success: true,
    data: {
      feedback: result.rows.map(row => ({
        id: row.id,
        submittedBy: row.is_anonymous ? null : row.submitted_by,
        submittedByName: row.is_anonymous ? 'Anonymous' : row.submitted_by_name,
        isAnonymous: row.is_anonymous,
        category: row.category,
        subcategory: row.subcategory,
        title: row.title,
        description: row.description,
        severity: row.severity,
        sentiment: row.sentiment,
        status: row.status,
        priority: row.priority,
        assignedTo: row.assigned_to,
        assignedToName: row.assigned_to_name,
        reviewedBy: row.reviewed_by,
        reviewedByName: row.reviewed_by_name,
        reviewedAt: row.reviewed_at,
        resolutionNotes: row.resolution_notes,
        resolvedAt: row.resolved_at,
        tags: row.tags || [],
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    },
  });
}));

/**
 * Submit feedback
 * POST /api/feedback
 */
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const {
    isAnonymous = false,
    category,
    subcategory,
    title,
    description,
    severity = 'MEDIUM',
    sentiment,
    tags = [],
    metadata = {},
  } = req.body;

  assert(category, Errors.invalidInput('Category is required'));
  assert(title, Errors.invalidInput('Title is required'));
  assert(description, Errors.invalidInput('Description is required'));

  const result = await pool.query(
    `INSERT INTO feedback (
      submitted_by, is_anonymous, category, subcategory, title, description,
      severity, sentiment, tags, metadata, status, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'SUBMITTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING *`,
    [
      isAnonymous ? null : req.user.id,
      isAnonymous,
      category,
      subcategory || null,
      title,
      description,
      severity,
      sentiment || null,
      tags,
      JSON.stringify(metadata),
    ]
  );

  const feedback = result.rows[0];

  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'FEEDBACK_SUBMITTED',
    entityType: 'feedback',
    entityId: feedback.id,
    details: {
      category,
      severity,
      isAnonymous,
    },
    ipAddress: getClientIp(req),
    role: req.user.role,
  });

  // Notify admins for high/critical severity
  if (['HIGH', 'CRITICAL'].includes(severity)) {
    const io = req.app.get('io');
    if (io) {
      const adminUsersResult = await pool.query(
        "SELECT id FROM users WHERE role IN ('ADMIN', 'HR_ADMIN', 'HR_MANAGER') LIMIT 10"
      );

      for (const adminUser of adminUsersResult.rows) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, type, related_id, created_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
          [
            adminUser.id,
            'New High Priority Feedback',
            `New ${severity} priority feedback: ${title}`,
            'FEEDBACK',
            feedback.id,
          ]
        );

        io.to(`user-${adminUser.id}`).emit('notification', {
          title: 'New High Priority Feedback',
          message: `New ${severity} priority feedback received`,
          type: 'FEEDBACK',
          relatedId: feedback.id,
        });
      }
    }
  }

  res.status(201).json({
    success: true,
    data: {
      id: feedback.id,
      category: feedback.category,
      title: feedback.title,
      status: feedback.status,
      createdAt: feedback.created_at,
    },
  });
}));

/**
 * Update feedback status (moderation)
 * PUT /api/feedback/:id/status
 */
router.put('/:id/status', authenticateToken, authorizeRoles('ADMIN', 'HR_ADMIN', 'HR_MANAGER'), asyncHandler(async (req, res) => {
  const {status, resolutionNotes, assignedTo} = req.body;

  assert(status, Errors.invalidInput('Status is required'));

  const validStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CLOSED'];
  assert(validStatuses.includes(status), Errors.invalidInput(`Invalid status. Must be one of: ${validStatuses.join(', ')}`));

  // Get current feedback
  const currentResult = await pool.query('SELECT * FROM feedback WHERE id = $1', [req.params.id]);
  assert(currentResult.rows.length > 0, Errors.notFound('Feedback'));

  const current = currentResult.rows[0];

  const updateFields = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
  const params = [status];
  let paramCount = 1;

  if (status === 'RESOLVED') {
    paramCount++;
    updateFields.push(`resolved_at = CURRENT_TIMESTAMP`);
    if (resolutionNotes) {
      paramCount++;
      updateFields.push(`resolution_notes = $${paramCount}`);
      params.push(resolutionNotes);
    }
  }

  if (status === 'UNDER_REVIEW' || status === 'IN_PROGRESS') {
    paramCount++;
    updateFields.push(`reviewed_by = $${paramCount}`);
    params.push(req.user.id);
    paramCount++;
    updateFields.push(`reviewed_at = CURRENT_TIMESTAMP`);
  }

  if (assignedTo) {
    paramCount++;
    updateFields.push(`assigned_to = $${paramCount}`);
    params.push(assignedTo);
  }

  paramCount++;
  params.push(req.params.id);

  await pool.query(
    `UPDATE feedback SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
    params
  );

  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'FEEDBACK_STATUS_UPDATED',
    entityType: 'feedback',
    entityId: req.params.id,
    details: {
      oldStatus: current.status,
      newStatus: status,
      resolutionNotes,
    },
    ipAddress: getClientIp(req),
    oldValue: JSON.stringify({status: current.status}),
    newValue: JSON.stringify({status}),
    role: req.user.role,
  });

  res.json({
    success: true,
    data: {
      id: req.params.id,
      status,
      updatedAt: new Date().toISOString(),
    },
  });
}));

/**
 * Get feedback statistics (admin only)
 * GET /api/feedback/statistics
 */
router.get('/statistics', authenticateToken, authorizeRoles('ADMIN', 'HR_ADMIN', 'HR_MANAGER'), asyncHandler(async (req, res) => {
  const {startDate, endDate} = req.query;

  let dateFilter = '';
  const params = [];
  if (startDate && endDate) {
    dateFilter = 'WHERE created_at >= $1 AND created_at <= $2';
    params.push(startDate, endDate);
  }

  // By status
  const statusResult = await pool.query(
    `SELECT status, COUNT(*) as count FROM feedback ${dateFilter} GROUP BY status`,
    params
  );

  // By category
  const categoryResult = await pool.query(
    `SELECT category, COUNT(*) as count FROM feedback ${dateFilter} GROUP BY category`,
    params
  );

  // By severity
  const severityResult = await pool.query(
    `SELECT severity, COUNT(*) as count FROM feedback ${dateFilter} GROUP BY severity`,
    params
  );

  // Pending review count
  const pendingResult = await pool.query(
    `SELECT COUNT(*) as count FROM feedback WHERE status IN ('SUBMITTED', 'UNDER_REVIEW') ${dateFilter ? 'AND ' + dateFilter.replace('WHERE ', '') : ''}`,
    params
  );

  res.json({
    success: true,
    data: {
      byStatus: statusResult.rows.map(row => ({
        status: row.status,
        count: parseInt(row.count),
      })),
      byCategory: categoryResult.rows.map(row => ({
        category: row.category,
        count: parseInt(row.count),
      })),
      bySeverity: severityResult.rows.map(row => ({
        severity: row.severity,
        count: parseInt(row.count),
      })),
      pendingReview: parseInt(pendingResult.rows[0].count),
    },
  });
}));

module.exports = router;
