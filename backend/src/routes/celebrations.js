/**
 * Birthday + Celebration Engine Routes
 * Event scheduler, opt-in preferences, role-based visibility
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

router.use(capabilityRequired('celebrations'));

/**
 * Get upcoming celebrations
 * GET /api/celebrations
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const {startDate, endDate, eventType, page = 1, limit = 20} = req.query;
  const offset = (page - 1) * limit;

  const userRole = req.user.role;
  const userDept = req.user.department;

  let query = `
    SELECT ce.*,
           u.name as person_name,
           u.profile_image_url as person_image
    FROM celebration_events ce
    LEFT JOIN users u ON ce.person_id = u.id
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 0;

  if (startDate) {
    paramCount++;
    query += ` AND ce.event_date >= $${paramCount}`;
    params.push(startDate);
  } else {
    paramCount++;
    query += ` AND ce.event_date >= CURRENT_DATE`;
  }

  if (endDate) {
    paramCount++;
    query += ` AND ce.event_date <= $${paramCount}`;
    params.push(endDate);
  }

  if (eventType) {
    paramCount++;
    query += ` AND ce.event_type = $${paramCount}`;
    params.push(eventType);
  }

  // Apply visibility rules
  query += ` AND (
    ce.visibility_scope = 'PUBLIC' OR
    (ce.visibility_scope = 'ROLE_BASED' AND $${paramCount + 1} = ANY(ce.target_roles)) OR
    (ce.visibility_scope = 'DEPARTMENT' AND $${paramCount + 2} = ANY(ce.target_departments))
  )`;
  params.push(userRole, userDept);

  query += ` ORDER BY ce.event_date ASC LIMIT $${paramCount + 3} OFFSET $${paramCount + 4}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  // Check opt-in preferences
  const filteredEvents = [];
  for (const row of result.rows) {
    const prefResult = await pool.query(
      `SELECT opt_in FROM celebration_preferences
       WHERE user_id = $1 AND event_type = $2`,
      [row.person_id, row.event_type]
    );

    const optIn = prefResult.rows.length === 0 ? true : prefResult.rows[0].opt_in;
    if (optIn) {
      filteredEvents.push(row);
    }
  }

  res.json({
    success: true,
    data: {
      events: filteredEvents.map(row => ({
        id: row.id,
        eventType: row.event_type,
        personId: row.person_id,
        personName: row.person_name,
        personImage: row.person_image,
        eventDate: row.event_date,
        title: row.title,
        description: row.description,
        visibilityScope: row.visibility_scope,
        createdAt: row.created_at,
      })),
    },
  });
}));

/**
 * Create celebration event
 * POST /api/celebrations
 */
router.post('/', authenticateToken, authorizeRoles('ADMIN', 'HR_ADMIN', 'HR_MANAGER'), asyncHandler(async (req, res) => {
  const {
    eventType,
    personId,
    personType,
    eventDate,
    title,
    description,
    visibilityScope = 'ROLE_BASED',
    targetRoles = [],
    targetDepartments = [],
    optInRequired = false,
  } = req.body;

  assert(eventType, Errors.invalidInput('Event type is required'));
  assert(personId, Errors.invalidInput('Person ID is required'));
  assert(eventDate, Errors.invalidInput('Event date is required'));
  assert(title, Errors.invalidInput('Title is required'));

  const result = await pool.query(
    `INSERT INTO celebration_events (
      event_type, person_id, person_type, event_date, title, description,
      visibility_scope, target_roles, target_departments, opt_in_required,
      created_by, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING *`,
    [
      eventType,
      personId,
      personType,
      eventDate,
      title,
      description || null,
      visibilityScope,
      targetRoles,
      targetDepartments,
      optInRequired,
      req.user.id,
    ]
  );

  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'CELEBRATION_CREATED',
    entityType: 'celebration_event',
    entityId: result.rows[0].id,
    details: {
      eventType,
      personId,
      eventDate,
    },
    ipAddress: getClientIp(req),
    role: req.user.role,
  });

  res.status(201).json({
    success: true,
    data: {
      id: result.rows[0].id,
      eventType,
      personId,
      eventDate,
      title,
    },
  });
}));

/**
 * Update celebration preferences
 * PUT /api/celebrations/preferences
 */
router.put('/preferences', authenticateToken, asyncHandler(async (req, res) => {
  const {eventType, optIn, notificationPreferences = {}} = req.body;

  assert(eventType, Errors.invalidInput('Event type is required'));

  const result = await pool.query(
    `INSERT INTO celebration_preferences (user_id, event_type, opt_in, notification_preferences, updated_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id, event_type)
     DO UPDATE SET opt_in = EXCLUDED.opt_in,
                   notification_preferences = EXCLUDED.notification_preferences,
                   updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [req.user.id, eventType, optIn !== false, JSON.stringify(notificationPreferences)]
  );

  res.json({
    success: true,
    data: {
      eventType,
      optIn: result.rows[0].opt_in,
      notificationPreferences: result.rows[0].notification_preferences,
    },
  });
}));

module.exports = router;
