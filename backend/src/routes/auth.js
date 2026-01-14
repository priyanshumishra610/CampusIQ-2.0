const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database/connection');
const {authenticateToken} = require('../middleware/auth');
const {validate} = require('../middleware/validation');
const {asyncHandler, assert} = require('../middleware/errorHandler');
const {Errors} = require('../utils/errors');
const {registerSchema, loginSchema} = require('../validations/authSchemas');
const {isSuperAdmin} = require('../services/roleService');
const panelService = require('../services/panelService');

const router = express.Router();

/**
 * Register new user
 * POST /api/auth/register
 */
router.post('/register', validate({body: registerSchema}), asyncHandler(async (req, res) => {
  const {email, password, name, role, adminRole, department} = req.body;

  // Check if user exists
  const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  assert(existingUser.rows.length === 0, Errors.invalidInput('User with this email already exists'));

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Insert user
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name, role, admin_role, department, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING id, email, name, role, admin_role, department, created_at`,
    [email, passwordHash, name, role, adminRole || null, department || null]
  );

  const user = result.rows[0];
  assert(user, Errors.internal('Failed to create user'));

  // Generate token
  const token = jwt.sign(
    {userId: user.id, email: user.email, role: user.role},
    process.env.JWT_SECRET,
    {expiresIn: process.env.JWT_EXPIRES_IN || '7d'}
  );

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        adminRole: user.admin_role,
        department: user.department,
      },
      token,
    },
  });
}));

/**
 * Login user
 * POST /api/auth/login
 */
router.post('/login', validate({body: loginSchema}), asyncHandler(async (req, res) => {
  const {email, password} = req.body;

  // Find user
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  assert(result.rows.length > 0, Errors.authRequired('Invalid credentials'));

  const user = result.rows[0];

  // Verify password
  const validPassword = await bcrypt.compare(password, user.password_hash);
  assert(validPassword, Errors.authRequired('Invalid credentials'));

  // Generate token
  const token = jwt.sign(
    {userId: user.id, email: user.email, role: user.role},
    process.env.JWT_SECRET,
    {expiresIn: process.env.JWT_EXPIRES_IN || '7d'}
  );

  // Check if user is super admin
  const superAdmin = await isSuperAdmin(user.id);

  // Get user panels
  const userPanels = await panelService.getUserPanels(user.id);
  const defaultPanel = await panelService.getDefaultPanel(user.id);

  // Return user data (excluding password)
  const {password_hash, ...userData} = user;
  
  res.json({
    success: true,
    data: {
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        adminRole: userData.admin_role,
        isSuperAdmin: superAdmin,
        department: userData.department,
        campusId: userData.campus_id,
        campusName: userData.campus_name,
        studentId: userData.student_id,
        facultyId: userData.faculty_id,
        enrollmentNumber: userData.enrollment_number,
        employeeId: userData.employee_id,
        phoneNumber: userData.phone_number,
        profileImageUrl: userData.profile_image_url,
        fcmTokens: userData.fcm_tokens || [],
        createdAt: userData.created_at,
        updatedAt: userData.updated_at,
        panels: userPanels.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          themeConfig: p.theme_config,
          navigationConfig: p.navigation_config,
          isDefault: p.is_default,
        })),
        defaultPanel: defaultPanel ? {
          id: defaultPanel.id,
          name: defaultPanel.name,
          themeConfig: defaultPanel.theme_config,
          navigationConfig: defaultPanel.navigation_config,
        } : null,
      },
      token,
    },
  });
}));

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  assert(result.rows.length > 0, Errors.notFound('User'));

  const user = result.rows[0];
  const {password_hash, ...userData} = user;
  
  // Get user panels
  const userPanels = await panelService.getUserPanels(user.id);
  const defaultPanel = await panelService.getDefaultPanel(user.id);
  
  res.json({
    success: true,
    data: {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      adminRole: userData.admin_role,
      department: userData.department,
      campusId: userData.campus_id,
      campusName: userData.campus_name,
      studentId: userData.student_id,
      facultyId: userData.faculty_id,
      enrollmentNumber: userData.enrollment_number,
      employeeId: userData.employee_id,
      phoneNumber: userData.phone_number,
      profileImageUrl: userData.profile_image_url,
      fcmTokens: userData.fcm_tokens || [],
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
      panels: userPanels.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        themeConfig: p.theme_config,
        navigationConfig: p.navigation_config,
        isDefault: p.is_default,
      })),
      defaultPanel: defaultPanel ? {
        id: defaultPanel.id,
        name: defaultPanel.name,
        themeConfig: defaultPanel.theme_config,
        navigationConfig: defaultPanel.navigation_config,
      } : null,
    },
  });
}));

/**
 * Logout (client-side token removal)
 * POST /api/auth/logout
 */
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {message: 'Logged out successfully'},
  });
}));

module.exports = router;

