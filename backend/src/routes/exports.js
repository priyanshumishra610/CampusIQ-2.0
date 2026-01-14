/**
 * Export System Routes
 * Excel exports (attendance, leave, HR), master reports, role-based access, audit each export
 */

const express = require('express');
const pool = require('../../database/connection');
const {authenticateToken} = require('../../middleware/auth');
const {authorizeRoles} = require('../../middleware/auth');
const {logAuditEvent, getClientIp} = require('../../services/auditLogger');
const {asyncHandler, assert} = require('../../middleware/errorHandler');
const {Errors} = require('../../utils/errors');
const {capabilityRequired} = require('../../middleware/capabilityCheck');
const ExcelJS = require('exceljs');

const router = express.Router();

router.use(capabilityRequired('exports'));

/**
 * Create export job
 * POST /api/exports
 */
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const {exportType, format = 'EXCEL', filters = {}} = req.body;

  assert(exportType, Errors.invalidInput('Export type is required'));

  // Check permissions based on export type
  const userRole = req.user.role;
  const allowedRoles = {
    'ATTENDANCE': ['FACULTY', 'ADMIN', 'HR_ADMIN'],
    'LEAVE': ['HR_ADMIN', 'HR_MANAGER', 'HR_STAFF', 'ADMIN'],
    'HR': ['HR_ADMIN', 'HR_MANAGER', 'ADMIN'],
    'PAYROLL': ['HR_ADMIN', 'HR_MANAGER', 'ADMIN'],
    'STUDENT': ['FACULTY', 'ADMIN'],
    'FACULTY': ['ADMIN', 'HR_ADMIN'],
    'MASTER_REPORT': ['ADMIN'],
  };

  const allowed = allowedRoles[exportType] || [];
  assert(
    allowed.includes(userRole),
    Errors.permissionDenied(`You don't have permission to export ${exportType}`)
  );

  // Create export job
  const result = await pool.query(
    `INSERT INTO export_jobs (
      requested_by, export_type, format, filters, status,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING *`,
    [req.user.id, exportType, format, JSON.stringify(filters)]
  );

  const jobId = result.rows[0].id;

  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'EXPORT_REQUESTED',
    entityType: 'export_job',
    entityId: jobId,
    details: {
      exportType,
      format,
      filters,
    },
    ipAddress: getClientIp(req),
    role: req.user.role,
  });

  // Process export asynchronously (in production, use a job queue)
  processExportJob(jobId, exportType, format, filters).catch(err => {
    console.error(`Export job ${jobId} failed:`, err);
    pool.query(
      `UPDATE export_jobs SET status = 'FAILED', error_message = $1 WHERE id = $2`,
      [err.message, jobId]
    );
  });

  res.status(202).json({
    success: true,
    data: {
      jobId,
      status: 'PENDING',
      message: 'Export job created. Check status via GET /api/exports/:jobId',
    },
  });
}));

/**
 * Process export job (async)
 */
async function processExportJob(jobId, exportType, format, filters) {
  await pool.query(
    `UPDATE export_jobs SET status = 'PROCESSING', started_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [jobId]
  );

  let data = [];
  let headers = [];

  switch (exportType) {
    case 'ATTENDANCE':
      data = await getAttendanceData(filters);
      headers = ['Student ID', 'Student Name', 'Course', 'Date', 'Status'];
      break;
    case 'LEAVE':
      data = await getLeaveData(filters);
      headers = ['Employee ID', 'Employee Name', 'Leave Type', 'Start Date', 'End Date', 'Status'];
      break;
    case 'HR':
      data = await getHRData(filters);
      headers = ['Employee ID', 'Name', 'Department', 'Designation', 'Status'];
      break;
    default:
      throw new Error(`Unsupported export type: ${exportType}`);
  }

  let fileUrl = null;
  let fileSize = 0;

  if (format === 'EXCEL') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Export');

    worksheet.addRow(headers);
    data.forEach(row => worksheet.addRow(row));

    // Save to buffer (in production, save to S3/storage)
    const buffer = await workbook.xlsx.writeBuffer();
    fileSize = buffer.length;
    fileUrl = `/exports/${jobId}.xlsx`; // In production, upload to storage
  }

  await pool.query(
    `UPDATE export_jobs 
     SET status = 'COMPLETED',
         file_url = $1,
         file_size_bytes = $2,
         record_count = $3,
         completed_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [fileUrl, fileSize, data.length, jobId]
  );
}

async function getAttendanceData(filters) {
  let query = `
    SELECT u.student_id, u.name, c.name as course_name, a.date, a.status
    FROM attendance a
    JOIN users u ON a.student_id = u.id
    JOIN courses c ON a.course_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.startDate) {
    query += ` AND a.date >= $${params.length + 1}`;
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    query += ` AND a.date <= $${params.length + 1}`;
    params.push(filters.endDate);
  }

  if (filters.courseId) {
    query += ` AND a.course_id = $${params.length + 1}`;
    params.push(filters.courseId);
  }

  const result = await pool.query(query, params);
  return result.rows.map(row => [
    row.student_id,
    row.name,
    row.course_name,
    row.date,
    row.status,
  ]);
}

async function getLeaveData(filters) {
  let query = `
    SELECT e.employee_id, e.first_name || ' ' || e.last_name as name,
           lr.leave_type, lr.start_date, lr.end_date, lr.status
    FROM leave_requests lr
    JOIN employees e ON lr.employee_id = e.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.startDate) {
    query += ` AND lr.start_date >= $${params.length + 1}`;
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    query += ` AND lr.end_date <= $${params.length + 1}`;
    params.push(filters.endDate);
  }

  const result = await pool.query(query, params);
  return result.rows.map(row => [
    row.employee_id,
    row.name,
    row.leave_type,
    row.start_date,
    row.end_date,
    row.status,
  ]);
}

async function getHRData(filters) {
  let query = `
    SELECT employee_id, first_name || ' ' || last_name as name,
           department, designation, status
    FROM employees
    WHERE 1=1
  `;
  const params = [];

  if (filters.department) {
    query += ` AND department = $${params.length + 1}`;
    params.push(filters.department);
  }

  const result = await pool.query(query, params);
  return result.rows.map(row => [
    row.employee_id,
    row.name,
    row.department,
    row.designation,
    row.status,
  ]);
}

/**
 * Get export job status
 * GET /api/exports/:jobId
 */
router.get('/:jobId', authenticateToken, asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM export_jobs WHERE id = $1`,
    [req.params.jobId]
  );

  assert(result.rows.length > 0, Errors.notFound('Export job'));

  const job = result.rows[0];

  // Check permissions
  assert(
    job.requested_by === req.user.id || ['ADMIN', 'HR_ADMIN'].includes(req.user.role),
    Errors.permissionDenied('You can only view your own export jobs')
  );

  res.json({
    success: true,
    data: {
      id: job.id,
      exportType: job.export_type,
      format: job.format,
      status: job.status,
      fileUrl: job.file_url,
      fileSizeBytes: job.file_size_bytes,
      recordCount: job.record_count,
      errorMessage: job.error_message,
      createdAt: job.created_at,
      completedAt: job.completed_at,
    },
  });
}));

/**
 * Get user's export jobs
 * GET /api/exports
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const {status, page = 1, limit = 20} = req.query;
  const offset = (page - 1) * limit;

  let query = `SELECT * FROM export_jobs WHERE requested_by = $1`;
  const params = [req.user.id];
  let paramCount = 1;

  if (status) {
    paramCount++;
    query += ` AND status = $${paramCount}`;
    params.push(status);
  }

  query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  res.json({
    success: true,
    data: {
      jobs: result.rows.map(row => ({
        id: row.id,
        exportType: row.export_type,
        format: row.format,
        status: row.status,
        fileUrl: row.file_url,
        recordCount: row.record_count,
        createdAt: row.created_at,
        completedAt: row.completed_at,
      })),
    },
  });
}));

module.exports = router;
