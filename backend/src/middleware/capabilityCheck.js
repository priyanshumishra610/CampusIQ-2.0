/**
 * Capability Check Middleware
 * 
 * Middleware to check capability status before route execution.
 * Throws FEATURE_DISABLED error if capability is disabled.
 * Adds degraded status to response if capability is degraded.
 */

const {requireCapability, checkCapability} = require('../services/capabilityRegistry');

/**
 * Middleware to require a capability to be available
 * Throws FEATURE_DISABLED if capability is disabled
 * 
 * @param {string} capabilityId - Capability identifier
 * @returns {Function} Express middleware
 * 
 * Usage:
 *   router.get('/route', capabilityRequired('attendance'), handler);
 */
const capabilityRequired = (capabilityId) => {
  return async (req, res, next) => {
    try {
      await requireCapability(capabilityId);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check capability status and add to response
 * Does not throw error, but adds degraded flag to response
 * 
 * @param {string} capabilityId - Capability identifier
 * @returns {Function} Express middleware
 * 
 * Usage:
 *   router.get('/route', capabilityChecked('attendance'), handler);
 *   // Response will include: { success: true, data: {...}, degraded: true/false, degradedReason: '...' }
 */
const capabilityChecked = (capabilityId) => {
  return async (req, res, next) => {
    try {
      const check = await checkCapability(capabilityId);
      
      // Store capability status in request for later use
      req.capabilityStatus = {
        capabilityId,
        status: check.status,
        degraded: check.degraded,
        reason: check.reason,
      };
      
      // If disabled, throw error
      if (!check.available) {
        const {Errors} = require('../utils/errors');
        throw Errors.featureDisabled(
          `Capability '${capabilityId}' is currently disabled`,
          {reason: check.reason, capabilityId}
        );
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Response wrapper to add degraded status if applicable
 * Call this in route handlers after setting response data
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Object} data - Response data
 * @returns {Object} Response data with degraded status if applicable
 */
const addCapabilityStatusToResponse = (req, data) => {
  if (req.capabilityStatus && req.capabilityStatus.degraded) {
    return {
      ...data,
      degraded: true,
      degradedReason: req.capabilityStatus.reason,
    };
  }
  return data;
};

module.exports = {
  capabilityRequired,
  capabilityChecked,
  addCapabilityStatusToResponse,
};
