-- Add dashboard_layout to panels table
-- This enables panels to define their dashboard widget configuration

ALTER TABLE panels 
ADD COLUMN IF NOT EXISTS dashboard_layout JSONB DEFAULT '{
  "widgets": [],
  "layout": []
}'::jsonb;

COMMENT ON COLUMN panels.dashboard_layout IS 'Dashboard widget configuration - defines which widgets appear and their layout';
