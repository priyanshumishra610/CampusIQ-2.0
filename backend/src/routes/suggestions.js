/**
 * Smart Suggestions Engine Routes
 * Consume audit logs, attendance patterns, student risk data, admin behavior
 * Generate contextual suggestions with explanations
 */

const express = require('express');
const pool = require('../../database/connection');
const {authenticateToken} = require('../../middleware/auth');
const {authorizeRoles} = require('../../middleware/auth');
const {logAuditEvent, getClientIp} = require('../../services/auditLogger');
const {asyncHandler, assert} = require('../../middleware/errorHandler');
const {Errors} = require('../../utils/errors');
const {capabilityChecked} = require('../../middleware/capabilityCheck');

const router = express.Router();

// Use capabilityChecked (allows degraded mode)
router.use(capabilityChecked('smart_suggestions'));

/**
 * Generate suggestions
 * POST /api/suggestions/generate
 */
router.post('/generate', authenticateToken, authorizeRoles('ADMIN', 'HR_ADMIN', 'HR_MANAGER'), asyncHandler(async (req, res) => {
  const {targetEntityType, targetEntityId, suggestionType} = req.body;

  const suggestions = [];

  if (targetEntityType === 'STUDENT' && targetEntityId) {
    // Generate student-specific suggestions
    const studentSuggestions = await generateStudentSuggestions(targetEntityId);
    suggestions.push(...studentSuggestions);
  } else if (targetEntityType === 'SYSTEM') {
    // Generate system-wide suggestions
    const systemSuggestions = await generateSystemSuggestions();
    suggestions.push(...systemSuggestions);
  }

  // Filter by type if specified
  const filteredSuggestions = suggestionType
    ? suggestions.filter(s => s.suggestionType === suggestionType)
    : suggestions;

  res.json({
    success: true,
    data: {
      suggestions: filteredSuggestions,
    },
    degraded: false,
  });
}));

/**
 * Get suggestions
 * GET /api/suggestions
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const {suggestionType, targetEntityType, targetEntityId, status, priority, page = 1, limit = 20} = req.query;
  const offset = (page - 1) * limit;

  let query = `SELECT * FROM suggestions WHERE 1=1`;
  const params = [];
  let paramCount = 0;

  if (suggestionType) {
    paramCount++;
    query += ` AND suggestion_type = $${paramCount}`;
    params.push(suggestionType);
  }

  if (targetEntityType) {
    paramCount++;
    query += ` AND target_entity_type = $${paramCount}`;
    params.push(targetEntityType);
  }

  if (targetEntityId) {
    paramCount++;
    query += ` AND target_entity_id = $${paramCount}`;
    params.push(targetEntityId);
  }

  if (status) {
    paramCount++;
    query += ` AND status = $${paramCount}`;
    params.push(status);
  } else {
    query += ` AND status = 'PENDING'`;
  }

  if (priority) {
    paramCount++;
    query += ` AND priority = $${paramCount}`;
    params.push(priority);
  }

  query += ` ORDER BY priority DESC, confidence_score DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  res.json({
    success: true,
    data: {
      suggestions: result.rows.map(row => ({
        id: row.id,
        suggestionType: row.suggestion_type,
        targetEntityType: row.target_entity_type,
        targetEntityId: row.target_entity_id,
        title: row.title,
        description: row.description,
        explanation: row.explanation,
        priority: row.priority,
        confidenceScore: parseFloat(row.confidence_score || 0),
        sourceData: row.source_data,
        suggestedAction: row.suggested_action,
        status: row.status,
        acknowledgedAt: row.acknowledged_at,
        implementedAt: row.implemented_at,
        createdAt: row.created_at,
      })),
    },
    degraded: false,
  });
}));

/**
 * Acknowledge suggestion
 * PUT /api/suggestions/:id/acknowledge
 */
router.put('/:id/acknowledge', authenticateToken, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `UPDATE suggestions
     SET status = 'ACKNOWLEDGED',
         acknowledged_by = $1,
         acknowledged_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [req.user.id, req.params.id]
  );

  assert(result.rows.length > 0, Errors.notFound('Suggestion'));

  res.json({
    success: true,
    data: {
      id: result.rows[0].id,
      status: 'ACKNOWLEDGED',
    },
  });
}));

/**
 * Generate student-specific suggestions
 */
async function generateStudentSuggestions(studentId) {
  const suggestions = [];

  // Check attendance patterns
  const attendanceResult = await pool.query(
    `SELECT 
       COUNT(*) FILTER (WHERE status = 'PRESENT') as present,
       COUNT(*) as total
     FROM attendance
     WHERE student_id = $1
     AND date >= CURRENT_DATE - INTERVAL '30 days'`,
    [studentId]
  );

  const present = parseInt(attendanceResult.rows[0].present || 0);
  const total = parseInt(attendanceResult.rows[0].total || 0);
  const attendanceRate = total > 0 ? (present / total) * 100 : 100;

  if (attendanceRate < 75) {
    suggestions.push({
      suggestionType: 'ATTENDANCE',
      targetEntityType: 'STUDENT',
      targetEntityId: studentId,
      title: 'Low Attendance Detected',
      description: `Student attendance is ${Math.round(attendanceRate)}% over the last 30 days`,
      explanation: `Based on attendance data, this student has been absent ${total - present} out of ${total} days. This may indicate academic risk or personal issues requiring attention.`,
      priority: attendanceRate < 60 ? 'HIGH' : 'MEDIUM',
      confidenceScore: 85,
      sourceData: {attendanceRate, present, total},
      suggestedAction: 'Schedule meeting with student to discuss attendance issues',
    });
  }

  // Check for anomalies
  const anomalyResult = await pool.query(
    `SELECT COUNT(*) as count FROM attendance_anomalies
     WHERE student_id = $1 AND resolved = FALSE`,
    [studentId]
  );

  if (parseInt(anomalyResult.rows[0].count) > 0) {
    suggestions.push({
      suggestionType: 'BEHAVIOR',
      targetEntityType: 'STUDENT',
      targetEntityId: studentId,
      title: 'Unresolved Attendance Anomalies',
      description: 'There are unresolved attendance anomalies for this student',
      explanation: 'The system has flagged attendance anomalies that require review and resolution.',
      priority: 'MEDIUM',
      confidenceScore: 70,
      sourceData: {anomalyCount: parseInt(anomalyResult.rows[0].count)},
      suggestedAction: 'Review and resolve attendance anomalies',
    });
  }

  // Store suggestions
  for (const suggestion of suggestions) {
    await pool.query(
      `INSERT INTO suggestions (
        suggestion_type, target_entity_type, target_entity_id, title, description,
        explanation, priority, confidence_score, source_data, suggested_action,
        status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT DO NOTHING`,
      [
        suggestion.suggestionType,
        suggestion.targetEntityType,
        suggestion.targetEntityId,
        suggestion.title,
        suggestion.description,
        suggestion.explanation,
        suggestion.priority,
        suggestion.confidenceScore,
        JSON.stringify(suggestion.sourceData),
        suggestion.suggestedAction,
      ]
    );
  }

  return suggestions;
}

/**
 * Generate system-wide suggestions
 */
async function generateSystemSuggestions() {
  const suggestions = [];

  // Check for pending leave requests
  const pendingLeaveResult = await pool.query(
    `SELECT COUNT(*) as count FROM leave_requests
     WHERE status = 'PENDING'
     AND created_at < CURRENT_TIMESTAMP - INTERVAL '48 hours'`
  );

  const pendingCount = parseInt(pendingLeaveResult.rows[0].count || 0);
  if (pendingCount > 0) {
    suggestions.push({
      suggestionType: 'ADMINISTRATIVE',
      targetEntityType: 'SYSTEM',
      targetEntityId: null,
      title: 'Pending Leave Requests Requiring Attention',
      description: `${pendingCount} leave requests have been pending for more than 48 hours`,
      explanation: `There are ${pendingCount} leave requests that have been pending for over 48 hours. These may require escalation or manual review.`,
      priority: 'MEDIUM',
      confidenceScore: 80,
      sourceData: {pendingCount},
      suggestedAction: 'Review and process pending leave requests',
    });
  }

  return suggestions;
}

module.exports = router;
