-- Dynamic Role Management System
-- Replaces hardcoded role enums with database-driven roles
-- Supports system roles (non-deletable) and custom roles

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'REGISTRAR', 'DEAN', 'CUSTOM_ROLE_1'
  name VARCHAR(255) NOT NULL, -- Human-readable name
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE, -- System roles cannot be deleted
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role Permissions Mapping
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_key VARCHAR(100) NOT NULL, -- e.g., 'task:create', 'exam:view'
  granted BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, permission_key)
);

-- User Roles Mapping (supports multiple roles per user)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, role_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_roles_role_key ON roles(role_key);
CREATE INDEX IF NOT EXISTS idx_roles_is_system ON roles(is_system);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_key ON role_permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- Comments
COMMENT ON TABLE roles IS 'Dynamic roles table - supports both system and custom roles';
COMMENT ON COLUMN roles.role_key IS 'Unique identifier for the role (e.g., REGISTRAR, DEAN)';
COMMENT ON COLUMN roles.is_system IS 'System roles are non-deletable and seeded on migration';
COMMENT ON TABLE role_permissions IS 'Mapping of roles to permissions';
COMMENT ON TABLE user_roles IS 'Mapping of users to roles (supports multiple roles per user)';
