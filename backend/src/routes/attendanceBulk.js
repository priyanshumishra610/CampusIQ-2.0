/**
 * Multi-Day Attendance Enhancements Routes
 * Admin visibility dashboard APIs, track who filled bulk attendance, pending bulk submissions, historical logs
 */

const express = require('express');
const pool = require('../../database/connection');
const {authenticateToken} = require('../../middleware/auth');
const {authorizeRoles} = require('../../middleware/auth');
const {logAuditEvent, getClientIp} = require('../../services/auditLogger');
const {asyncHandler, assert} = require('../../middleware/errorHandler');
const {Errors} = require('../../utils/errors');
const {capabilityRequired} = require('../../middleware/capabilityCheck');

const router = express.Router();

router.use(capabilityRequired('attendance'));

/**
 * Create bulk attendance session
 * POST /api/attendance/bulk/sessions
 */
router.post('/bulk/sessions', authenticateToken, authorizeRoles('FACULTY', 'ADMIN'), asyncHandler(async (req, res) => {
  const {courseId, startDate, endDate, sessionMetadata = {}} = req.body;

  assert(courseId, Errors.invalidInput('Course ID is required'));
  assert(startDate, Errors.invalidInput('Start date is required'));
  assert(endDate, Errors.invalidInput('End date is required'));

  // Get total students in course
  const studentsResult = await pool.query(
    `SELECT COUNT(*) as count FROM course_enrollments WHERE course_id = $1`,
    [courseId]
  );

  const totalStudents = parseInt(studentsResult.rows[0].count);

  const result = await pool.query(
    `INSERT INTO bulk_attendance_sessions (
      marked_by, course_id, start_date, end_date, total_students,
      marked_count, status, session_metadata, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, 0, 'IN_PROGRESS', $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING *`,
    [req.user.id, courseId, startDate, endDate, totalStudents, JSON.stringify(sessionMetadata)]
  );

  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'BULK_ATTENDANCE_SESSION_CREATED',
    entityType: 'bulk_attendance_session',
    entityId: result.rows[0].id,
    details: {
      courseId,
      startDate,
      endDate,
      totalStudents,
    },
    ipAddress: getClientIp(req),
    role: req.user.role,
  });

  res.status(201).json({
    success: true,
    data: {
      id: result.rows[0].id,
      courseId,
      startDate,
      endDate,
      totalStudents,
      status: 'IN_PROGRESS',
    },
  });
}));

/**
 * Get bulk attendance sessions
 * GET /api/attendance/bulk/sessions
 */
router.get('/bulk/sessions', authenticateToken, asyncHandler(async (req, res) => {
  const {status, courseId, markedBy, page = 1, limit = 20} = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT bas.*,
           u.name as marked_by_name,
           c.name as course_name
    FROM bulk_attendance_sessions bas
    LEFT JOIN users u ON bas.marked_by = u.id
    LEFT JOIN courses c ON bas.course_id = c.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 0;

  if (status) {
    paramCount++;
    query += ` AND bas.status = $${paramCount}`;
    params.push(status);
  }

  if (courseId) {
    paramCount++;
    query += ` AND bas.course_id = $${paramCount}`;
    params.push(courseId);
  }

  if (markedBy) {
    paramCount++;
    query += ` AND bas.marked_by = $${paramCount}`;
    params.push(markedBy);
  }

  // Faculty can only see their own sessions
  if (req.user.role === 'FACULTY') {
    paramCount++;
    query += ` AND bas.marked_by = $${paramCount}`;
    params.push(req.user.id);
  }

  query += ` ORDER BY bas.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  res.json({
    success: true,
    data: {
      sessions: result.rows.map(row => ({
        id: row.id,
        markedBy: row.marked_by,
        markedByName: row.marked_by_name,
        courseId: row.course_id,
        courseName: row.course_name,
        startDate: row.start_date,
        endDate: row.end_date,
        totalStudents: row.total_students,
        markedCount: row.marked_count,
        status: row.status,
        createdAt: row.created_at,
      })),
    },
  });
}));

/**
 * Get bulk attendance logs for a session
 * GET /api/attendance/bulk/sessions/:sessionId/logs
 */
router.get('/bulk/sessions/:sessionId/logs', authenticateToken, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT bal.*, u.name as student_name, u.student_id
     FROM bulk_attendance_logs bal
     JOIN users u ON bal.student_id = u.id
     WHERE bal.session_id = $1
     ORDER BY bal.date, u.name`,
    [req.params.sessionId]
  );

  res.json({
    success: true,
    data: {
      logs: result.rows.map(row => ({
        id: row.id,
        studentId: row.student_id,
        studentName: row.student_name,
        date: row.date,
        status: row.status,
        markedAt: row.marked_at,
      })),
    },
  });
}));

/**
 * Get pending bulk submissions (admin dashboard)
 * GET /api/attendance/bulk/pending
 */
router.get('/bulk/pending', authenticateToken, authorizeRoles('ADMIN', 'HR_ADMIN'), asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT bas.*, u.name as marked_by_name, c.name as course_name
     FROM bulk_attendance_sessions bas
     LEFT JOIN users u ON bas.marked_by = u.id
     LEFT JOIN courses c ON bas.course_id = c.id
     WHERE bas.status IN ('IN_PROGRESS', 'PARTIAL')
     ORDER BY bas.created_at DESC`
  );

  res.json({
    success: true,
    data: {
      pendingSessions: result.rows.map(row => ({
        id: row.id,
        markedBy: row.marked_by,
        markedByName: row.marked_by_name,
        courseId: row.course_id,
        courseName: row.course_name,
        startDate: row.start_date,
        endDate: row.end_date,
        totalStudents: row.total_students,
        markedCount: row.marked_count,
        completionPercentage: row.total_students > 0 
          ? Math.round((row.marked_count / row.total_students) * 100) 
          : 0,
        status: row.status,
        createdAt: row.created_at,
      })),
    },
  });
}));

module.exports = router;
