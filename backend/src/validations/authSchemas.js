/**
 * Validation Schemas for Auth Routes
 * 
 * Defines Zod schemas for request validation on authentication endpoints.
 */

const { z } = require('zod');
const { CommonSchemas } = require('../middleware/validation');

/**
 * Register request body schema
 */
const registerSchema = z.object({
  email: CommonSchemas.email,
  password: CommonSchemas.password,
  name: z.string().min(1, 'Name is required').max(255),
  role: z.enum(['STUDENT', 'FACULTY', 'ADMIN', 'HR_ADMIN', 'HR_MANAGER', 'HR_STAFF'], {
    errorMap: () => ({ message: 'Invalid role' }),
  }),
  adminRole: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
});

/**
 * Login request body schema
 */
const loginSchema = z.object({
  email: CommonSchemas.email,
  password: z.string().min(1, 'Password is required'),
});

module.exports = {
  registerSchema,
  loginSchema,
};
