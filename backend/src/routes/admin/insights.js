/**
 * Admin System Insights API
 * Provides system-wide visibility for administrators
 */

const express = require('express');
const pool = require('../database/connection');
const {authenticateToken, authorizeRoles} = require('../middleware/auth');

const router = express.Router();

// All routes require ADMIN role
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN'));

// Get system activity summary
router.get('/activity', async (req, res) => {
  try {
    const {days = 7} = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get recent critical actions from audit logs
    const auditResult = await pool.query(
      `SELECT action, COUNT(*) as count, MAX(created_at) as last_occurrence
       FROM audit_logs
       WHERE created_at >= $1
       GROUP BY action
       ORDER BY count DESC
       LIMIT 20`,
      [startDate]
    );

    // Get user activity
    const userActivityResult = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as active_users
       FROM audit_logs
       WHERE created_at >= $1`,
      [startDate]
    );

    // Get recent leave approvals/rejections
    const leaveActivityResult = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'APPROVED') as approved,
         COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected,
         COUNT(*) FILTER (WHERE status = 'PENDING') as pending
       FROM leave_requests
       WHERE created_at >= $1`,
      [startDate]
    );

    // Get payroll generation activity
    const payrollActivityResult = await pool.query(
      `SELECT COUNT(*) as generated_count
       FROM payroll_records
       WHERE created_at >= $1`,
      [startDate]
    );

    res.json({
      period: {
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        days: parseInt(days),
      },
      activity: {
        topActions: auditResult.rows,
        activeUsers: parseInt(userActivityResult.rows[0]?.active_users || 0),
        leaveRequests: {
          approved: parseInt(leaveActivityResult.rows[0]?.approved || 0),
          rejected: parseInt(leaveActivityResult.rows[0]?.rejected || 0),
          pending: parseInt(leaveActivityResult.rows[0]?.pending || 0),
        },
        payrollGenerated: parseInt(payrollActivityResult.rows[0]?.generated_count || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching system activity:', error);
    res.status(500).json({error: 'Failed to fetch system activity'});
  }
});

// Get recent critical actions
router.get('/critical-actions', async (req, res) => {
  try {
    const {limit = 50} = req.query;
    
    const result = await pool.query(
      `SELECT al.*, u.name as user_name, u.role as user_role
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.action IN (
         'EMPLOYEE_DELETED',
         'PAYROLL_GENERATED',
         'LEAVE_APPROVED',
         'LEAVE_REJECTED',
         'EMPLOYEE_CREATED',
         'EMPLOYEE_UPDATED',
         'PAYROLL_UPDATED'
       )
       ORDER BY al.created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({
      actions: result.rows.map(row => ({
        id: row.id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        user: {
          id: row.user_id,
          name: row.user_name,
          role: row.user_role,
        },
        details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
        ipAddress: row.ip_address,
        timestamp: row.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching critical actions:', error);
    res.status(500).json({error: 'Failed to fetch critical actions'});
  }
});

// Get feature health indicators
router.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    const dbCheck = await pool.query('SELECT NOW() as timestamp');
    const dbHealthy = dbCheck.rows.length > 0;

    // Check recent audit log activity (should have entries in last hour)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    const auditCheck = await pool.query(
      'SELECT COUNT(*) as count FROM audit_logs WHERE created_at >= $1',
      [oneHourAgo]
    );
    const auditHealthy = parseInt(auditCheck.rows[0]?.count || 0) > 0;

    // Get system statistics
    const statsResult = await pool.query(
      `SELECT 
         (SELECT COUNT(*) FROM users) as total_users,
         (SELECT COUNT(*) FROM employees WHERE status = 'ACTIVE') as active_employees,
         (SELECT COUNT(*) FROM leave_requests WHERE status = 'PENDING') as pending_leaves,
         (SELECT COUNT(*) FROM payroll_records WHERE payment_status = 'GENERATED') as pending_payrolls`
    );

    const stats = statsResult.rows[0];

    res.json({
      status: dbHealthy && auditHealthy ? 'HEALTHY' : 'DEGRADED',
      checks: {
        database: {
          healthy: dbHealthy,
          timestamp: dbCheck.rows[0]?.timestamp,
        },
        auditLogging: {
          healthy: auditHealthy,
          recentEntries: parseInt(auditCheck.rows[0]?.count || 0),
        },
      },
      statistics: {
        totalUsers: parseInt(stats?.total_users || 0),
        activeEmployees: parseInt(stats?.active_employees || 0),
        pendingLeaveRequests: parseInt(stats?.pending_leaves || 0),
        pendingPayrollRecords: parseInt(stats?.pending_payrolls || 0),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json({
      status: 'ERROR',
      error: 'Failed to check system health',
      message: error.message,
    });
  }
});

module.exports = router;
