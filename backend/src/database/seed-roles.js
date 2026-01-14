/**
 * Seed System Roles and Permissions
 * 
 * Seeds existing system roles (REGISTRAR, DEAN, DIRECTOR, EXECUTIVE) 
 * with their permissions from the hardcoded configuration.
 * 
 * Run: node src/database/seed-roles.js
 */

const pool = require('./connection');

// System roles with their permissions (from app/config/permissions.ts)
const SYSTEM_ROLES = {
  REGISTRAR: [
    'task:create',
    'task:view',
    'exam:create',
    'exam:view',
    'exam:edit',
    'exam:schedule',
    'dashboard:view',
    'report:view',
  ],
  DEAN: [
    'task:create',
    'task:view',
    'task:close',
    'task:escalate',
    'exam:create',
    'exam:view',
    'exam:edit',
    'exam:schedule',
    'exam:publish',
    'dashboard:view',
    'dashboard:analytics',
    'report:view',
    'report:export',
    'compliance:view',
    'audit:view',
    'crowd:view',
  ],
  DIRECTOR: [
    'task:create',
    'task:view',
    'task:close',
    'task:escalate',
    'task:assign',
    'task:delete',
    'exam:create',
    'exam:view',
    'exam:edit',
    'exam:delete',
    'exam:schedule',
    'exam:publish',
    'dashboard:view',
    'dashboard:analytics',
    'report:view',
    'report:export',
    'compliance:view',
    'compliance:manage',
    'finance:view',
    'finance:manage',
    'audit:view',
    'crowd:view',
  ],
  EXECUTIVE: [
    'task:view',
    'exam:view',
    'dashboard:view',
    'dashboard:analytics',
    'report:view',
    'report:export',
    'compliance:view',
    'finance:view',
    'audit:view',
    'crowd:view',
  ],
};

// Role display names
const ROLE_NAMES = {
  REGISTRAR: 'Registrar',
  DEAN: 'Dean',
  DIRECTOR: 'Director',
  EXECUTIVE: 'Executive',
};

async function seedRoles() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Seeding system roles...');
    
    // Insert system roles
    for (const [roleKey, permissions] of Object.entries(SYSTEM_ROLES)) {
      // Insert or update role
      const roleResult = await client.query(
        `INSERT INTO roles (role_key, name, description, is_system, is_active)
         VALUES ($1, $2, $3, TRUE, TRUE)
         ON CONFLICT (role_key) 
         DO UPDATE SET 
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           is_active = TRUE
         RETURNING id`,
        [
          roleKey,
          ROLE_NAMES[roleKey],
          `System role: ${ROLE_NAMES[roleKey]}`,
        ]
      );
      
      const roleId = roleResult.rows[0].id;
      console.log(`  ✓ Created/updated role: ${roleKey} (${ROLE_NAMES[roleKey]})`);
      
      // Insert permissions for this role
      for (const permissionKey of permissions) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_key, granted)
           VALUES ($1, $2, TRUE)
           ON CONFLICT (role_id, permission_key) 
           DO UPDATE SET granted = TRUE`,
          [roleId, permissionKey]
        );
      }
      
      console.log(`    ✓ Added ${permissions.length} permissions`);
    }
    
    // Also create SUPER_ADMIN role with all permissions
    const allPermissions = [
      ...new Set(
        Object.values(SYSTEM_ROLES).flat()
      )
    ];
    
    const superAdminResult = await client.query(
      `INSERT INTO roles (role_key, name, description, is_system, is_active)
       VALUES ('SUPER_ADMIN', 'Super Administrator', 'System role with full access to all features', TRUE, TRUE)
       ON CONFLICT (role_key) 
       DO UPDATE SET 
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         is_active = TRUE
       RETURNING id`,
    );
    
    const superAdminRoleId = superAdminResult.rows[0].id;
    console.log(`  ✓ Created/updated role: SUPER_ADMIN`);
    
    // Add all permissions to SUPER_ADMIN
    // We'll add a special permission 'system:*' that grants everything
    await client.query(
      `INSERT INTO role_permissions (role_id, permission_key, granted)
       VALUES ($1, 'system:*', TRUE)
       ON CONFLICT (role_id, permission_key) 
       DO UPDATE SET granted = TRUE`,
      [superAdminRoleId]
    );
    
    // Also add all existing permissions
    for (const permissionKey of allPermissions) {
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_key, granted)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (role_id, permission_key) 
         DO UPDATE SET granted = TRUE`,
        [superAdminRoleId, permissionKey]
      );
    }
    
    console.log(`    ✓ Added system:* and ${allPermissions.length} specific permissions`);
    
    await client.query('COMMIT');
    console.log('\n✅ System roles seeded successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  seedRoles()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedRoles };
