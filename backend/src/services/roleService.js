/**
 * Role Service
 * 
 * Handles role and permission resolution from database.
 * Supports multiple roles per user and permission caching.
 */

const pool = require('../database/connection');

// In-memory permission cache (cleared on role changes)
let permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all roles for a user (including system roles from admin_role field)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of role objects
 */
const getUserRoles = async (userId) => {
  // Get user's base role and admin_role from users table
  const userResult = await pool.query(
    'SELECT role, admin_role FROM users WHERE id = $1',
    [userId]
  );
  
  if (userResult.rows.length === 0) {
    return [];
  }
  
  const user = userResult.rows[0];
  const roles = [];
  
  // Add base role if it exists in roles table
  if (user.role) {
    const baseRoleResult = await pool.query(
      'SELECT * FROM roles WHERE role_key = $1 AND is_active = TRUE',
      [user.role]
    );
    if (baseRoleResult.rows.length > 0) {
      roles.push(baseRoleResult.rows[0]);
    }
  }
  
  // Add admin_role if it exists
  if (user.admin_role) {
    const adminRoleResult = await pool.query(
      'SELECT * FROM roles WHERE role_key = $1 AND is_active = TRUE',
      [user.admin_role]
    );
    if (adminRoleResult.rows.length > 0) {
      roles.push(adminRoleResult.rows[0]);
    }
  }
  
  // Get additional roles from user_roles table
  const userRolesResult = await pool.query(
    `SELECT r.* FROM roles r
     INNER JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = $1 AND r.is_active = TRUE`,
    [userId]
  );
  
  // Merge and deduplicate
  const roleMap = new Map();
  [...roles, ...userRolesResult.rows].forEach(role => {
    if (!roleMap.has(role.id)) {
      roleMap.set(role.id, role);
    }
  });
  
  return Array.from(roleMap.values());
};

/**
 * Get all permissions for a user (from all their roles)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of permission keys
 */
const getUserPermissions = async (userId) => {
  const cacheKey = `user:${userId}:permissions`;
  const cached = permissionCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.permissions;
  }
  
  const roles = await getUserRoles(userId);
  const permissionSet = new Set();
  
  for (const role of roles) {
    // SUPER_ADMIN with system:* has all permissions
    if (role.role_key === 'SUPER_ADMIN') {
      // Check for system:* permission
      const superAdminPerms = await pool.query(
        'SELECT permission_key FROM role_permissions WHERE role_id = $1 AND permission_key = $2',
        [role.id, 'system:*']
      );
      
      if (superAdminPerms.rows.length > 0) {
        // SUPER_ADMIN has all permissions - return special marker
        permissionCache.set(cacheKey, {
          permissions: ['*'],
          timestamp: Date.now(),
        });
        return ['*'];
      }
    }
    
    // Get permissions for this role
    const permResult = await pool.query(
      'SELECT permission_key FROM role_permissions WHERE role_id = $1 AND granted = TRUE',
      [role.id]
    );
    
    permResult.rows.forEach(row => {
      permissionSet.add(row.permission_key);
    });
  }
  
  const permissions = Array.from(permissionSet);
  
  // Cache the result
  permissionCache.set(cacheKey, {
    permissions,
    timestamp: Date.now(),
  });
  
  return permissions;
};

/**
 * Check if user has a specific permission
 * @param {string} userId - User ID
 * @param {string} permission - Permission key
 * @returns {Promise<boolean>}
 */
const hasPermission = async (userId, permission) => {
  const permissions = await getUserPermissions(userId);
  
  // SUPER_ADMIN with system:* has all permissions
  if (permissions.includes('*')) {
    return true;
  }
  
  return permissions.includes(permission);
};

/**
 * Check if user has any of the specified permissions
 * @param {string} userId - User ID
 * @param {Array<string>} permissions - Permission keys
 * @returns {Promise<boolean>}
 */
const hasAnyPermission = async (userId, permissions) => {
  const userPerms = await getUserPermissions(userId);
  
  if (userPerms.includes('*')) {
    return true;
  }
  
  return permissions.some(perm => userPerms.includes(perm));
};

/**
 * Check if user has all of the specified permissions
 * @param {string} userId - User ID
 * @param {Array<string>} permissions - Permission keys
 * @returns {Promise<boolean>}
 */
const hasAllPermissions = async (userId, permissions) => {
  const userPerms = await getUserPermissions(userId);
  
  if (userPerms.includes('*')) {
    return true;
  }
  
  return permissions.every(perm => userPerms.includes(perm));
};

/**
 * Check if user has SUPER_ADMIN role
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
const isSuperAdmin = async (userId) => {
  const roles = await getUserRoles(userId);
  return roles.some(role => role.role_key === 'SUPER_ADMIN');
};

/**
 * Clear permission cache for a user (call after role changes)
 * @param {string} userId - Optional user ID, if not provided clears all cache
 */
const clearPermissionCache = (userId = null) => {
  if (userId) {
    permissionCache.delete(`user:${userId}:permissions`);
  } else {
    permissionCache.clear();
  }
};

/**
 * Get all available permissions (for admin UI)
 * @returns {Promise<Array>} Array of permission keys
 */
const getAllPermissions = async () => {
  const result = await pool.query(
    'SELECT DISTINCT permission_key FROM role_permissions ORDER BY permission_key'
  );
  return result.rows.map(row => row.permission_key);
};

module.exports = {
  getUserRoles,
  getUserPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isSuperAdmin,
  clearPermissionCache,
  getAllPermissions,
};
