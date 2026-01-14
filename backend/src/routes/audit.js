/**
 * Audit Logs API
 * Provides access to audit logs with proper permission checks
 */

const express = require('express');
const pool = require('../database/connection');
const {authenticateToken, authorizeRoles} = require('../middleware/auth');

const router = express.Router();

// All audit routes require the audit capability
const {capabilityRequired} = require('../middleware/capabilityCheck');
router.use(capabilityRequired('audit'));

// Get audit logs with filtering
router.get('/', authenticateToken, authorizeRoles('ADMIN', 'HR_ADMIN', 'HR_MANAGER'), async (req, res) => {
  try {
    const {
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    if (userId) {
      paramCount++;
      query += ` AND user_id = $${paramCount}`;
      params.push(userId);
    }
    
    if (action) {
      paramCount++;
      query += ` AND action = $${paramCount}`;
      params.push(action);
    }
    
    if (entityType) {
      paramCount++;
      query += ` AND entity_type = $${paramCount}`;
      params.push(entityType);
    }
    
    if (entityId) {
      paramCount++;
      query += ` AND entity_id = $${paramCount}`;
      params.push(entityId);
    }
    
    if (startDate) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      params.push(startDate);
    }
    
    if (endDate) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      params.push(endDate);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM audit_logs WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;
    
    if (userId) {
      countParamCount++;
      countQuery += ` AND user_id = $${countParamCount}`;
      countParams.push(userId);
    }
    if (action) {
      countParamCount++;
      countQuery += ` AND action = $${countParamCount}`;
      countParams.push(action);
    }
    if (entityType) {
      countParamCount++;
      countQuery += ` AND entity_type = $${countParamCount}`;
      countParams.push(entityType);
    }
    if (entityId) {
      countParamCount++;
      countQuery += ` AND entity_id = $${countParamCount}`;
      countParams.push(entityId);
    }
    if (startDate) {
      countParamCount++;
      countQuery += ` AND created_at >= $${countParamCount}`;
      countParams.push(startDate);
    }
    if (endDate) {
      countParamCount++;
      countQuery += ` AND created_at <= $${countParamCount}`;
      countParams.push(endDate);
    }
    
    const [logsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);
    
    res.json({
      logs: logsResult.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        details: row.details,
        ipAddress: row.ip_address,
        createdAt: row.created_at,
      })),
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({error: 'Failed to fetch audit logs'});
  }
});

// Get audit log by ID
router.get('/:id', authenticateToken, authorizeRoles('ADMIN', 'HR_ADMIN', 'HR_MANAGER'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit_logs WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({error: 'Audit log not found'});
    }
    
    const row = result.rows[0];
    res.json({
      id: row.id,
      userId: row.user_id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      details: row.details,
      ipAddress: row.ip_address,
      createdAt: row.created_at,
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({error: 'Failed to fetch audit log'});
  }
});

module.exports = router;
