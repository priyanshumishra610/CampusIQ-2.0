/**
 * 99% Staff Enrollment Routes
 * Completion tracking, missing document detection, compliance flags, HR-only overrides
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

// All routes require HR capability
router.use(capabilityRequired('hr'));
router.use(authorizeRoles('HR_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ADMIN'));

/**
 * Calculate enrollment percentage for an employee
 * @param {string} employeeId - Employee ID
 * @returns {Promise<number>} Enrollment percentage (0-100)
 */
const calculateEnrollmentPercentage = async (employeeId) => {
  const empResult = await pool.query(
    'SELECT documents, emergency_contact, date_of_joining, department, designation FROM employees WHERE id = $1',
    [employeeId]
  );

  if (empResult.rows.length === 0) return 0;

  const employee = empResult.rows[0];
  let completedFields = 0;
  const totalFields = 10; // Adjust based on required fields

  // Check required fields
  if (employee.documents && Array.isArray(employee.documents) && employee.documents.length > 0) completedFields += 3;
  if (employee.emergency_contact) completedFields += 1;
  if (employee.date_of_joining) completedFields += 1;
  if (employee.department) completedFields += 1;
  if (employee.designation) completedFields += 1;
  // Add more field checks as needed

  return Math.round((completedFields / totalFields) * 100);
};

/**
 * Get enrollment status for all employees
 * GET /api/hr/staff-enrollment
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const {department, completionStatus, minPercentage, page = 1, limit = 50} = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT 
      e.id as employee_id,
      e.employee_id as employee_code,
      e.first_name,
      e.last_name,
      e.department,
      e.status as employee_status,
      set.enrollment_percentage,
      set.completion_status,
      set.missing_documents,
      set.compliance_flags,
      set.hr_override,
      set.last_reviewed_at
    FROM employees e
    LEFT JOIN staff_enrollment_tracking set ON e.id = set.employee_id
    WHERE e.status IN ('ACTIVE', 'ONBOARDING')
  `;
  const params = [];
  let paramCount = 0;

  if (department) {
    paramCount++;
    query += ` AND e.department = $${paramCount}`;
    params.push(department);
  }

  if (completionStatus) {
    paramCount++;
    query += ` AND set.completion_status = $${paramCount}`;
    params.push(completionStatus);
  }

  if (minPercentage) {
    paramCount++;
    query += ` AND COALESCE(set.enrollment_percentage, 0) >= $${paramCount}`;
    params.push(parseFloat(minPercentage));
  }

  query += ` ORDER BY COALESCE(set.enrollment_percentage, 0) ASC, e.first_name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  // Calculate percentages for employees without tracking
  for (const row of result.rows) {
    if (!row.enrollment_percentage) {
      const percentage = await calculateEnrollmentPercentage(row.employee_id);
      row.enrollment_percentage = percentage;
    }
  }

  // Get total count
  let countQuery = `
    SELECT COUNT(*) FROM employees e
    LEFT JOIN staff_enrollment_tracking set ON e.id = set.employee_id
    WHERE e.status IN ('ACTIVE', 'ONBOARDING')
  `;
  const countParams = [];
  let countParamCount = 0;

  if (department) {
    countParamCount++;
    countQuery += ` AND e.department = $${countParamCount}`;
    countParams.push(department);
  }

  if (completionStatus) {
    countParamCount++;
    countQuery += ` AND set.completion_status = $${countParamCount}`;
    countParams.push(completionStatus);
  }

  if (minPercentage) {
    countParamCount++;
    countQuery += ` AND COALESCE(set.enrollment_percentage, 0) >= $${countParamCount}`;
    countParams.push(parseFloat(minPercentage));
  }

  const countResult = await pool.query(countQuery, countParams);

  res.json({
    success: true,
    data: {
      employees: result.rows.map(row => ({
        employeeId: row.employee_id,
        employeeCode: row.employee_code,
        name: `${row.first_name} ${row.last_name}`,
        department: row.department,
        enrollmentPercentage: row.enrollment_percentage || 0,
        completionStatus: row.completion_status || 'INCOMPLETE',
        missingDocuments: row.missing_documents || [],
        complianceFlags: row.compliance_flags || [],
        hrOverride: row.hr_override || false,
        lastReviewedAt: row.last_reviewed_at,
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
 * Update enrollment tracking for an employee
 * POST /api/hr/staff-enrollment/:employeeId/update
 */
router.post('/:employeeId/update', authenticateToken, asyncHandler(async (req, res) => {
  const {missingDocuments = [], complianceFlags = []} = req.body;

  const percentage = await calculateEnrollmentPercentage(req.params.employeeId);

  let completionStatus = 'INCOMPLETE';
  if (percentage >= 99) {
    completionStatus = 'COMPLETE';
  } else if (percentage >= 80) {
    completionStatus = 'PENDING_REVIEW';
  } else if (complianceFlags.length > 0) {
    completionStatus = 'COMPLIANCE_FLAGGED';
  }

  const result = await pool.query(
    `INSERT INTO staff_enrollment_tracking (
      employee_id, enrollment_percentage, completion_status,
      missing_documents, compliance_flags, last_reviewed_by, last_reviewed_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (employee_id)
    DO UPDATE SET
      enrollment_percentage = EXCLUDED.enrollment_percentage,
      completion_status = EXCLUDED.completion_status,
      missing_documents = EXCLUDED.missing_documents,
      compliance_flags = EXCLUDED.compliance_flags,
      last_reviewed_by = EXCLUDED.last_reviewed_by,
      last_reviewed_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *`,
    [
      req.params.employeeId,
      percentage,
      completionStatus,
      missingDocuments,
      complianceFlags,
      req.user.id,
    ]
  );

  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'STAFF_ENROLLMENT_UPDATED',
    entityType: 'staff_enrollment',
    entityId: req.params.employeeId,
    details: {
      enrollmentPercentage: percentage,
      completionStatus,
      missingDocuments,
      complianceFlags,
    },
    ipAddress: getClientIp(req),
    role: req.user.role,
  });

  res.json({
    success: true,
    data: {
      employeeId: req.params.employeeId,
      enrollmentPercentage: percentage,
      completionStatus,
      missingDocuments,
      complianceFlags,
      updatedAt: result.rows[0].updated_at,
    },
  });
}));

/**
 * HR override for enrollment status
 * POST /api/hr/staff-enrollment/:employeeId/override
 */
router.post('/:employeeId/override', authenticateToken, authorizeRoles('HR_ADMIN', 'HR_MANAGER', 'ADMIN'), asyncHandler(async (req, res) => {
  const {reason, completionStatus} = req.body;

  assert(reason, Errors.invalidInput('Override reason is required'));

  await pool.query(
    `UPDATE staff_enrollment_tracking
     SET hr_override = TRUE,
         hr_override_reason = $1,
         hr_override_by = $2,
         hr_override_at = CURRENT_TIMESTAMP,
         completion_status = COALESCE($3, completion_status),
         updated_at = CURRENT_TIMESTAMP
     WHERE employee_id = $4`,
    [reason, req.user.id, completionStatus || null, req.params.employeeId]
  );

  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'STAFF_ENROLLMENT_OVERRIDE',
    entityType: 'staff_enrollment',
    entityId: req.params.employeeId,
    details: {
      reason,
      completionStatus,
    },
    ipAddress: getClientIp(req),
    role: req.user.role,
  });

  res.json({
    success: true,
    data: {
      employeeId: req.params.employeeId,
      hrOverride: true,
      overrideReason: reason,
      overriddenAt: new Date().toISOString(),
    },
  });
}));

/**
 * Get enrollment statistics
 * GET /api/hr/staff-enrollment/statistics
 */
router.get('/statistics', authenticateToken, asyncHandler(async (req, res) => {
  const totalResult = await pool.query(
    `SELECT COUNT(*) as total FROM employees WHERE status IN ('ACTIVE', 'ONBOARDING')`
  );

  const completeResult = await pool.query(
    `SELECT COUNT(*) as count FROM staff_enrollment_tracking WHERE completion_status = 'COMPLETE'`
  );

  const incompleteResult = await pool.query(
    `SELECT COUNT(*) as count FROM staff_enrollment_tracking WHERE completion_status = 'INCOMPLETE'`
  );

  const flaggedResult = await pool.query(
    `SELECT COUNT(*) as count FROM staff_enrollment_tracking WHERE completion_status = 'COMPLIANCE_FLAGGED'`
  );

  const avgPercentageResult = await pool.query(
    `SELECT AVG(enrollment_percentage) as avg FROM staff_enrollment_tracking`
  );

  res.json({
    success: true,
    data: {
      totalEmployees: parseInt(totalResult.rows[0].total),
      complete: parseInt(completeResult.rows[0].count),
      incomplete: parseInt(incompleteResult.rows[0].count),
      complianceFlagged: parseInt(flaggedResult.rows[0].count),
      averageEnrollmentPercentage: parseFloat(avgPercentageResult.rows[0].avg || 0),
    },
  });
}));

module.exports = router;
