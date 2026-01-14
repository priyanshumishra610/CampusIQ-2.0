/**
 * Panel Service
 * 
 * Manages panel entities - first-class workspace/view configurations
 * that define identity, capabilities, navigation, permissions, and theme.
 */

const pool = require('../database/connection');

/**
 * Get all panels for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of panel objects
 */
const getUserPanels = async (userId) => {
  const result = await pool.query(
    `SELECT 
      p.*,
      up.is_default,
      up.assigned_at
     FROM panels p
     INNER JOIN user_panels up ON p.id = up.panel_id
     WHERE up.user_id = $1 AND p.status = 'published'
     ORDER BY up.is_default DESC, up.assigned_at DESC`,
    [userId]
  );
  
  return result.rows;
};

/**
 * Get default panel for user
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Default panel or null
 */
const getDefaultPanel = async (userId) => {
  const result = await pool.query(
    `SELECT p.*
     FROM panels p
     INNER JOIN user_panels up ON p.id = up.panel_id
     WHERE up.user_id = $1 AND up.is_default = TRUE AND p.status = 'published'
     LIMIT 1`,
    [userId]
  );
  
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Get panel by ID
 * @param {string} panelId - Panel ID
 * @returns {Promise<Object|null>} Panel or null
 */
const getPanel = async (panelId) => {
  const result = await pool.query('SELECT * FROM panels WHERE id = $1', [panelId]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Get all panels (admin)
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of panels
 */
const getAllPanels = async (options = {}) => {
  const { includeArchived = false, includeDraft = true } = options;
  
  let query = 'SELECT * FROM panels WHERE 1=1';
  const params = [];
  
  if (!includeArchived) {
    query += " AND status != 'archived'";
  }
  
  if (!includeDraft) {
    query += " AND status = 'published'";
  }
  
  query += ' ORDER BY is_system_panel DESC, created_at DESC';
  
  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Create new panel
 * @param {Object} panelData - Panel data
 * @returns {Promise<Object>} Created panel
 */
const createPanel = async (panelData) => {
  const {
    name,
    description,
    themeConfig,
    navigationConfig,
    capabilityOverrides,
    permissionSet,
    createdBy,
  } = panelData;
  
  const result = await pool.query(
    `INSERT INTO panels (
      name, description, theme_config, navigation_config,
      capability_overrides, permission_set, created_by, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')
    RETURNING *`,
    [
      name,
      description || null,
      JSON.stringify(themeConfig || {
        primaryColor: '#0ea5e9',
        secondaryColor: '#64748b',
        mode: 'light',
        logoUrl: null,
        faviconUrl: null,
        customCss: null,
      }),
      JSON.stringify(navigationConfig || {
        modules: [],
        order: [],
        hidden: [],
      }),
      JSON.stringify(capabilityOverrides || {}),
      permissionSet || [],
      createdBy,
    ]
  );
  
  return result.rows[0];
};

/**
 * Update panel
 * @param {string} panelId - Panel ID
 * @param {Object} updates - Update data
 * @returns {Promise<Object>} Updated panel
 */
const updatePanel = async (panelId, updates) => {
  const updateFields = [];
  const updateValues = [];
  let paramCount = 1;
  
  const allowedFields = [
    'name', 'description', 'theme_config', 'navigation_config',
    'capability_overrides', 'permission_set', 'status',
  ];
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      if (key.includes('_config') || key === 'capability_overrides') {
        updateFields.push(`${key} = $${paramCount++}`);
        updateValues.push(JSON.stringify(value));
      } else {
        updateFields.push(`${key} = $${paramCount++}`);
        updateValues.push(value);
      }
    }
  }
  
  if (updateFields.length === 0) {
    return await getPanel(panelId);
  }
  
  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
  updateValues.push(panelId);
  
  const result = await pool.query(
    `UPDATE panels 
     SET ${updateFields.join(', ')}
     WHERE id = $${paramCount}
     RETURNING *`,
    updateValues
  );
  
  return result.rows[0];
};

/**
 * Clone panel
 * @param {string} panelId - Panel ID to clone
 * @param {string} newName - New panel name
 * @param {string} createdBy - User creating the clone
 * @returns {Promise<Object>} Cloned panel
 */
const clonePanel = async (panelId, newName, createdBy) => {
  const original = await getPanel(panelId);
  
  if (!original) {
    throw new Error('Panel not found');
  }
  
  const cloned = await createPanel({
    name: newName,
    description: `${original.description || ''} (Cloned from ${original.name})`,
    themeConfig: original.theme_config,
    navigationConfig: original.navigation_config,
    capabilityOverrides: original.capability_overrides,
    permissionSet: original.permission_set,
    createdBy,
  });
  
  return cloned;
};

/**
 * Delete panel
 * @param {string} panelId - Panel ID
 * @returns {Promise<boolean>} Success
 */
const deletePanel = async (panelId) => {
  // Check if panel is system panel
  const panel = await getPanel(panelId);
  if (panel && panel.is_system_panel) {
    throw new Error('System panels cannot be deleted');
  }
  
  // Check if panel is assigned to any users
  const userCount = await pool.query(
    'SELECT COUNT(*) as count FROM user_panels WHERE panel_id = $1',
    [panelId]
  );
  
  if (parseInt(userCount.rows[0].count) > 0) {
    throw new Error('Cannot delete panel: assigned to users');
  }
  
  await pool.query('DELETE FROM panels WHERE id = $1', [panelId]);
  return true;
};

/**
 * Assign panel to user
 * @param {string} userId - User ID
 * @param {string} panelId - Panel ID
 * @param {string} assignedBy - User assigning
 * @param {boolean} isDefault - Set as default panel
 * @returns {Promise<Object>} Assignment record
 */
const assignPanelToUser = async (userId, panelId, assignedBy, isDefault = false) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // If setting as default, unset other defaults
    if (isDefault) {
      await client.query(
        'UPDATE user_panels SET is_default = FALSE WHERE user_id = $1',
        [userId]
      );
    }
    
    // Insert or update assignment
    const result = await client.query(
      `INSERT INTO user_panels (user_id, panel_id, is_default, assigned_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, panel_id)
       DO UPDATE SET is_default = EXCLUDED.is_default,
                     assigned_by = EXCLUDED.assigned_by
       RETURNING *`,
      [userId, panelId, isDefault, assignedBy]
    );
    
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Remove panel from user
 * @param {string} userId - User ID
 * @param {string} panelId - Panel ID
 * @returns {Promise<boolean>} Success
 */
const removePanelFromUser = async (userId, panelId) => {
  await pool.query(
    'DELETE FROM user_panels WHERE user_id = $1 AND panel_id = $2',
    [userId, panelId]
  );
  return true;
};

/**
 * Get panel capabilities with overrides
 * @param {string} panelId - Panel ID
 * @returns {Promise<Object>} Capability status map
 */
const getPanelCapabilities = async (panelId) => {
  const panel = await getPanel(panelId);
  if (!panel) {
    return {};
  }
  
  // Get all capabilities
  const allCapabilities = await pool.query('SELECT * FROM capabilities');
  const capabilityMap = {};
  
  // Start with default status
  allCapabilities.rows.forEach(cap => {
    capabilityMap[cap.capability_id] = {
      status: cap.status,
      reason: cap.reason,
      overridden: false,
    };
  });
  
  // Apply panel overrides
  if (panel.capability_overrides) {
    Object.entries(panel.capability_overrides).forEach(([capId, override]) => {
      if (capabilityMap[capId]) {
        capabilityMap[capId] = {
          ...capabilityMap[capId],
          status: override.status || override,
          reason: override.reason || null,
          overridden: true,
        };
      }
    });
  }
  
  return capabilityMap;
};

/**
 * Get panel permissions
 * @param {string} panelId - Panel ID
 * @returns {Promise<Array>} Array of permission keys
 */
const getPanelPermissions = async (panelId) => {
  const panel = await getPanel(panelId);
  return panel ? (panel.permission_set || []) : [];
};

module.exports = {
  getUserPanels,
  getDefaultPanel,
  getPanel,
  getAllPanels,
  createPanel,
  updatePanel,
  clonePanel,
  deletePanel,
  assignPanelToUser,
  removePanelFromUser,
  getPanelCapabilities,
  getPanelPermissions,
};
