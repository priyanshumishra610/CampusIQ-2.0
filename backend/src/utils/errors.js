/**
 * Standardized Error Taxonomy for CampusIQ API
 * 
 * All API errors must use one of these error codes for consistent
 * client handling and debugging.
 */

/**
 * Error code constants
 */
const ERROR_CODES = {
  // Authentication & Authorization
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  
  // Input Validation
  INVALID_INPUT: 'INVALID_INPUT',
  
  // State Management
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  
  // Feature & Data
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  DATA_INCOMPLETE: 'DATA_INCOMPLETE',
  
  // System
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

/**
 * HTTP status code mapping for error codes
 */
const ERROR_STATUS_MAP = {
  [ERROR_CODES.AUTH_REQUIRED]: 401,
  [ERROR_CODES.PERMISSION_DENIED]: 403,
  [ERROR_CODES.INVALID_INPUT]: 400,
  [ERROR_CODES.INVALID_STATE_TRANSITION]: 400,
  [ERROR_CODES.FEATURE_DISABLED]: 403,
  [ERROR_CODES.DATA_INCOMPLETE]: 422,
  [ERROR_CODES.RATE_LIMITED]: 429,
  [ERROR_CODES.INTERNAL_ERROR]: 500,
};

/**
 * Application Error Class
 * 
 * All application errors should extend this class to ensure
 * consistent error structure and proper HTTP status codes.
 */
class AppError extends Error {
  constructor(code, message, details = null, statusCode = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.message = message;
    this.details = details;
    this.statusCode = statusCode || ERROR_STATUS_MAP[code] || 500;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to API response format
   */
  toResponse() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

/**
 * Convenience factory functions for common error types
 */
const Errors = {
  /**
   * Authentication required (401)
   */
  authRequired: (message = 'Authentication required') => {
    return new AppError(ERROR_CODES.AUTH_REQUIRED, message);
  },

  /**
   * Permission denied (403)
   */
  permissionDenied: (message = 'Permission denied', details = null) => {
    return new AppError(ERROR_CODES.PERMISSION_DENIED, message, details);
  },

  /**
   * Invalid input (400)
   */
  invalidInput: (message = 'Invalid input', details = null) => {
    return new AppError(ERROR_CODES.INVALID_INPUT, message, details);
  },

  /**
   * Invalid state transition (400)
   */
  invalidStateTransition: (message = 'Invalid state transition', details = null) => {
    return new AppError(ERROR_CODES.INVALID_STATE_TRANSITION, message, details);
  },

  /**
   * Feature disabled (403)
   */
  featureDisabled: (message = 'Feature is disabled', details = null) => {
    return new AppError(ERROR_CODES.FEATURE_DISABLED, message, details);
  },

  /**
   * Data incomplete (422)
   */
  dataIncomplete: (message = 'Required data is incomplete', details = null) => {
    return new AppError(ERROR_CODES.DATA_INCOMPLETE, message, details);
  },

  /**
   * Rate limited (429)
   */
  rateLimited: (message = 'Rate limit exceeded', details = null) => {
    return new AppError(ERROR_CODES.RATE_LIMITED, message, details);
  },

  /**
   * Internal error (500)
   */
  internal: (message = 'Internal server error', details = null) => {
    return new AppError(ERROR_CODES.INTERNAL_ERROR, message, details);
  },

  /**
   * Not found (404) - Special case, not in taxonomy but common
   */
  notFound: (resource = 'Resource', details = null) => {
    const error = new AppError(ERROR_CODES.INVALID_INPUT, `${resource} not found`, details);
    error.statusCode = 404;
    return error;
  },
};

module.exports = {
  ERROR_CODES,
  ERROR_STATUS_MAP,
  AppError,
  Errors,
};
