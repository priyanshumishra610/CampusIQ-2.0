/**
 * Request Validation Middleware
 * 
 * Validates request body, query params, and route params using Zod schemas.
 * Rejects invalid requests BEFORE business logic executes.
 */

const { z } = require('zod');
const { Errors } = require('../utils/errors');

/**
 * Validation middleware factory
 * 
 * Creates Express middleware that validates request data against Zod schemas.
 * 
 * @param {Object} schemas - Object with optional 'body', 'query', 'params' Zod schemas
 * @returns {Function} Express middleware
 * 
 * Usage:
 *   const validate = require('./middleware/validation');
 *   router.post('/route', validate({
 *     body: z.object({ email: z.string().email(), password: z.string().min(8) })
 *   }), handler);
 */
const validate = (schemas) => {
  return async (req, res, next) => {
    try {
      // Validate body if schema provided
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      // Validate query params if schema provided
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }

      // Validate route params if schema provided
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }

      next();
    } catch (error) {
      // Zod validation errors
      if (error instanceof z.ZodError) {
        const details = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        return next(Errors.invalidInput('Validation failed', details));
      }

      // Other errors
      next(error);
    }
  };
};

/**
 * Common validation schemas for reuse
 */
const CommonSchemas = {
  /**
   * Pagination query params
   */
  pagination: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive()).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive().max(100)).optional(),
  }),

  /**
   * UUID/ID param
   */
  idParam: z.object({
    id: z.string().uuid().or(z.string().regex(/^\d+$/)),
  }),

  /**
   * Email validation
   */
  email: z.string().email('Invalid email format'),

  /**
   * Password validation (min 8 chars)
   */
  password: z.string().min(8, 'Password must be at least 8 characters'),

  /**
   * Date string (ISO format)
   */
  dateString: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),

  /**
   * Date range
   */
  dateRange: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).refine(
    (data) => new Date(data.startDate) <= new Date(data.endDate),
    { message: 'Start date must be before or equal to end date' }
  ),
};

module.exports = {
  validate,
  CommonSchemas,
};
