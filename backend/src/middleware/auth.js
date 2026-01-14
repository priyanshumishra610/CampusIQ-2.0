const jwt = require('jsonwebtoken');
const pool = require('../database/connection');
const {getUserRoles, getUserPermissions, hasPermission, isSuperAdmin} = require('../services/roleService');
const panelService = require('../services/panelService');
const {Errors} = require('../utils/errors');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({error: 'Access token required'});
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch user from database to ensure they still exist
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({error: 'User not found'});
    }

    const user = result.rows[0];
    
    // Load roles and permissions from database
    const roles = await getUserRoles(user.id);
    const permissions = await getUserPermissions(user.id);
    const isSuper = await isSuperAdmin(user.id);
    
    // Load default panel (if any)
    const defaultPanel = await panelService.getDefaultPanel(user.id);
    
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      adminRole: user.admin_role,
      roles: roles.map(r => r.role_key),
      permissions,
      isSuperAdmin: isSuper,
      defaultPanel: defaultPanel ? {
        id: defaultPanel.id,
        name: defaultPanel.name,
        themeConfig: defaultPanel.theme_config,
        navigationConfig: defaultPanel.navigation_config,
      } : null,
      ...user,
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({error: 'Invalid token'});
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({error: 'Token expired'});
    }
    return res.status(500).json({error: 'Authentication error'});
  }
};

/**
 * Authorize by role keys (checks database roles)
 * @param {...string} roleKeys - Role keys to check
 */
const authorizeRoles = (...roleKeys) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({error: 'Authentication required'});
    }
    
    // SUPER_ADMIN has access to everything
    if (req.user.isSuperAdmin) {
      return next();
    }
    
    // Check if user has any of the required roles
    const userRoles = req.user.roles || [];
    const hasRole = roleKeys.some(roleKey => userRoles.includes(roleKey));
    
    if (!hasRole) {
      return res.status(403).json(Errors.permissionDenied('Insufficient role permissions').toResponse());
    }
    
    next();
  };
};

/**
 * Authorize by permission
 * @param {string} permission - Permission key
 */
const authorizePermission = (permission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(Errors.authRequired().toResponse());
    }
    
    // SUPER_ADMIN has all permissions
    if (req.user.isSuperAdmin) {
      return next();
    }
    
    const userHasPermission = await hasPermission(req.user.id, permission);
    
    if (!userHasPermission) {
      return res.status(403).json(Errors.permissionDenied(`Permission required: ${permission}`).toResponse());
    }
    
    next();
  };
};

/**
 * Authorize by any of the specified permissions
 * @param {...string} permissions - Permission keys
 */
const authorizeAnyPermission = (...permissions) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(Errors.authRequired().toResponse());
    }
    
    // SUPER_ADMIN has all permissions
    if (req.user.isSuperAdmin) {
      return next();
    }
    
    const userPerms = req.user.permissions || [];
    
    // Check if user has any of the required permissions
    const hasAny = permissions.some(perm => 
      userPerms.includes('*') || userPerms.includes(perm)
    );
    
    if (!hasAny) {
      return res.status(403).json(Errors.permissionDenied('Insufficient permissions').toResponse());
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizePermission,
  authorizeAnyPermission,
};

