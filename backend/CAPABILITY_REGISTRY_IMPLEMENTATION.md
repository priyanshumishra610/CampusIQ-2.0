# Capability Registry & Feature Health Implementation Report

## Executive Summary

This document summarizes the implementation of a centralized Capability Registry and Feature Health system for CampusIQ. The system provides self-awareness of its capabilities, enabling safe feature gating, operational visibility, and graceful degradation.

## Phase 1: Capability Registry ✅

### 1.1 Database Schema

**Table: `capabilities`**
- `id` (UUID) - Primary key
- `capability_id` (VARCHAR) - Unique identifier (e.g., 'attendance', 'leave')
- `name` (VARCHAR) - Human-readable name
- `status` (VARCHAR) - Status: 'stable', 'degraded', or 'disabled'
- `reason` (TEXT) - Optional explanation for status
- `owner_module` (VARCHAR) - Module/service that owns this capability
- `last_checked` (TIMESTAMP) - Last health check timestamp
- `last_error` (TEXT) - Most recent error message
- `metadata` (JSONB) - Additional metadata
- `created_at`, `updated_at` (TIMESTAMP)

**Migration:** `src/database/migrations/add_capabilities_table.sql`

### 1.2 Registered Capabilities

The following capabilities are registered in the system:

1. **attendance** - Attendance Management
   - Owner: `attendance`
   - Status: `stable`

2. **leave** - Leave Management
   - Owner: `hr`
   - Status: `stable`

3. **payroll** - Payroll Processing
   - Owner: `hr`
   - Status: `stable`

4. **audit** - Audit Logging
   - Owner: `audit`
   - Status: `stable`

5. **security** - Security Features
   - Owner: `security`
   - Status: `stable`

6. **academic_intelligence** - Academic Intelligence
   - Owner: `ai`
   - Status: `stable`

7. **crowd_intelligence** - Crowd Intelligence
   - Owner: `ai`
   - Status: `stable`

8. **exports** - Data Exports
   - Owner: `admin`
   - Status: `stable`

9. **community** - Community Features
   - Owner: `community`
   - Status: `stable`

**Seed Script:** `src/database/seed-capabilities.js`
**Run:** `npm run seed-capabilities`

## Phase 2: Feature Health Integration ✅

### 2.1 Capability Registry Service

**Service:** `src/services/capabilityRegistry.js`

**Key Functions:**
- `getCapability(capabilityId)` - Get capability by ID
- `getAllCapabilities()` - Get all capabilities
- `checkCapability(capabilityId)` - Check if capability is available
- `requireCapability(capabilityId)` - Require capability (throws if disabled)
- `updateCapabilityStatus(...)` - Update capability status (admin only)
- `registerCapability(...)` - Register new capability
- `recordCapabilityCheck(...)` - Record health check
- `getHealthSummary()` - Get status summary
- `getCapabilityWithErrors(...)` - Get capability with error history

### 2.2 Middleware Integration

**Middleware:** `src/middleware/capabilityCheck.js`

**Two Middleware Types:**

1. **`capabilityRequired(capabilityId)`**
   - Throws `FEATURE_DISABLED` error if capability is disabled
   - Used for critical features that must be available
   - Applied to: attendance, leave, payroll, audit routes

2. **`capabilityChecked(capabilityId)`**
   - Allows degraded mode (doesn't throw on degraded)
   - Adds degraded status to response
   - Used for optional features that can degrade gracefully
   - Applied to: AI routes

**Helper Function:**
- `addCapabilityStatusToResponse(req, data)` - Adds degraded status to response

### 2.3 Route Integration

**Routes with Capability Checks:**

1. **Attendance** (`src/routes/attendance.js`)
   ```javascript
   router.use(capabilityRequired('attendance'));
   ```

2. **Leave** (`src/routes/hr/leave.js`)
   ```javascript
   router.use(capabilityRequired('leave'));
   ```

3. **Payroll** (`src/routes/hr/payroll.js`)
   ```javascript
   router.use(capabilityRequired('payroll'));
   ```

4. **Audit** (`src/routes/audit.js`)
   ```javascript
   router.use(capabilityRequired('audit'));
   ```

5. **AI** (`src/routes/ai.js`)
   ```javascript
   router.use(capabilityChecked('academic_intelligence'));
   // Responses include degraded status if applicable
   ```

## Phase 3: Admin & Ops Visibility ✅

### 3.1 Admin Endpoints

**Route:** `src/routes/admin/capabilities.js`
**Base Path:** `/api/admin/capabilities`

**Endpoints:**

1. **GET `/api/admin/capabilities`**
   - Get all capabilities with summary
   - Response includes status counts
   - Requires: ADMIN role

2. **GET `/api/admin/capabilities/:id`**
   - Get specific capability with error history
   - Includes recent audit events
   - Requires: ADMIN role

3. **PUT `/api/admin/capabilities/:id/status`**
   - Update capability status
   - Body: `{status, reason?, lastError?}`
   - Audit-logged automatically
   - Requires: ADMIN role

4. **GET `/api/admin/capabilities/health/summary`**
   - Get health summary (counts by status)
   - Quick overview for dashboards
   - Requires: ADMIN role

**Integration:** Added to `src/server.js`:
```javascript
app.use('/api/admin/capabilities', adminCapabilitiesRoutes);
```

## Phase 4: Safety & Discipline ✅

### 4.1 Audit Logging

**Capability Changes are Audit-Logged:**
- Action: `CAPABILITY_STATUS_UPDATED`
- Entity Type: `capability`
- Includes: old status, new status, reason
- Captures: userId, IP address, timestamp

**Example Audit Entry:**
```json
{
  "action": "CAPABILITY_STATUS_UPDATED",
  "entityType": "capability",
  "entityId": "attendance",
  "details": {
    "capabilityId": "attendance",
    "capabilityName": "Attendance Management",
    "oldStatus": "stable",
    "newStatus": "degraded",
    "reason": "Database connection issues"
  }
}
```

### 4.2 Authorization

**Only ADMIN Role Can:**
- View all capabilities
- Update capability status
- Access health summaries

**Enforced via:** `authorizeRoles('ADMIN')` middleware

### 4.3 No Hardcoded Feature Flags

**All Feature Flags Centralized:**
- No scattered `if (featureEnabled)` checks
- All checks go through capability registry
- Status stored in database (not code)
- Can be updated without code changes

## Usage Examples

### Example 1: Check Capability in Service

```javascript
const {requireCapability} = require('../services/capabilityRegistry');

async function processAttendance() {
  // Throws FEATURE_DISABLED if attendance is disabled
  await requireCapability('attendance');
  
  // Proceed with attendance processing
}
```

### Example 2: Update Capability Status (Admin)

```bash
PUT /api/admin/capabilities/attendance/status
{
  "status": "degraded",
  "reason": "Database connection issues detected",
  "lastError": "Connection timeout after 5s"
}
```

### Example 3: Get Capability Health

```bash
GET /api/admin/capabilities/health/summary

Response:
{
  "success": true,
  "data": {
    "total": 9,
    "stable": 8,
    "degraded": 1,
    "disabled": 0
  }
}
```

## Benefits

1. **Self-Awareness:** System knows its own capabilities and health
2. **Safe Degradation:** Features can be disabled gracefully
3. **Operational Visibility:** Admins can see system health at a glance
4. **Feature Gating:** Easy to disable features without code changes
5. **Audit Trail:** All capability changes are logged
6. **No Code Changes:** Status updates don't require deployments

## Current Status Summary

**All Capabilities:** `stable` (9/9)

- ✅ attendance - Stable
- ✅ leave - Stable
- ✅ payroll - Stable
- ✅ audit - Stable
- ✅ security - Stable
- ✅ academic_intelligence - Stable
- ✅ crowd_intelligence - Stable
- ✅ exports - Stable
- ✅ community - Stable

## Next Steps

1. **Health Checks:** Implement periodic health checks that update capability status
2. **Monitoring Integration:** Connect to monitoring systems to auto-update status
3. **Alerting:** Set up alerts when capabilities degrade or disable
4. **Dashboard:** Create admin dashboard showing capability health
5. **Metrics:** Track capability uptime and error rates

## Migration Instructions

1. **Run Migration:**
   ```bash
   # Apply the capabilities table migration
   psql -d campusiq -f src/database/migrations/add_capabilities_table.sql
   ```

2. **Seed Capabilities:**
   ```bash
   npm run seed-capabilities
   ```

3. **Verify:**
   ```bash
   # Check capabilities are registered
   GET /api/admin/capabilities
   ```

---

**Implementation Date:** 2024
**Status:** Complete
**Impact:** High - Provides system self-awareness and operational control
