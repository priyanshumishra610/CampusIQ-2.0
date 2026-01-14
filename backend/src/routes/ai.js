const express = require('express');
const pool = require('../database/connection');
const {GoogleGenerativeAI} = require('@google/generative-ai');
const {authenticateToken} = require('../middleware/auth');
const {asyncHandler} = require('../middleware/errorHandler');
const {capabilityChecked, addCapabilityStatusToResponse} = require('../middleware/capabilityCheck');

const router = express.Router();

// All AI routes require authentication
router.use(authenticateToken);

// AI routes check capability status (degraded mode allowed)
router.use(capabilityChecked('academic_intelligence'));

// Initialize Gemini
const genAI = process.env.GOOGLE_GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
  : null;
const model = genAI ? genAI.getGenerativeModel({model: 'gemini-pro'}) : null;

/**
 * Chat with AI
 * POST /api/ai/chat
 */
router.post('/chat', asyncHandler(async (req, res) => {
  const {message, conversationHistory} = req.body;
  const userId = req.user.id;

  if (!model) {
    const {Errors} = require('../utils/errors');
    throw Errors.featureDisabled('AI service not configured');
  }

  // Build conversation context
  const systemPrompt = `You are CampusIQ, an intelligent assistant for a college campus management system. 
You help students, faculty, and staff with academic queries, campus information, and administrative tasks.
Be helpful, concise, and professional.`;

  let fullPrompt = systemPrompt + '\n\n';
  if (conversationHistory && conversationHistory.length > 0) {
    conversationHistory.forEach((msg) => {
      fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    });
  }
  fullPrompt += `User: ${message}\nAssistant:`;

  const result = await model.generateContent(fullPrompt);
  const response = result.response.text();

  // Save to chat logs
  await pool.query(
    `INSERT INTO ai_chat_logs (user_id, message, response, model, created_at)
     VALUES ($1, $2, $3, 'gemini', CURRENT_TIMESTAMP)`,
    [userId, message, response]
  );

  const responseData = {
    response,
    model: 'gemini',
  };

  res.json({
    success: true,
    data: addCapabilityStatusToResponse(req, responseData),
  });
}));

/**
 * Get chat history
 * GET /api/ai/chat-history
 */
router.get('/chat-history', asyncHandler(async (req, res) => {
  const {limit = 50} = req.query;
  const result = await pool.query(
    `SELECT message, response, created_at FROM ai_chat_logs 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [req.user.id, limit]
  );

  const history = result.rows.map(row => ({
    message: row.message,
    response: row.response,
    createdAt: row.created_at,
  }));

  res.json({
    success: true,
    data: addCapabilityStatusToResponse(req, history),
  });
}));

module.exports = router;

