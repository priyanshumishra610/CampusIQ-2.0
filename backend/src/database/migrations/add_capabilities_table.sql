-- Capability Registry Table
-- Tracks system capabilities and their health status
-- Enables feature gating and operational visibility

CREATE TABLE IF NOT EXISTS capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capability_id VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'attendance', 'leave', 'payroll'
  name VARCHAR(255) NOT NULL, -- Human-readable name
  status VARCHAR(20) NOT NULL DEFAULT 'stable' CHECK (status IN ('stable', 'degraded', 'disabled')),
  reason TEXT, -- Optional explanation for degraded/disabled status
  owner_module VARCHAR(100) NOT NULL, -- Module/service that owns this capability
  last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_error TEXT, -- Most recent error message (if any)
  metadata JSONB, -- Additional metadata (health metrics, dependencies, etc.)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups by capability_id
CREATE INDEX IF NOT EXISTS idx_capabilities_capability_id ON capabilities(capability_id);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_capabilities_status ON capabilities(status);

-- Initial capabilities (will be seeded)
-- These represent the major system capabilities that need monitoring

COMMENT ON TABLE capabilities IS 'Centralized registry of system capabilities and their health status';
COMMENT ON COLUMN capabilities.capability_id IS 'Unique identifier for the capability (e.g., attendance, leave)';
COMMENT ON COLUMN capabilities.status IS 'Current health status: stable, degraded, or disabled';
COMMENT ON COLUMN capabilities.reason IS 'Explanation for degraded or disabled status';
COMMENT ON COLUMN capabilities.owner_module IS 'Service or module that owns this capability';
COMMENT ON COLUMN capabilities.last_error IS 'Most recent error message for debugging';
