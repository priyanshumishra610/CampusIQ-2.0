/**
 * Role Management API
 * 
 * Super Admin only endpoints for managing roles and permissions.
 * All actions are audit-logged.
 */

const express = require('express');
const pool = require('../../database/connection');
const {authenticateToken, authorizePermission} = require('../../middleware/auth');
const {logAuditEvent, getClientIp} = require('../../services/auditLogger');
const {asyncHandler, assert} = require('../../middleware/errorHandler');
const {Errors} = require('../../utils/errors');
const {isSuperAdmin, clearPermissionCache, getAllPermissions} = require('../../services/roleService');

const router = express.Router();

// All routes require authentication and SUPER_ADMIN role
router.use(authenticateToken);
router.use(asyncHandler(async (req, res, next) => {
  const isSuper = await isSuperAdmin(req.user.id);
  if (!isSuper) {
    return res.status(403).json(Errors.permissionDenied('Super admin access required').toResponse());
  }
  next();
}));

/**
 * Get all roles
 * GET /api/admin/roles
 */
router.get('/', asyncHandler(async (req, res) => {
  const {includeInactive} = req.query;
  
  let query = 'SELECT * FROM roles WHERE 1=1';
  const params = [];
  
  if (includeInactive !== 'true') {
    query += ' AND is_active = TRUE';
  }
  
  query += ' ORDER BY is_system DESC, name ASC';
  
  const result = await pool.query(query, params);
  
  // Get permissions for each role
  const rolesWithPermissions = await Promise.all(
    result.rows.map(async (role) => {
      const permResult = await pool.query(
        'SELECT permission_key FROM role_permissions WHERE role_id = $1 AND granted = TRUE',
        [role.id]
      );
      
      return {
        id: role.id,
        roleKey: role.role_key,
        name: role.name,
        description: role.description,
        isSystem: role.is_system,
        isActive: role.is_active,
        permissions: permResult.rows.map(r => r.permission_key),
        createdAt: role.created_at,
        updatedAt: role.updated_at,
      };
    })
  );
  
  res.json({
    success: true,
    data: {roles: rolesWithPermissions},
  });
}));

/**
 * Get single role
 * GET /api/admin/roles/:id
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM roles WHERE id = $1', [req.params.id]);
  
  assert(result.rows.length > 0, Errors.notFound('Role'));
  
  const role = result.rows[0];
  
  // Get permissions
  const permResult = await pool.query(
    'SELECT permission_key FROM role_permissions WHERE role_id = $1 AND granted = TRUE',
    [role.id]
  );
  
  res.json({
    success: true,
    data: {
      id: role.id,
      roleKey: role.role_key,
      name: role.name,
      description: role.description,
      isSystem: role.is_system,
      isActive: role.is_active,
      permissions: permResult.rows.map(r => r.permission_key),
      createdAt: role.created_at,
      updatedAt: role.updated_at,
    },
  });
}));

/**
 * Create new role
 * POST /api/admin/roles
 */
router.post('/', asyncHandler(async (req, res) => {
  const {roleKey, name, description, permissions} = req.body;
  
  assert(roleKey, Errors.invalidInput('roleKey is required'));
  assert(name, Errors.invalidInput('name is required'));
  assert(Array.isArray(permissions), Errors.invalidInput('permissions must be an array'));
  
  // Validate role key format
  assert(/^[A-Z_][A-Z0-9_]*$/.test(roleKey), Errors.invalidInput('roleKey must be uppercase with underscores'));
  
  // Check if role key already exists
  const existing = await pool.query('SELECT id FROM roles WHERE role_key = $1', [roleKey]);
  assert(existing.rows.length === 0, Errors.invalidInput('Role key already exists'));
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create role
    const roleResult = await client.query(
      `INSERT INTO roles (role_key, name, description, is_system, is_active, created_by)
       VALUES ($1, $2, $3, FALSE, TRUE, $4)
       RETURNING *`,
      [roleKey, name, description || null, req.user.id]
    );
    
    const role = roleResult.rows[0];
    
    // Add permissions
    for (const permissionKey of permissions) {
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_key, granted)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (role_id, permission_key) DO UPDATE SET granted = TRUE`,
        [role.id, permissionKey]
      );
    }
    
    await client.query('COMMIT');
    
    // Log audit event
    await logAuditEvent({
      userId: req.user.id,
      action: 'ROLE_CREATED',
      entityType: 'role',
      entityId: role.id,
      details: {
        roleKey,
        name,
        permissions,
      },
      ipAddress: getClientIp(req),
      role: req.user.role,
    });
    
    // Clear permission cache
    clearPermissionCache();
    
    res.status(201).json({
      success: true,
      data: {
        id: role.id,
        roleKey: role.role_key,
        name: role.name,
        description: role.description,
        isSystem: role.is_system,
        permissions,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

/**
 * Update role
 * PUT /api/admin/roles/:id
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const {name, description, permissions, isActive} = req.body;
  
  // Get existing role
  const roleResult = await pool.query('SELECT * FROM roles WHERE id = $1', [req.params.id]);
  assert(roleResult.rows.length > 0, Errors.notFound('Role'));
  
  const role = roleResult.rows[0];
  
  // System roles cannot be deleted or have is_system changed
  assert(!role.is_system || isActive !== false, Errors.invalidInput('System roles cannot be deactivated'));
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update role
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      updateValues.push(name);
    }
    
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      updateValues.push(description);
    }
    
    if (isActive !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      updateValues.push(isActive);
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(req.params.id);
    
    if (updateFields.length > 1) {
      await client.query(
        `UPDATE roles SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
        updateValues
      );
    }
    
    // Update permissions if provided
    if (Array.isArray(permissions)) {
      // Get all available permissions
      const allPerms = await getAllPermissions();
      
      // Remove all existing permissions
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [req.params.id]);
      
      // Add new permissions
      for (const permissionKey of permissions) {
        assert(allPerms.includes(permissionKey) || permissionKey === 'system:*', 
          Errors.invalidInput(`Invalid permission: ${permissionKey}`));
        
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_key, granted)
           VALUES ($1, $2, TRUE)`,
          [req.params.id, permissionKey]
        );
      }
    }
    
    await client.query('COMMIT');
    
    // Log audit event
    await logAuditEvent({
      userId: req.user.id,
      action: 'ROLE_UPDATED',
      entityType: 'role',
      entityId: req.params.id,
      details: {
        roleKey: role.role_key,
        changes: {
          name,
          description,
          permissions,
          isActive,
        },
      },
      ipAddress: getClientIp(req),
      role: req.user.role,
    });
    
    // Clear permission cache
    clearPermissionCache();
    
    res.json({
      success: true,
      data: {
        id: req.params.id,
        message: 'Role updated successfully',
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

/**
 * Delete role
 * DELETE /api/admin/roles/:id
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const roleResult = await pool.query('SELECT * FROM roles WHERE id = $1', [req.params.id]);
  assert(roleResult.rows.length > 0, Errors.notFound('Role'));
  
  const role = roleResult.rows[0];
  
  // System roles cannot be deleted
  assert(!role.is_system, Errors.invalidInput('System roles cannot be deleted'));
  
  // Check if role is assigned to any users
  const userRolesResult = await pool.query(
    'SELECT COUNT(*) as count FROM user_roles WHERE role_id = $1',
    [req.params.id]
  );
  
  const userCount = parseInt(userRolesResult.rows[0].count);
  assert(userCount === 0, Errors.invalidInput(`Cannot delete role: ${userCount} user(s) have this role assigned`));
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Delete permissions
    await client.query('DELETE FROM role_permissions WHERE role_id = $1', [req.params.id]);
    
    // Delete role
    await client.query('DELETE FROM roles WHERE id = $1', [req.params.id]);
    
    await client.query('COMMIT');
    
    // Log audit event
    await logAuditEvent({
      userId: req.user.id,
      action: 'ROLE_DELETED',
      entityType: 'role',
      entityId: req.params.id,
      details: {
        roleKey: role.role_key,
        name: role.name,
      },
      ipAddress: getClientIp(req),
      role: req.user.role,
    });
    
    // Clear permission cache
    clearPermissionCache();
    
    res.json({
      success: true,
      data: {
        message: 'Role deleted successfully',
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

/**
 * Assign role to user
 * POST /api/admin/roles/:id/assign-user
 */
router.post('/:id/assign-user', asyncHandler(async (req, res) => {
  const {userId} = req.body;
  
  assert(userId, Errors.invalidInput('userId is required'));
  
  // Verify role exists
  const roleResult = await pool.query('SELECT * FROM roles WHERE id = $1', [req.params.id]);
  assert(roleResult.rows.length > 0, Errors.notFound('Role'));
  
  // Verify user exists
  const userResult = await pool.query('SELECT id, email FROM users WHERE id = $1', [userId]);
  assert(userResult.rows.length > 0, Errors.notFound('User'));
  
  // Assign role (or update if already assigned)
  await pool.query(
    `INSERT INTO user_roles (user_id, role_id, assigned_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, role_id) DO UPDATE SET assigned_by = EXCLUDED.assigned_by`,
    [userId, req.params.id, req.user.id]
  );
  
  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'ROLE_ASSIGNED',
    entityType: 'user_role',
    entityId: `${userId}:${req.params.id}`,
    details: {
      userId,
      roleId: req.params.id,
      roleKey: roleResult.rows[0].role_key,
      userEmail: userResult.rows[0].email,
    },
    ipAddress: getClientIp(req),
    role: req.user.role,
  });
  
  // Clear permission cache for this user
  clearPermissionCache(userId);
  
  res.json({
    success: true,
    data: {
      message: 'Role assigned successfully',
    },
  });
}));

/**
 * Remove role from user
 * DELETE /api/admin/roles/:id/assign-user/:userId
 */
router.delete('/:id/assign-user/:userId', asyncHandler(async (req, res) => {
  // Verify role exists
  const roleResult = await pool.query('SELECT * FROM roles WHERE id = $1', [req.params.id]);
  assert(roleResult.rows.length > 0, Errors.notFound('Role'));
  
  // Verify user exists
  const userResult = await pool.query('SELECT id, email FROM users WHERE id = $1', [req.params.userId]);
  assert(userResult.rows.length > 0, Errors.notFound('User'));
  
  // Remove role assignment
  const deleteResult = await pool.query(
    'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2 RETURNING *',
    [req.params.userId, req.params.id]
  );
  
  assert(deleteResult.rows.length > 0, Errors.notFound('Role assignment'));
  
  // Log audit event
  await logAuditEvent({
    userId: req.user.id,
    action: 'ROLE_REMOVED',
    entityType: 'user_role',
    entityId: `${req.params.userId}:${req.params.id}`,
    details: {
      userId: req.params.userId,
      roleId: req.params.id,
      roleKey: roleResult.rows[0].role_key,
      userEmail: userResult.rows[0].email,
    },
    ipAddress: getClientIp(req),
    role: req.user.role,
  });
  
  // Clear permission cache for this user
  clearPermissionCache(req.params.userId);
  
  res.json({
    success: true,
    data: {
      message: 'Role removed successfully',
    },
  });
}));

/**
 * Get all available permissions
 * GET /api/admin/roles/permissions/list
 */
router.get('/permissions/list', asyncHandler(async (req, res) => {
  const permissions = await getAllPermissions();
  
  res.json({
    success: true,
    data: {permissions},
  });
}));

module.exports = router;
