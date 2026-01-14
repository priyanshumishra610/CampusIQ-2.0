/**
 * Auto Substitution Allocation Engine Routes
 * Timetable-based, faculty load, leave data, fairness rules, override with justification
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

router.use(capabilityRequired('substitution'));

/**
 * Calculate substitution score for a faculty member
 * @param {string} facultyId - Faculty ID
 * @param {Date} date - Date of substitution
 * @param {Time} startTime - Start time
 * @param {Time} endTime - End time
 * @returns {Promise<Object>} Score and availability
 */
const calculateSubstitutionScore = async (facultyId, date, startTime, endTime) => {
  // Check if faculty has a class at that time
  const conflictResult = await pool.query(
    `SELECT COUNT(*) as count FROM timetables
     WHERE faculty_id = $1
     AND day_of_week = EXTRACT(DOW FROM $2::date)
     AND (
       (start_time <= $3 AND end_time > $3) OR
       (start_time < $4 AND end_time >= $4) OR
       (start_time >= $3 AND end_time <= $4)
     )`,
    [facultyId, date, startTime, endTime]
  );

  if (parseInt(conflictResult.rows[0].count) > 0) {
    return {available: false, score: 0, reason: 'Time conflict'};
  }

  // Check leave status
  const leaveResult = await pool.query(
    `SELECT COUNT(*) as count FROM leave_requests lr
     JOIN employees e ON lr.employee_id = e.id
     WHERE e.user_id = $1
     AND lr.status = 'APPROVED'
     AND $2::date BETWEEN lr.start_date AND lr.end_date`,
    [facultyId, date]
  );

  if (parseInt(leaveResult.rows[0].count) > 0) {
    return {available: false, score: 0, reason: 'On leave'};
  }

  // Count recent substitutions (fairness)
  const recentSubsResult = await pool.query(
    `SELECT COUNT(*) as count FROM substitution_requests
     WHERE substitute_faculty_id = $1
     AND date >= CURRENT_DATE - INTERVAL '30 days'`,
    [facultyId]
  );

  const recentSubs = parseInt(recentSubsResult.rows[0].count);
  const score = Math.max(0, 100 - (recentSubs * 10)); // Penalize frequent substitutions

  return {available: true, score, recentSubstitutions: recentSubs};
};

/**
 * Create substitution request
 * POST /api/substitution/requests
 */
router.post('/requests', authenticateToken, authorizeRoles('FACULTY', 'ADMIN', 'HR_ADMIN'), asyncHandler(async (req, res) => {
  const {
    originalFacultyId,
    courseId,
    timetableSlotId,
    date,
    startTime,
    endTime,
    reason,
    allocationMethod = 'AUTO',
    overrideJustification,
  } = req.body;

  assert(originalFacultyId, Errors.invalidInput('Original faculty ID is required'));
  assert(courseId, Errors.invalidInput('Course ID is required'));
  assert(date, Errors.invalidInput('Date is required'));
  assert(reason, Errors.invalidInput('Reason is required'));

  let substituteFacultyId = null;
  let autoAllocationScore = null;

  if (allocationMethod === 'AUTO') {
    // Find best substitute
    const facultyResult = await pool.query(
      `SELECT u.id, u.name FROM users u
       WHERE u.role = 'FACULTY'
       AND u.id != $1
       AND u.department = (SELECT department FROM users WHERE id = $1)`,
      [originalFacultyId]
    );

    let bestScore = -1;
    let bestFaculty = null;

    for (const faculty of facultyResult.rows) {
      const scoreResult = await calculateSubstitutionScore(faculty.id, date, startTime, endTime);
      if (scoreResult.available && scoreResult.score > bestScore) {
        bestScore = scoreResult.score;
        bestFaculty = faculty;
      }
    }

    if (bestFaculty) {
      substituteFacultyId = bestFaculty.id;
      autoAllocationScore = bestScore;
    }
  } else if (allocationMethod === 'OVERRIDE') {
    assert(overrideJustification, Errors.invalidInput('Override justification is required'));
    assert(req.body.substituteFacultyId, Errors.invalidInput('Substitute faculty ID is required for override'));
    substituteFacultyId = req.body.substituteFacultyId;
  } else {
    assert(req.body.substituteFacultyId, Errors.invalidInput('Substitute faculty ID is required for manual allocation'));
    substituteFacultyId = req.body.substituteFacultyId;
  }

  const result = await pool.query(
    `INSERT INTO substitution_requests (
      original_faculty_id, substitute_faculty_id, course_id, timetable_slot_id,
      date, start_time, end_time, reason, status, allocation_method,
      auto_allocation_score, override_justification, override_by, override_at,
      created_by, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING *`,
    [
      originalFacultyId,
      substituteFacultyId,
      courseId,
      timetableSlotId || null,
      date,
      startTime,
      endTime,
      reason,
      allocationMethod === 'AUTO' && substituteFacultyId ? 'AUTO_ALLOCATED' : 'PENDING',
      allocationMethod,
      autoAllocationScore,
      overrideJustification || null,
      allocationMethod === 'OVERRIDE' ? req.user.id : null,
      allocationMethod === 'OVERRIDE' ? new Date() : null,
      req.user.id,
    ]
  );

  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'SUBSTITUTION_REQUEST_CREATED',
    entityType: 'substitution_request',
    entityId: result.rows[0].id,
    details: {
      originalFacultyId,
      substituteFacultyId,
      allocationMethod,
      autoAllocationScore,
      overrideJustification,
    },
    ipAddress: getClientIp(req),
    role: req.user.role,
  });

  res.status(201).json({
    success: true,
    data: {
      id: result.rows[0].id,
      originalFacultyId,
      substituteFacultyId,
      status: result.rows[0].status,
      allocationMethod,
      autoAllocationScore,
    },
  });
}));

/**
 * Get substitution requests
 * GET /api/substitution/requests
 */
router.get('/requests', authenticateToken, asyncHandler(async (req, res) => {
  const {status, date, facultyId, page = 1, limit = 20} = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT sr.*,
           u1.name as original_faculty_name,
           u2.name as substitute_faculty_name,
           c.name as course_name
    FROM substitution_requests sr
    LEFT JOIN users u1 ON sr.original_faculty_id = u1.id
    LEFT JOIN users u2 ON sr.substitute_faculty_id = u2.id
    LEFT JOIN courses c ON sr.course_id = c.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 0;

  if (status) {
    paramCount++;
    query += ` AND sr.status = $${paramCount}`;
    params.push(status);
  }

  if (date) {
    paramCount++;
    query += ` AND sr.date = $${paramCount}`;
    params.push(date);
  }

  if (facultyId) {
    paramCount++;
    query += ` AND (sr.original_faculty_id = $${paramCount} OR sr.substitute_faculty_id = $${paramCount})`;
    params.push(facultyId);
  }

  // Faculty can only see their own requests
  if (req.user.role === 'FACULTY') {
    paramCount++;
    query += ` AND (sr.original_faculty_id = $${paramCount} OR sr.substitute_faculty_id = $${paramCount})`;
    params.push(req.user.id);
  }

  query += ` ORDER BY sr.date DESC, sr.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  res.json({
    success: true,
    data: {
      requests: result.rows.map(row => ({
        id: row.id,
        originalFacultyId: row.original_faculty_id,
        originalFacultyName: row.original_faculty_name,
        substituteFacultyId: row.substitute_faculty_id,
        substituteFacultyName: row.substitute_faculty_name,
        courseId: row.course_id,
        courseName: row.course_name,
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        reason: row.reason,
        status: row.status,
        allocationMethod: row.allocation_method,
        autoAllocationScore: row.auto_allocation_score,
        overrideJustification: row.override_justification,
        createdAt: row.created_at,
      })),
    },
  });
}));

module.exports = router;
