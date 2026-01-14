-- ============================================
-- FEATURE IMPLEMENTATION: Database Migrations
-- ============================================
-- This migration adds all tables required for the 12 new features

-- ============================================
-- 1. Two-Level Leave Approval Enhancements
-- ============================================
-- Add columns to existing leave_requests table for approval timeline tracking
-- Note: manager_approval_status, hr_approval_status, etc. already exist from previous migration
ALTER TABLE leave_requests 
ADD COLUMN IF NOT EXISTS pending_duration_hours INTEGER,
ADD COLUMN IF NOT EXISTS escalation_triggered_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS escalation_reason TEXT;

-- Index for pending duration queries
CREATE INDEX IF NOT EXISTS idx_leave_requests_pending_duration 
ON leave_requests(pending_duration_hours) WHERE status = 'PENDING';

-- ============================================
-- 2. Feedback + Suggestion System
-- ============================================
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  category VARCHAR(100) NOT NULL CHECK (category IN (
    'ACADEMIC', 'ADMINISTRATIVE', 'FACILITIES', 'HR', 'IT', 'SECURITY', 'GENERAL', 'OTHER'
  )),
  subcategory VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  sentiment VARCHAR(20) CHECK (sentiment IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE')),
  status VARCHAR(50) DEFAULT 'SUBMITTED' CHECK (status IN (
    'SUBMITTED', 'UNDER_REVIEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CLOSED'
  )),
  priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  assigned_to UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_submitted_by ON feedback(submitted_by) WHERE is_anonymous = FALSE;
CREATE INDEX IF NOT EXISTS idx_feedback_assigned_to ON feedback(assigned_to);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- ============================================
-- 3. 99% Staff Enrollment
-- ============================================
CREATE TABLE IF NOT EXISTS staff_enrollment_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  enrollment_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (enrollment_percentage >= 0 AND enrollment_percentage <= 100),
  completion_status VARCHAR(50) DEFAULT 'INCOMPLETE' CHECK (completion_status IN (
    'INCOMPLETE', 'PENDING_REVIEW', 'COMPLETE', 'COMPLIANCE_FLAGGED'
  )),
  missing_documents TEXT[],
  compliance_flags TEXT[],
  last_reviewed_by UUID REFERENCES users(id),
  last_reviewed_at TIMESTAMP,
  hr_override BOOLEAN DEFAULT FALSE,
  hr_override_reason TEXT,
  hr_override_by UUID REFERENCES users(id),
  hr_override_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_enrollment_completion ON staff_enrollment_tracking(completion_status);
CREATE INDEX IF NOT EXISTS idx_staff_enrollment_percentage ON staff_enrollment_tracking(enrollment_percentage);

-- ============================================
-- 4. Attendance Intelligence Engine
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  pattern_type VARCHAR(50) NOT NULL CHECK (pattern_type IN (
    'ABSENT_PATTERN', 'LATE_PATTERN', 'IRREGULAR', 'IMPROVING', 'DECLINING', 'STABLE'
  )),
  pattern_description TEXT,
  confidence_score DECIMAL(5, 2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  anomaly_type VARCHAR(50) NOT NULL CHECK (anomaly_type IN (
    'UNUSUAL_ABSENCE', 'SUDDEN_DROP', 'INCONSISTENT_PATTERN', 'RISK_INDICATOR', 'OTHER'
  )),
  anomaly_description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  flagged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  flagged_by UUID REFERENCES users(id),
  auto_flagged BOOLEAN DEFAULT FALSE,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id),
  resolution_notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attendance_patterns_student ON attendance_patterns(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_anomalies_student ON attendance_anomalies(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_anomalies_resolved ON attendance_anomalies(resolved) WHERE resolved = FALSE;

-- ============================================
-- 5. Auto Substitution Allocation Engine
-- ============================================
CREATE TABLE IF NOT EXISTS substitution_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_faculty_id UUID REFERENCES users(id),
  substitute_faculty_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  timetable_slot_id UUID REFERENCES timetables(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'AUTO_ALLOCATED', 'MANUAL_ALLOCATED', 'REJECTED', 'CANCELLED', 'COMPLETED'
  )),
  allocation_method VARCHAR(50) CHECK (allocation_method IN ('AUTO', 'MANUAL', 'OVERRIDE')),
  auto_allocation_score DECIMAL(5, 2),
  override_justification TEXT,
  override_by UUID REFERENCES users(id),
  override_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_substitution_requests_date ON substitution_requests(date);
CREATE INDEX IF NOT EXISTS idx_substitution_requests_status ON substitution_requests(status);
CREATE INDEX IF NOT EXISTS idx_substitution_requests_faculty ON substitution_requests(original_faculty_id);

-- ============================================
-- 6. Birthday + Celebration Engine
-- ============================================
CREATE TABLE IF NOT EXISTS celebration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'BIRTHDAY', 'ANNIVERSARY', 'ACHIEVEMENT', 'RETIREMENT', 'PROMOTION', 'CUSTOM'
  )),
  person_id UUID REFERENCES users(id) ON DELETE CASCADE,
  person_type VARCHAR(50) NOT NULL CHECK (person_type IN ('STUDENT', 'FACULTY', 'STAFF', 'EMPLOYEE')),
  event_date DATE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  visibility_scope VARCHAR(50) DEFAULT 'ROLE_BASED' CHECK (visibility_scope IN (
    'PUBLIC', 'ROLE_BASED', 'DEPARTMENT', 'PRIVATE'
  )),
  target_roles TEXT[],
  target_departments TEXT[],
  opt_in_required BOOLEAN DEFAULT FALSE,
  scheduled_at TIMESTAMP,
  notified_at TIMESTAMP,
  metadata JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS celebration_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  opt_in BOOLEAN DEFAULT TRUE,
  notification_preferences JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_celebration_events_date ON celebration_events(event_date);
CREATE INDEX IF NOT EXISTS idx_celebration_events_type ON celebration_events(event_type);
CREATE INDEX IF NOT EXISTS idx_celebration_preferences_user ON celebration_preferences(user_id);

-- ============================================
-- 7. Community (Polls + Voting + Discussions)
-- ============================================
CREATE TABLE IF NOT EXISTS discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_official BOOLEAN DEFAULT FALSE,
  category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN (
    'ACTIVE', 'LOCKED', 'ARCHIVED', 'DELETED', 'MODERATED'
  )),
  moderation_status VARCHAR(50) DEFAULT 'APPROVED' CHECK (moderation_status IN (
    'PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'
  )),
  moderated_by UUID REFERENCES users(id),
  moderated_at TIMESTAMP,
  moderation_notes TEXT,
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  last_reply_at TIMESTAMP,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS discussion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  parent_reply_id UUID REFERENCES discussion_replies(id) ON DELETE CASCADE,
  moderation_status VARCHAR(50) DEFAULT 'APPROVED' CHECK (moderation_status IN (
    'PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'
  )),
  moderated_by UUID REFERENCES users(id),
  moderated_at TIMESTAMP,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_official BOOLEAN DEFAULT FALSE,
  category VARCHAR(100),
  status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN (
    'DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED'
  )),
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP,
  allow_anonymous BOOLEAN DEFAULT FALSE,
  allow_multiple_choices BOOLEAN DEFAULT FALSE,
  visibility_scope VARCHAR(50) DEFAULT 'PUBLIC' CHECK (visibility_scope IN (
    'PUBLIC', 'ROLE_BASED', 'DEPARTMENT', 'PRIVATE'
  )),
  target_roles TEXT[],
  target_departments TEXT[],
  moderation_status VARCHAR(50) DEFAULT 'APPROVED',
  total_votes INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_text VARCHAR(255) NOT NULL,
  vote_count INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
  voter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(poll_id, voter_id) WHERE is_anonymous = FALSE
);

CREATE INDEX IF NOT EXISTS idx_discussions_status ON discussions(status);
CREATE INDEX IF NOT EXISTS idx_discussions_official ON discussions(is_official);
CREATE INDEX IF NOT EXISTS idx_discussions_author ON discussions(author_id);
CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(status);
CREATE INDEX IF NOT EXISTS idx_polls_official ON polls(is_official);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);

-- ============================================
-- 8. Export System
-- ============================================
CREATE TABLE IF NOT EXISTS export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  export_type VARCHAR(50) NOT NULL CHECK (export_type IN (
    'ATTENDANCE', 'LEAVE', 'HR', 'PAYROLL', 'STUDENT', 'FACULTY', 'MASTER_REPORT'
  )),
  format VARCHAR(20) DEFAULT 'EXCEL' CHECK (format IN ('EXCEL', 'CSV', 'PDF', 'JSON')),
  filters JSONB,
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'
  )),
  file_url TEXT,
  file_size_bytes BIGINT,
  record_count INTEGER,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_requested_by ON export_jobs(requested_by);
CREATE INDEX IF NOT EXISTS idx_export_jobs_type ON export_jobs(export_type);

-- ============================================
-- 9. Super Admin Control Panel
-- ============================================
CREATE TABLE IF NOT EXISTS system_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(255) UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  config_type VARCHAR(50) DEFAULT 'STRING' CHECK (config_type IN (
    'STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'ARRAY'
  )),
  description TEXT,
  category VARCHAR(100),
  is_public BOOLEAN DEFAULT FALSE,
  requires_restart BOOLEAN DEFAULT FALSE,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permission_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) NOT NULL,
  permission_key VARCHAR(255) NOT NULL,
  granted BOOLEAN DEFAULT TRUE,
  conditions JSONB,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_configurations(config_key);
CREATE INDEX IF NOT EXISTS idx_role_permission_role ON role_permission_matrix(role);

-- ============================================
-- 10. Multi-Day Attendance Enhancements
-- ============================================
CREATE TABLE IF NOT EXISTS bulk_attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_students INTEGER DEFAULT 0,
  marked_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'IN_PROGRESS' CHECK (status IN (
    'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'CANCELLED'
  )),
  session_metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bulk_attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES bulk_attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'HOLIDAY')),
  marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bulk_attendance_sessions_status ON bulk_attendance_sessions(status);
CREATE INDEX IF NOT EXISTS idx_bulk_attendance_sessions_marked_by ON bulk_attendance_sessions(marked_by);
CREATE INDEX IF NOT EXISTS idx_bulk_attendance_logs_session ON bulk_attendance_logs(session_id);

-- ============================================
-- 11. Student Insight Profiles
-- ============================================
CREATE TABLE IF NOT EXISTS student_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  academic_year VARCHAR(20),
  semester VARCHAR(50),
  overall_attendance_percentage DECIMAL(5, 2),
  overall_performance_score DECIMAL(5, 2),
  risk_level VARCHAR(20) CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  risk_indicators TEXT[],
  behavior_flags TEXT[],
  attendance_trend VARCHAR(20) CHECK (attendance_trend IN ('IMPROVING', 'STABLE', 'DECLINING', 'VOLATILE')),
  performance_trend VARCHAR(20) CHECK (performance_trend IN ('IMPROVING', 'STABLE', 'DECLINING', 'VOLATILE')),
  last_updated_by UUID REFERENCES users(id),
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, academic_year, semester)
);

CREATE INDEX IF NOT EXISTS idx_student_insights_student ON student_insights(student_id);
CREATE INDEX IF NOT EXISTS idx_student_insights_risk_level ON student_insights(risk_level);

-- ============================================
-- 12. Smart Suggestions Engine
-- ============================================
CREATE TABLE IF NOT EXISTS suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_type VARCHAR(50) NOT NULL CHECK (suggestion_type IN (
    'ATTENDANCE', 'PERFORMANCE', 'BEHAVIOR', 'ADMINISTRATIVE', 'HR', 'SYSTEM', 'OTHER'
  )),
  target_entity_type VARCHAR(50) NOT NULL CHECK (target_entity_type IN (
    'STUDENT', 'FACULTY', 'EMPLOYEE', 'COURSE', 'DEPARTMENT', 'SYSTEM'
  )),
  target_entity_id UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  explanation TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  confidence_score DECIMAL(5, 2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  source_data JSONB,
  suggested_action TEXT,
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'ACKNOWLEDGED', 'IMPLEMENTED', 'REJECTED', 'ARCHIVED'
  )),
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP,
  implemented_by UUID REFERENCES users(id),
  implemented_at TIMESTAMP,
  implementation_notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suggestions_type ON suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_suggestions_target ON suggestions(target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_priority ON suggestions(priority);
