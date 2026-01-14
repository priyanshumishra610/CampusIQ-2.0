/**
 * Centralized Error Handling Middleware
 * 
 * Converts all errors (thrown or caught) into standardized API responses.
 * Masks internal stack traces from clients while preserving details for logs.
 */

const { AppError, Errors } = require('../utils/errors');

/**
 * Centralized error handler middleware
 * 
 * Must be added AFTER all routes in Express app.
 * Catches all errors and converts them to standardized responses.
 */
const errorHandler = (err, req, res, next) => {
  // Log error for internal debugging
  const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Determine if this is an AppError (our standardized error)
  let appError;
  if (err instanceof AppError) {
    appError = err;
  } else if (err.name === 'ValidationError' || err.name === 'ZodError') {
    // Handle validation errors from Zod
    const details = err.errors || err.issues || null;
    appError = Errors.invalidInput(
      'Validation failed',
      details
    );
  } else if (err.name === 'JsonWebTokenError') {
    appError = Errors.authRequired('Invalid token');
  } else if (err.name === 'TokenExpiredError') {
    appError = Errors.authRequired('Token expired');
  } else if (err.code === '23505') {
    // PostgreSQL unique constraint violation
    appError = Errors.invalidInput('Duplicate entry: resource already exists');
  } else if (err.code === '23503') {
    // PostgreSQL foreign key violation
    appError = Errors.invalidInput('Referenced resource does not exist');
  } else if (err.code === '23502') {
    // PostgreSQL not null violation
    appError = Errors.dataIncomplete('Required field is missing');
  } else {
    // Unknown error - mask from client
    console.error(`[${errorId}] Unhandled error:`, {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
    });
    
    appError = Errors.internal('An unexpected error occurred');
    // Include error ID in response for support tracking
    appError.details = { errorId };
  }

  // Log error with context (but not stack trace to client)
  if (appError.code !== 'INTERNAL_ERROR' || process.env.NODE_ENV === 'development') {
    console.error(`[${errorId}] API Error:`, {
      code: appError.code,
      message: appError.message,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      ...(appError.details && { details: appError.details }),
    });
  }

  // Send standardized error response
  res.status(appError.statusCode).json(appError.toResponse());
};

/**
 * Async route wrapper
 * 
 * Wraps async route handlers to automatically catch and forward errors
 * to the error handler middleware.
 * 
 * Usage:
 *   router.get('/route', asyncHandler(async (req, res) => {
 *     // Your async code here
 *   }));
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Assertion helper for runtime checks
 * 
 * Throws AppError if condition is false.
 * 
 * Usage:
 *   assert(employeeId, Errors.notFound('Employee'));
 *   assert(isValidState, Errors.invalidStateTransition('Cannot transition to this state'));
 */
const assert = (condition, error) => {
  if (!condition) {
    throw error;
  }
};

module.exports = {
  errorHandler,
  asyncHandler,
  assert,
};
