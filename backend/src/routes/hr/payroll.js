const express = require('express');
const pool = require('../../database/connection');
const {authenticateToken, authorizeRoles} = require('../../middleware/auth');
const {logAuditEvent, getClientIp} = require('../../services/auditLogger');
const {PayrollRules, StateTransitionRules} = require('../../services/businessRules');
const {validate} = require('../../middleware/validation');
const {asyncHandler, assert} = require('../../middleware/errorHandler');
const {Errors} = require('../../utils/errors');
const {
  getPayrollRecordsQuerySchema,
  payrollRecordIdParamSchema,
  generatePayrollSchema,
  updatePayrollRecordSchema,
  createSalaryStructureSchema,
} = require('../../validations/payrollSchemas');

const router = express.Router();

// All payroll routes require the payroll capability
const {capabilityRequired} = require('../../middleware/capabilityCheck');
router.use(capabilityRequired('payroll'));

/**
 * Get all payroll records
 * GET /api/hr/payroll
 */
router.get('/', authenticateToken, validate({query: getPayrollRecordsQuerySchema}), asyncHandler(async (req, res) => {
  const {employeeId, month, year, page = 1, limit = 20} = req.query;
    const offset = (page - 1) * limit;
    
    let query = `SELECT pr.*, e.first_name, e.last_name, e.employee_id, e.department
                 FROM payroll_records pr
                 JOIN employees e ON pr.employee_id = e.id
                 WHERE 1=1`;
    const params = [];
    let paramCount = 0;

    if (employeeId) {
      paramCount++;
      query += ` AND pr.employee_id = $${paramCount}`;
      params.push(employeeId);
    }

    if (month) {
      paramCount++;
      query += ` AND pr.month = $${paramCount}`;
      params.push(month);
    }

    if (year) {
      paramCount++;
      query += ` AND pr.year = $${paramCount}`;
      params.push(year);
    }

    query += ` ORDER BY pr.year DESC, pr.month DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: {
        records: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
        },
      },
    });
}));

/**
 * Get payroll record by ID
 * GET /api/hr/payroll/:id
 */
router.get('/:id', authenticateToken, validate({params: payrollRecordIdParamSchema}), asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT pr.*, e.first_name, e.last_name, e.employee_id, e.department
     FROM payroll_records pr
     JOIN employees e ON pr.employee_id = e.id
     WHERE pr.id = $1`,
    [req.params.id]
  );

  assert(result.rows.length > 0, Errors.notFound('Payroll record'));

  res.json({
    success: true,
    data: result.rows[0],
  });
}));

/**
 * Generate payroll
 * POST /api/hr/payroll/generate
 */
router.post('/generate', authenticateToken, authorizeRoles('HR_ADMIN', 'HR_MANAGER', 'ADMIN'), validate({body: generatePayrollSchema}), asyncHandler(async (req, res) => {
  const {employeeIds, month, year, payPeriodStart, payPeriodEnd} = req.body;

    const employees = employeeIds 
      ? await pool.query('SELECT * FROM employees WHERE id = ANY($1)', [employeeIds])
      : await pool.query('SELECT * FROM employees WHERE status = $1', ['ACTIVE']);

    const generatedRecords = [];

    for (const employee of employees.rows) {
      // Check if payroll already exists
      const existing = await pool.query(
        'SELECT id FROM payroll_records WHERE employee_id = $1 AND month = $2 AND year = $3',
        [employee.id, month, year]
      );

      if (existing.rows.length > 0) {
        continue; // Skip if already generated
      }

      // Get salary structure
      const salaryStructure = employee.salary_structure_id
        ? await pool.query('SELECT * FROM salary_structures WHERE id = $1', [employee.salary_structure_id])
        : null;

      const basicSalary = salaryStructure?.rows[0]?.components?.basic || 0;
      const allowances = salaryStructure?.rows[0]?.components?.allowances || {};
      const deductions = salaryStructure?.rows[0]?.components?.deductions || {};

      // Calculate attendance-based deductions
      const attendanceResult = await pool.query(
        `SELECT COUNT(*) as absent_days 
         FROM employee_attendance 
         WHERE employee_id = $1 AND date >= $2 AND date <= $3 AND status = 'ABSENT'`,
        [employee.id, payPeriodStart, payPeriodEnd]
      );

      const absentDays = parseInt(attendanceResult.rows[0]?.absent_days || 0);
      const dailyRate = basicSalary / 30;
      const leaveDeductions = absentDays * dailyRate;

      const result = await pool.query(
        `INSERT INTO payroll_records (
          employee_id, salary_structure_id, pay_period_start, pay_period_end,
          month, year, basic_salary, allowances, deductions, leave_deductions,
          created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          employee.id,
          employee.salary_structure_id || null,
          payPeriodStart,
          payPeriodEnd,
          month,
          year,
          basicSalary,
          JSON.stringify(allowances),
          JSON.stringify(deductions),
          leaveDeductions,
          req.user.id,
        ]
      );

      generatedRecords.push(result.rows[0]);
    }

    // Log audit event for payroll generation
    await logAuditEvent({
      userId: req.user.id,
      action: 'PAYROLL_GENERATED',
      entityType: 'payroll_batch',
      entityId: null,
      details: {
        month,
        year,
        employeeCount: generatedRecords.length,
        employeeIds: employeeIds || 'ALL_ACTIVE',
      },
      ipAddress: getClientIp(req),
      role: req.user.role,
    });

    res.status(201).json({
      success: true,
      data: {records: generatedRecords, count: generatedRecords.length},
    });
}));

/**
 * Update payroll record
 * PUT /api/hr/payroll/:id
 */
router.put('/:id', authenticateToken, authorizeRoles('HR_ADMIN', 'HR_MANAGER', 'ADMIN'), validate({
  params: payrollRecordIdParamSchema,
  body: updatePayrollRecordSchema,
}), asyncHandler(async (req, res) => {
  const {basicSalary, allowances, deductions, bonuses, incentives, overtimePay, paymentStatus, paymentDate} = req.body;

    const updates = [];
    const params = [];
    let paramCount = 0;

    if (basicSalary !== undefined) {
      paramCount++;
      updates.push(`basic_salary = $${paramCount}`);
      params.push(basicSalary);
    }
    if (allowances !== undefined) {
      paramCount++;
      updates.push(`allowances = $${paramCount}`);
      params.push(JSON.stringify(allowances));
    }
    if (deductions !== undefined) {
      paramCount++;
      updates.push(`deductions = $${paramCount}`);
      params.push(JSON.stringify(deductions));
    }
    if (bonuses !== undefined) {
      paramCount++;
      updates.push(`bonuses = $${paramCount}`);
      params.push(bonuses);
    }
    if (incentives !== undefined) {
      paramCount++;
      updates.push(`incentives = $${paramCount}`);
      params.push(incentives);
    }
    if (overtimePay !== undefined) {
      paramCount++;
      updates.push(`overtime_pay = $${paramCount}`);
      params.push(overtimePay);
    }
    if (paymentStatus !== undefined) {
      // Enforce state transition rules
      const oldRecordResult = await pool.query('SELECT payment_status FROM payroll_records WHERE id = $1', [req.params.id]);
      if (oldRecordResult.rows.length > 0) {
        const currentStatus = oldRecordResult.rows[0].payment_status || 'DRAFT';
        const transitionCheck = StateTransitionRules.canTransition('payroll', currentStatus, paymentStatus);
        assert(transitionCheck.allowed, Errors.invalidStateTransition(transitionCheck.reason));
      }
      
      paramCount++;
      updates.push(`payment_status = $${paramCount}`);
      params.push(paymentStatus);
    }
    if (paymentDate !== undefined) {
      paramCount++;
      updates.push(`payment_date = $${paramCount}`);
      params.push(paymentDate);
    }

    assert(updates.length > 0, Errors.invalidInput('No fields to update'));

    paramCount++;
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);

    // Get old record for audit
    const oldRecordResult = await pool.query('SELECT * FROM payroll_records WHERE id = $1', [req.params.id]);
    assert(oldRecordResult.rows.length > 0, Errors.notFound('Payroll record'));
    const oldRecord = oldRecordResult.rows[0];

    const result = await pool.query(
      `UPDATE payroll_records SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    assert(result.rows.length > 0, Errors.notFound('Payroll record'));

    // Log audit event
    await logAuditEvent({
      userId: req.user.id,
      action: 'PAYROLL_UPDATED',
      entityType: 'payroll_record',
      entityId: req.params.id,
      details: {
        employeeId: oldRecord.employee_id,
        month: oldRecord.month,
        year: oldRecord.year,
        updatedFields: Object.keys(req.body),
      },
      ipAddress: getClientIp(req),
      oldValue: JSON.stringify(oldRecord),
      newValue: JSON.stringify(result.rows[0]),
      role: req.user.role,
    });

    res.json({
      success: true,
      data: result.rows[0],
    });
}));

/**
 * Get salary structures
 * GET /api/hr/payroll/structures
 */
router.get('/structures', authenticateToken, asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM salary_structures WHERE is_active = TRUE ORDER BY name');
  res.json({
    success: true,
    data: result.rows,
  });
}));

/**
 * Create salary structure
 * POST /api/hr/payroll/structures
 */
router.post('/structures', authenticateToken, validate({body: createSalaryStructureSchema}), asyncHandler(async (req, res) => {
  const {name, description, components} = req.body;

  const result = await pool.query(
    `INSERT INTO salary_structures (name, description, components, created_at, updated_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING *`,
    [name, description || null, JSON.stringify(components)]
  );

  assert(result.rows.length > 0, Errors.internal('Failed to create salary structure'));

  res.status(201).json({
    success: true,
    data: result.rows[0],
  });
}));

module.exports = router;

