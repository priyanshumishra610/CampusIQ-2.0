-- Panel Builder System
-- First-class entity for customizable admin panels
-- Separates PANEL (workspace/view) from ROLE (permissions)

-- Panels Table
CREATE TABLE IF NOT EXISTS panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Theme Configuration (JSONB)
  theme_config JSONB NOT NULL DEFAULT '{
    "primaryColor": "#0ea5e9",
    "secondaryColor": "#64748b",
    "mode": "light",
    "logoUrl": null,
    "faviconUrl": null,
    "customCss": null
  }'::jsonb,
  
  -- Navigation Configuration (JSONB)
  navigation_config JSONB NOT NULL DEFAULT '{
    "modules": [],
    "order": [],
    "hidden": []
  }'::jsonb,
  
  -- Capability Overrides (JSONB)
  -- Maps capability_id to status (stable/degraded/disabled)
  capability_overrides JSONB DEFAULT '{}'::jsonb,
  
  -- Permission Set (array of permission keys)
  permission_set TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- System vs Custom
  is_system_panel BOOLEAN DEFAULT FALSE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT panels_name_not_empty CHECK (char_length(name) > 0)
);

-- User Panels Mapping
CREATE TABLE IF NOT EXISTS user_panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  panel_id UUID REFERENCES panels(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT FALSE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, panel_id)
);

-- Panel Capabilities (for capability overrides tracking)
CREATE TABLE IF NOT EXISTS panel_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id UUID REFERENCES panels(id) ON DELETE CASCADE,
  capability_id VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('stable', 'degraded', 'disabled')),
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(panel_id, capability_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_panels_status ON panels(status);
CREATE INDEX IF NOT EXISTS idx_panels_is_system ON panels(is_system_panel);
CREATE INDEX IF NOT EXISTS idx_panels_created_by ON panels(created_by);
CREATE INDEX IF NOT EXISTS idx_user_panels_user_id ON user_panels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_panels_panel_id ON user_panels(panel_id);
CREATE INDEX IF NOT EXISTS idx_user_panels_default ON user_panels(user_id, is_default) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_panel_capabilities_panel_id ON panel_capabilities(panel_id);
CREATE INDEX IF NOT EXISTS idx_panel_capabilities_capability_id ON panel_capabilities(capability_id);

-- Comments
COMMENT ON TABLE panels IS 'Customizable admin panels - defines workspace/view configuration';
COMMENT ON COLUMN panels.theme_config IS 'Visual theme configuration (colors, mode, logo)';
COMMENT ON COLUMN panels.navigation_config IS 'Navigation structure and module ordering';
COMMENT ON COLUMN panels.capability_overrides IS 'Panel-specific capability status overrides';
COMMENT ON COLUMN panels.permission_set IS 'Permissions granted by this panel';
COMMENT ON COLUMN panels.is_system_panel IS 'System panels cannot be deleted';
COMMENT ON TABLE user_panels IS 'Mapping of users to panels (users can have multiple panels)';
COMMENT ON COLUMN user_panels.is_default IS 'Default panel for user (only one per user)';
