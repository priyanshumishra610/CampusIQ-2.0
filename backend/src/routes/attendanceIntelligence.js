/**
 * Attendance Intelligence Engine Routes
 * Pattern detection, anomaly flags, auto-actions via rule engine, degraded mode support
 */

const express = require('express');
const pool = require('../../database/connection');
const {authenticateToken} = require('../../middleware/auth');
const {authorizeRoles} = require('../../middleware/auth');
const {logAuditEvent, getClientIp} = require('../../services/auditLogger');
const {asyncHandler, assert} = require('../../middleware/errorHandler');
const {Errors} = require('../../utils/errors');
const {capabilityChecked} = require('../../middleware/capabilityCheck');
const {AttendanceRules} = require('../../services/businessRules');

const router = express.Router();

// Use capabilityChecked (allows degraded mode)
router.use(capabilityChecked('attendance_intelligence'));

/**
 * Detect attendance patterns for a student
 * POST /api/attendance-intelligence/patterns/detect
 */
router.post('/patterns/detect', authenticateToken, authorizeRoles('FACULTY', 'ADMIN', 'HR_ADMIN'), asyncHandler(async (req, res) => {
  const {studentId, courseId} = req.body;

  assert(studentId, Errors.invalidInput('Student ID is required'));

  // Get attendance data for last 30 days
  const attendanceResult = await pool.query(
    `SELECT date, status, COUNT(*) as count
     FROM attendance
     WHERE student_id = $1 ${courseId ? 'AND course_id = $2' : ''}
     AND date >= CURRENT_DATE - INTERVAL '30 days'
     GROUP BY date, status
     ORDER BY date DESC`,
    courseId ? [studentId, courseId] : [studentId]
  );

  if (attendanceResult.rows.length === 0) {
    return res.json({
      success: true,
      data: {
        patterns: [],
        message: 'Insufficient attendance data for pattern detection',
      },
      degraded: false,
    });
  }

  const patterns = [];
  const absences = attendanceResult.rows.filter(r => r.status === 'ABSENT').length;
  const totalDays = attendanceResult.rows.length;
  const absenceRate = absences / totalDays;

  // Detect patterns
  if (absenceRate > 0.3) {
    patterns.push({
      type: 'ABSENT_PATTERN',
      description: `High absence rate: ${Math.round(absenceRate * 100)}%`,
      confidenceScore: Math.min(90, absenceRate * 100),
    });
  }

  // Check for declining trend
  const recentAbsences = attendanceResult.rows.slice(0, 10).filter(r => r.status === 'ABSENT').length;
  const olderAbsences = attendanceResult.rows.slice(10, 20).filter(r => r.status === 'ABSENT').length;
  if (recentAbsences > olderAbsences * 1.5) {
    patterns.push({
      type: 'DECLINING',
      description: 'Attendance declining over time',
      confidenceScore: 75,
    });
  }

  // Store patterns
  for (const pattern of patterns) {
    await pool.query(
      `INSERT INTO attendance_patterns (
        student_id, course_id, pattern_type, pattern_description,
        confidence_score, detected_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT DO NOTHING`,
      [
        studentId,
        courseId || null,
        pattern.type,
        pattern.description,
        pattern.confidenceScore,
      ]
    );
  }

  res.json({
    success: true,
    data: {
      patterns,
      totalDays,
      absenceRate: Math.round(absenceRate * 100),
    },
    degraded: false,
  });
}));

/**
 * Flag attendance anomaly
 * POST /api/attendance-intelligence/anomalies/flag
 */
router.post('/anomalies/flag', authenticateToken, authorizeRoles('FACULTY', 'ADMIN', 'HR_ADMIN'), asyncHandler(async (req, res) => {
  const {studentId, courseId, anomalyType, description, severity = 'MEDIUM', autoFlagged = false} = req.body;

  assert(studentId, Errors.invalidInput('Student ID is required'));
  assert(anomalyType, Errors.invalidInput('Anomaly type is required'));
  assert(description, Errors.invalidInput('Description is required'));

  const result = await pool.query(
    `INSERT INTO attendance_anomalies (
      student_id, course_id, anomaly_type, anomaly_description,
      severity, flagged_at, flagged_by, auto_flagged, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING *`,
    [
      studentId,
      courseId || null,
      anomalyType,
      description,
      severity,
      autoFlagged ? null : req.user.id,
      autoFlagged,
    ]
  );

  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'ATTENDANCE_ANOMALY_FLAGGED',
    entityType: 'attendance_anomaly',
    entityId: result.rows[0].id,
    details: {
      studentId,
      courseId,
      anomalyType,
      severity,
      autoFlagged,
    },
    ipAddress: getClientIp(req),
    role: req.user.role,
  });

  res.status(201).json({
    success: true,
    data: {
      id: result.rows[0].id,
      studentId,
      anomalyType,
      severity,
      flaggedAt: result.rows[0].flagged_at,
    },
  });
}));

/**
 * Get anomalies for a student
 * GET /api/attendance-intelligence/anomalies
 */
router.get('/anomalies', authenticateToken, asyncHandler(async (req, res) => {
  const {studentId, courseId, resolved, severity} = req.query;

  let query = `
    SELECT aa.*, u.name as student_name, c.name as course_name
    FROM attendance_anomalies aa
    LEFT JOIN users u ON aa.student_id = u.id
    LEFT JOIN courses c ON aa.course_id = c.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 0;

  // Faculty can only see their course anomalies
  if (req.user.role === 'FACULTY') {
    paramCount++;
    query += ` AND aa.course_id IN (SELECT id FROM courses WHERE faculty_id = $${paramCount})`;
    params.push(req.user.id);
  } else if (studentId) {
    paramCount++;
    query += ` AND aa.student_id = $${paramCount}`;
    params.push(studentId);
  }

  if (courseId) {
    paramCount++;
    query += ` AND aa.course_id = $${paramCount}`;
    params.push(courseId);
  }

  if (resolved !== undefined) {
    paramCount++;
    query += ` AND aa.resolved = $${paramCount}`;
    params.push(resolved === 'true');
  }

  if (severity) {
    paramCount++;
    query += ` AND aa.severity = $${paramCount}`;
    params.push(severity);
  }

  query += ` ORDER BY aa.flagged_at DESC LIMIT 50`;

  const result = await pool.query(query, params);

  res.json({
    success: true,
    data: {
      anomalies: result.rows.map(row => ({
        id: row.id,
        studentId: row.student_id,
        studentName: row.student_name,
        courseId: row.course_id,
        courseName: row.course_name,
        anomalyType: row.anomaly_type,
        description: row.anomaly_description,
        severity: row.severity,
        flaggedAt: row.flagged_at,
        flaggedBy: row.flagged_by,
        autoFlagged: row.auto_flagged,
        resolved: row.resolved,
        resolvedAt: row.resolved_at,
        resolutionNotes: row.resolution_notes,
      })),
    },
    degraded: false,
  });
}));

/**
 * Resolve an anomaly
 * PUT /api/attendance-intelligence/anomalies/:id/resolve
 */
router.put('/anomalies/:id/resolve', authenticateToken, authorizeRoles('FACULTY', 'ADMIN', 'HR_ADMIN'), asyncHandler(async (req, res) => {
  const {resolutionNotes} = req.body;

  const result = await pool.query(
    `UPDATE attendance_anomalies
     SET resolved = TRUE,
         resolved_at = CURRENT_TIMESTAMP,
         resolved_by = $1,
         resolution_notes = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3
     RETURNING *`,
    [req.user.id, resolutionNotes || null, req.params.id]
  );

  assert(result.rows.length > 0, Errors.notFound('Anomaly'));

  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'ATTENDANCE_ANOMALY_RESOLVED',
    entityType: 'attendance_anomaly',
    entityId: req.params.id,
    details: {
      resolutionNotes,
    },
    ipAddress: getClientIp(req),
    role: req.user.role,
  });

  res.json({
    success: true,
    data: {
      id: result.rows[0].id,
      resolved: true,
      resolvedAt: result.rows[0].resolved_at,
    },
  });
}));

module.exports = router;
