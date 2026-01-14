/**
 * Community Routes (Polls + Voting + Discussions)
 * Official vs open discussions, moderation controls, decision transparency, abuse prevention
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

router.use(capabilityRequired('community'));

// ============================================
// DISCUSSIONS
// ============================================

/**
 * Get discussions
 * GET /api/community/discussions
 */
router.get('/discussions', authenticateToken, asyncHandler(async (req, res) => {
  const {isOfficial, status, category, page = 1, limit = 20} = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT d.*, u.name as author_name
    FROM discussions d
    LEFT JOIN users u ON d.author_id = u.id
    WHERE d.status != 'DELETED'
  `;
  const params = [];
  let paramCount = 0;

  if (isOfficial !== undefined) {
    paramCount++;
    query += ` AND d.is_official = $${paramCount}`;
    params.push(isOfficial === 'true');
  }

  if (status) {
    paramCount++;
    query += ` AND d.status = $${paramCount}`;
    params.push(status);
  } else {
    query += ` AND d.status = 'ACTIVE'`;
  }

  if (category) {
    paramCount++;
    query += ` AND d.category = $${paramCount}`;
    params.push(category);
  }

  query += ` ORDER BY d.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  res.json({
    success: true,
    data: {
      discussions: result.rows.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        authorId: row.author_id,
        authorName: row.author_name,
        isOfficial: row.is_official,
        category: row.category,
        status: row.status,
        moderationStatus: row.moderation_status,
        viewCount: row.view_count,
        replyCount: row.reply_count,
        createdAt: row.created_at,
      })),
    },
  });
}));

/**
 * Create discussion
 * POST /api/community/discussions
 */
router.post('/discussions', authenticateToken, asyncHandler(async (req, res) => {
  const {title, content, category, isOfficial = false, tags = []} = req.body;

  assert(title, Errors.invalidInput('Title is required'));
  assert(content, Errors.invalidInput('Content is required'));

  // Only admins can create official discussions
  if (isOfficial) {
    assert(
      ['ADMIN', 'HR_ADMIN', 'HR_MANAGER'].includes(req.user.role),
      Errors.permissionDenied('Only admins can create official discussions')
    );
  }

  const result = await pool.query(
    `INSERT INTO discussions (
      title, content, author_id, is_official, category, tags,
      status, moderation_status, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING *`,
    [title, content, req.user.id, isOfficial, category || null, tags]
  );

  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'DISCUSSION_CREATED',
    entityType: 'discussion',
    entityId: result.rows[0].id,
    details: {
      title,
      isOfficial,
      category,
    },
    ipAddress: getClientIp(req),
    role: req.user.role,
  });

  res.status(201).json({
    success: true,
    data: {
      id: result.rows[0].id,
      title,
      moderationStatus: 'PENDING',
    },
  });
}));

/**
 * Moderate discussion
 * PUT /api/community/discussions/:id/moderate
 */
router.put('/discussions/:id/moderate', authenticateToken, authorizeRoles('ADMIN', 'HR_ADMIN', 'HR_MANAGER'), asyncHandler(async (req, res) => {
  const {moderationStatus, moderationNotes} = req.body;

  assert(moderationStatus, Errors.invalidInput('Moderation status is required'));

  const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'];
  assert(validStatuses.includes(moderationStatus), Errors.invalidInput(`Invalid status: ${moderationStatus}`));

  const result = await pool.query(
    `UPDATE discussions
     SET moderation_status = $1,
         moderated_by = $2,
         moderated_at = CURRENT_TIMESTAMP,
         moderation_notes = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING *`,
    [moderationStatus, req.user.id, moderationNotes || null, req.params.id]
  );

  assert(result.rows.length > 0, Errors.notFound('Discussion'));

  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'DISCUSSION_MODERATED',
    entityType: 'discussion',
    entityId: req.params.id,
    details: {
      moderationStatus,
      moderationNotes,
    },
    ipAddress: getClientIp(req),
    role: req.user.role,
  });

  res.json({
    success: true,
    data: {
      id: result.rows[0].id,
      moderationStatus,
    },
  });
}));

// ============================================
// POLLS
// ============================================

/**
 * Get polls
 * GET /api/community/polls
 */
router.get('/polls', authenticateToken, asyncHandler(async (req, res) => {
  const {status, isOfficial, page = 1, limit = 20} = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT p.*, u.name as author_name,
           (SELECT COUNT(*) FROM poll_votes pv WHERE pv.poll_id = p.id) as total_votes
    FROM polls p
    LEFT JOIN users u ON p.author_id = u.id
    WHERE p.status != 'ARCHIVED'
  `;
  const params = [];
  let paramCount = 0;

  if (status) {
    paramCount++;
    query += ` AND p.status = $${paramCount}`;
    params.push(status);
  } else {
    query += ` AND p.status = 'ACTIVE'`;
  }

  if (isOfficial !== undefined) {
    paramCount++;
    query += ` AND p.is_official = $${paramCount}`;
    params.push(isOfficial === 'true');
  }

  query += ` ORDER BY p.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  // Get options for each poll
  for (const poll of result.rows) {
    const optionsResult = await pool.query(
      `SELECT * FROM poll_options WHERE poll_id = $1 ORDER BY display_order`,
      [poll.id]
    );
    poll.options = optionsResult.rows;
  }

  res.json({
    success: true,
    data: {
      polls: result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        authorId: row.author_id,
        authorName: row.author_name,
        isOfficial: row.is_official,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        totalVotes: parseInt(row.total_votes),
        options: row.options || [],
        createdAt: row.created_at,
      })),
    },
  });
}));

/**
 * Create poll
 * POST /api/community/polls
 */
router.post('/polls', authenticateToken, asyncHandler(async (req, res) => {
  const {
    title,
    description,
    options,
    isOfficial = false,
    allowAnonymous = false,
    allowMultipleChoices = false,
    endDate,
  } = req.body;

  assert(title, Errors.invalidInput('Title is required'));
  assert(options && Array.isArray(options) && options.length >= 2, Errors.invalidInput('At least 2 options required'));

  // Only admins can create official polls
  if (isOfficial) {
    assert(
      ['ADMIN', 'HR_ADMIN', 'HR_MANAGER'].includes(req.user.role),
      Errors.permissionDenied('Only admins can create official polls')
    );
  }

  const pollResult = await pool.query(
    `INSERT INTO polls (
      title, description, author_id, is_official, allow_anonymous,
      allow_multiple_choices, end_date, status, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING *`,
    [title, description || null, req.user.id, isOfficial, allowAnonymous, allowMultipleChoices, endDate || null]
  );

  const pollId = pollResult.rows[0].id;

  // Insert options
  for (let i = 0; i < options.length; i++) {
    await pool.query(
      `INSERT INTO poll_options (poll_id, option_text, display_order)
       VALUES ($1, $2, $3)`,
      [pollId, options[i], i]
    );
  }

  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'POLL_CREATED',
    entityType: 'poll',
    entityId: pollId,
    details: {
      title,
      isOfficial,
      optionCount: options.length,
    },
    ipAddress: getClientIp(req),
    role: req.user.role,
  });

  res.status(201).json({
    success: true,
    data: {
      id: pollId,
      title,
      optionsCount: options.length,
    },
  });
}));

/**
 * Vote on poll
 * POST /api/community/polls/:id/vote
 */
router.post('/polls/:id/vote', authenticateToken, asyncHandler(async (req, res) => {
  const {optionId, isAnonymous = false} = req.body;

  assert(optionId, Errors.invalidInput('Option ID is required'));

  // Check if poll is active
  const pollResult = await pool.query(
    `SELECT * FROM polls WHERE id = $1`,
    [req.params.id]
  );

  assert(pollResult.rows.length > 0, Errors.notFound('Poll'));
  const poll = pollResult.rows[0];

  assert(poll.status === 'ACTIVE', Errors.invalidInput('Poll is not active'));
  assert(
    !poll.end_date || new Date(poll.end_date) >= new Date(),
    Errors.invalidInput('Poll has ended')
  );

  // Check if already voted (unless anonymous or multiple choices allowed)
  if (!isAnonymous && !poll.allow_multiple_choices) {
    const existingVote = await pool.query(
      `SELECT * FROM poll_votes WHERE poll_id = $1 AND voter_id = $2`,
      [req.params.id, req.user.id]
    );

    assert(existingVote.rows.length === 0, Errors.invalidInput('Already voted on this poll'));
  }

  // Verify option belongs to poll
  const optionResult = await pool.query(
    `SELECT * FROM poll_options WHERE id = $1 AND poll_id = $2`,
    [optionId, req.params.id]
  );

  assert(optionResult.rows.length > 0, Errors.invalidInput('Invalid option'));

  // Record vote
  await pool.query(
    `INSERT INTO poll_votes (poll_id, option_id, voter_id, is_anonymous)
     VALUES ($1, $2, $3, $4)`,
    [req.params.id, optionId, isAnonymous ? null : req.user.id, isAnonymous]
  );

  // Update vote counts
  await pool.query(
    `UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = $1`,
    [optionId]
  );

  await pool.query(
    `UPDATE polls SET total_votes = total_votes + 1 WHERE id = $1`,
    [req.params.id]
  );

  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'POLL_VOTED',
    entityType: 'poll',
    entityId: req.params.id,
    details: {
      optionId,
      isAnonymous,
    },
    ipAddress: getClientIp(req),
    role: req.user.role,
  });

  res.json({
    success: true,
    message: 'Vote recorded',
  });
}));

module.exports = router;
