/**
 * Capability Registry Service
 * 
 * Centralized registry for system capabilities and their health status.
 * Enables feature gating, operational visibility, and safe degradation.
 * 
 * This service provides:
 * - Capability status tracking (stable, degraded, disabled)
 * - Programmatic access to capability health
 * - Integration with services for automatic feature gating
 * - Admin visibility into system capabilities
 */

const pool = require('../database/connection');
const {Errors} = require('../utils/errors');

/**
 * Capability status constants
 */
const CAPABILITY_STATUS = {
  STABLE: 'stable',
  DEGRADED: 'degraded',
  DISABLED: 'disabled',
};

/**
 * Get capability by ID
 * @param {string} capabilityId - Capability identifier
 * @returns {Promise<Object|null>} Capability record or null
 */
const getCapability = async (capabilityId) => {
  const result = await pool.query(
    'SELECT * FROM capabilities WHERE capability_id = $1',
    [capabilityId]
  );
  
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Get all capabilities
 * @returns {Promise<Array>} Array of capability records
 */
const getAllCapabilities = async () => {
  const result = await pool.query(
    'SELECT * FROM capabilities ORDER BY capability_id'
  );
  return result.rows;
};

/**
 * Check if a capability is available (not disabled)
 * @param {string} capabilityId - Capability identifier
 * @returns {Promise<Object>} {available: boolean, capability: Object|null, reason: string|null}
 */
const checkCapability = async (capabilityId) => {
  const capability = await getCapability(capabilityId);
  
  if (!capability) {
    // If capability not registered, assume stable (backward compatibility)
    return {
      available: true,
      capability: null,
      reason: null,
      status: CAPABILITY_STATUS.STABLE,
    };
  }
  
  return {
    available: capability.status !== CAPABILITY_STATUS.DISABLED,
    capability,
    reason: capability.reason || null,
    status: capability.status,
    degraded: capability.status === CAPABILITY_STATUS.DEGRADED,
  };
};

/**
 * Require capability to be available
 * Throws FEATURE_DISABLED error if capability is disabled
 * @param {string} capabilityId - Capability identifier
 * @throws {AppError} If capability is disabled
 */
const requireCapability = async (capabilityId) => {
  const check = await checkCapability(capabilityId);
  
  if (!check.available) {
    throw Errors.featureDisabled(
      `Capability '${capabilityId}' is currently disabled`,
      {reason: check.reason, capabilityId}
    );
  }
  
  return check;
};

/**
 * Update capability status
 * @param {string} capabilityId - Capability identifier
 * @param {string} status - New status (stable, degraded, disabled)
 * @param {string} reason - Optional reason for status change
 * @param {string} lastError - Optional last error message
 * @param {Object} metadata - Optional metadata
 * @returns {Promise<Object>} Updated capability record
 */
const updateCapabilityStatus = async (capabilityId, status, reason = null, lastError = null, metadata = null) => {
  // Validate status
  if (!Object.values(CAPABILITY_STATUS).includes(status)) {
    throw Errors.invalidInput(`Invalid status: ${status}`);
  }
  
  const result = await pool.query(
    `UPDATE capabilities 
     SET status = $1, 
         reason = $2, 
         last_error = $3,
         metadata = COALESCE($4, metadata),
         last_checked = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE capability_id = $5
     RETURNING *`,
    [status, reason, lastError, metadata ? JSON.stringify(metadata) : null, capabilityId]
  );
  
  if (result.rows.length === 0) {
    throw Errors.notFound(`Capability '${capabilityId}' not found`);
  }
  
  return result.rows[0];
};

/**
 * Register or update a capability
 * @param {string} capabilityId - Capability identifier
 * @param {string} name - Human-readable name
 * @param {string} ownerModule - Owner module/service
 * @param {string} status - Initial status (default: stable)
 * @param {string} reason - Optional reason
 * @returns {Promise<Object>} Capability record
 */
const registerCapability = async (capabilityId, name, ownerModule, status = CAPABILITY_STATUS.STABLE, reason = null) => {
  const result = await pool.query(
    `INSERT INTO capabilities (capability_id, name, owner_module, status, reason, last_checked, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT (capability_id) 
     DO UPDATE SET 
       name = EXCLUDED.name,
       owner_module = EXCLUDED.owner_module,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [capabilityId, name, ownerModule, status, reason]
  );
  
  return result.rows[0];
};

/**
 * Record a capability check (updates last_checked timestamp)
 * @param {string} capabilityId - Capability identifier
 * @param {boolean} healthy - Whether the check passed
 * @param {string} error - Optional error message if check failed
 */
const recordCapabilityCheck = async (capabilityId, healthy = true, error = null) => {
  if (!healthy && error) {
    await pool.query(
      `UPDATE capabilities 
       SET last_checked = CURRENT_TIMESTAMP, 
           last_error = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE capability_id = $2`,
      [error, capabilityId]
    );
  } else {
    await pool.query(
      `UPDATE capabilities 
       SET last_checked = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE capability_id = $1`,
      [capabilityId]
    );
  }
};

/**
 * Get capability health summary
 * Returns counts by status
 * @returns {Promise<Object>} Health summary
 */
const getHealthSummary = async () => {
  const result = await pool.query(
    `SELECT 
       status,
       COUNT(*) as count
     FROM capabilities
     GROUP BY status`
  );
  
  const summary = {
    total: 0,
    stable: 0,
    degraded: 0,
    disabled: 0,
  };
  
  result.rows.forEach(row => {
    summary.total += parseInt(row.count);
    summary[row.status] = parseInt(row.count);
  });
  
  return summary;
};

/**
 * Get recent errors for a capability
 * @param {string} capabilityId - Capability identifier
 * @returns {Promise<Object|null>} Capability with error info
 */
const getCapabilityWithErrors = async (capabilityId) => {
  const capability = await getCapability(capabilityId);
  
  if (!capability) {
    return null;
  }
  
  // Get recent audit events related to this capability
  const auditResult = await pool.query(
    `SELECT * FROM audit_logs 
     WHERE entity_type = 'capability' AND entity_id = $1
     ORDER BY created_at DESC
     LIMIT 5`,
    [capabilityId]
  );
  
  return {
    ...capability,
    recentAuditEvents: auditResult.rows.map(row => ({
      id: row.id,
      action: row.action,
      details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
      createdAt: row.created_at,
    })),
  };
};

module.exports = {
  CAPABILITY_STATUS,
  getCapability,
  getAllCapabilities,
  checkCapability,
  requireCapability,
  updateCapabilityStatus,
  registerCapability,
  recordCapabilityCheck,
  getHealthSummary,
  getCapabilityWithErrors,
};
