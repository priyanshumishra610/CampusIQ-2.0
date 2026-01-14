# Dynamic Role Management System & Super Admin Web Console

## Executive Summary

This document describes the implementation of a **dynamic role management system** and **Super Admin web console** for CampusIQ. The system replaces hardcoded role enums with database-driven roles, enabling runtime role and permission management through a modern web interface.

---

## PART A — BACKEND: DYNAMIC ROLE SYSTEM

### 1. Database Schema

#### Migration: `backend/src/database/migrations/add_dynamic_roles_system.sql`

**Tables Created:**

1. **`roles`** - Stores all roles (system + custom)
   - `id` (UUID) - Primary key
   - `role_key` (VARCHAR) - Unique identifier (e.g., 'REGISTRAR', 'DEAN')
   - `name` (VARCHAR) - Human-readable name
   - `description` (TEXT) - Optional description
   - `is_system` (BOOLEAN) - System roles cannot be deleted
   - `is_active` (BOOLEAN) - Active/inactive flag
   - `created_by` (UUID) - User who created (for custom roles)
   - `created_at`, `updated_at` (TIMESTAMP)

2. **`role_permissions`** - Maps roles to permissions
   - `id` (UUID) - Primary key
   - `role_id` (UUID) - Foreign key to roles
   - `permission_key` (VARCHAR) - Permission identifier (e.g., 'task:create')
   - `granted` (BOOLEAN) - Permission granted/denied
   - Unique constraint on (role_id, permission_key)

3. **`user_roles`** - Maps users to roles (supports multiple roles per user)
   - `id` (UUID) - Primary key
   - `user_id` (UUID) - Foreign key to users
   - `role_id` (UUID) - Foreign key to roles
   - `assigned_by` (UUID) - User who assigned the role
   - `assigned_at` (TIMESTAMP)
   - Unique constraint on (user_id, role_id)

**Indexes:**
- `idx_roles_role_key` - Fast role lookups
- `idx_roles_is_system` - Filter system roles
- `idx_role_permissions_role_id` - Permission queries
- `idx_user_roles_user_id` - User role queries

### 2. Seed Script

**File:** `backend/src/database/seed-roles.js`

**System Roles Seeded:**
- `REGISTRAR` - 8 permissions
- `DEAN` - 16 permissions
- `DIRECTOR` - 22 permissions
- `EXECUTIVE` - 10 permissions
- `SUPER_ADMIN` - All permissions (via `system:*` wildcard)

**Run:** `node src/database/seed-roles.js`

### 3. Role Service

**File:** `backend/src/services/roleService.js`

**Key Functions:**
- `getUserRoles(userId)` - Get all roles for a user
- `getUserPermissions(userId)` - Get all permissions for a user (cached)
- `hasPermission(userId, permission)` - Check specific permission
- `hasAnyPermission(userId, permissions)` - Check any permission
- `hasAllPermissions(userId, permissions)` - Check all permissions
- `isSuperAdmin(userId)` - Check if user is super admin
- `clearPermissionCache(userId)` - Invalidate permission cache
- `getAllPermissions()` - Get all available permissions

**Features:**
- Permission caching (5-minute TTL)
- Support for multiple roles per user
- SUPER_ADMIN with `system:*` has all permissions
- Automatic cache invalidation on role changes

### 4. Updated Authorization Middleware

**File:** `backend/src/middleware/auth.js`

**Changes:**
- `authenticateToken` now loads roles and permissions from database
- Adds `roles`, `permissions`, and `isSuperAdmin` to `req.user`
- New `authorizePermission(permission)` middleware
- New `authorizeAnyPermission(...permissions)` middleware
- Updated `authorizeRoles(...roleKeys)` to check database roles

**Usage:**
```javascript
// Permission-based
router.get('/route', authenticateToken, authorizePermission('task:create'), handler);

// Role-based
router.get('/route', authenticateToken, authorizeRoles('DIRECTOR', 'DEAN'), handler);

// Any permission
router.get('/route', authenticateToken, authorizeAnyPermission('task:view', 'task:create'), handler);
```

### 5. Super Admin APIs

**File:** `backend/src/routes/admin/roles.js`

**Endpoints:**

#### GET `/api/admin/roles`
- List all roles with permissions
- Query params: `includeInactive` (boolean)

#### GET `/api/admin/roles/:id`
- Get single role with permissions

#### POST `/api/admin/roles`
- Create new custom role
- Body: `{ roleKey, name, description, permissions: string[] }`
- Validates role key format (uppercase with underscores)

#### PUT `/api/admin/roles/:id`
- Update role (name, description, permissions, isActive)
- System roles cannot be deactivated

#### DELETE `/api/admin/roles/:id`
- Delete custom role
- System roles cannot be deleted
- Cannot delete if assigned to users

#### POST `/api/admin/roles/:id/assign-user`
- Assign role to user
- Body: `{ userId }`

#### DELETE `/api/admin/roles/:id/assign-user/:userId`
- Remove role from user

#### GET `/api/admin/roles/permissions/list`
- Get all available permissions

**Security:**
- All routes require SUPER_ADMIN role
- All actions are audit-logged
- Permission cache cleared on changes

**Route Registration:**
```javascript
app.use('/api/admin/roles', adminRolesRoutes);
```

---

## PART B — WEB APP: SUPER ADMIN CONSOLE

### 6. Next.js Application Structure

**Location:** `/admin-web`

**Tech Stack:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Axios for API calls
- js-cookie for token storage

### 7. Authentication

**Files:**
- `admin-web/lib/auth.ts` - Auth utilities
- `admin-web/lib/api.ts` - API client with interceptors
- `admin-web/app/login/page.tsx` - Login page

**Features:**
- JWT token stored in cookie
- Automatic token injection in API requests
- Auto-redirect to login on 401
- Super admin check on login

### 8. Pages

#### Dashboard (`/dashboard`)
- **File:** `admin-web/app/dashboard/page.tsx`
- Overview statistics (roles, capabilities, audit logs, users)
- Quick action cards

#### Roles Management (`/roles`)
- **File:** `admin-web/app/roles/page.tsx`
- List all roles (system + custom)
- Create role modal with permission checkboxes
- Edit role modal
- Delete role (custom only)
- Permission assignment UI

#### Capabilities (`/capabilities`)
- **File:** `admin-web/app/capabilities/page.tsx`
- List all system capabilities
- Status indicators (stable/degraded/disabled)
- Toggle capability status
- View health information

#### Audit Logs (`/audit-logs`)
- **File:** `admin-web/app/audit-logs/page.tsx`
- Filterable audit log table
- Filters: action, entityType, userId
- Timestamp formatting
- IP address tracking

### 9. Layout Component

**File:** `admin-web/components/Layout.tsx`

**Features:**
- Responsive sidebar navigation
- Mobile hamburger menu
- Active route highlighting
- Logout button
- Protected route wrapper

---

## PART C — QUALITY & INTEGRATION

### 10. Audit Logging

**All Role Operations Logged:**
- `ROLE_CREATED` - New role created
- `ROLE_UPDATED` - Role modified
- `ROLE_DELETED` - Role removed
- `ROLE_ASSIGNED` - Role assigned to user
- `ROLE_REMOVED` - Role removed from user

**Audit Log Fields:**
- User ID, action, entity type, entity ID
- IP address, timestamp
- Details (JSONB) with change information

### 11. Error Standardization

**All APIs use standardized errors:**
- `PERMISSION_DENIED` (403) - Insufficient permissions
- `AUTH_REQUIRED` (401) - Authentication required
- `INVALID_INPUT` (400) - Invalid request data
- `NOT_FOUND` (404) - Resource not found

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Super admin access required",
    "details": {}
  }
}
```

### 12. Capability Registry Integration

**When roles change:**
- Permission cache is cleared
- Capability registry remains unchanged (separate system)
- Role changes don't affect capability status

---

## SETUP INSTRUCTIONS

### Backend Setup

1. **Run Migration:**
```bash
cd backend
node src/database/migrate.js
# Or manually run: psql -d campusiq -f src/database/migrations/add_dynamic_roles_system.sql
```

2. **Seed System Roles:**
```bash
node src/database/seed-roles.js
```

3. **Verify Super Admin User:**
```bash
# Check if admin user has SUPER_ADMIN role
# If not, assign it via:
# INSERT INTO user_roles (user_id, role_id, assigned_by)
# SELECT u.id, r.id, u.id
# FROM users u, roles r
# WHERE u.email = 'admin@campusiq.edu' AND r.role_key = 'SUPER_ADMIN';
```

### Web App Setup

1. **Install Dependencies:**
```bash
cd admin-web
npm install
```

2. **Configure Environment:**
```bash
# Create .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
```

3. **Run Development Server:**
```bash
npm run dev
```

4. **Access:**
- URL: `http://localhost:3001` (or next available port)
- Login: `admin@campusiq.edu` / `password123`

### Production Build

**Web App:**
```bash
cd admin-web
npm run build
npm start
```

**Backend:**
- Ensure migrations are run
- Ensure roles are seeded
- Set `NODE_ENV=production`

---

## API SUMMARY

### Role Management Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/roles` | List all roles | SUPER_ADMIN |
| GET | `/api/admin/roles/:id` | Get role | SUPER_ADMIN |
| POST | `/api/admin/roles` | Create role | SUPER_ADMIN |
| PUT | `/api/admin/roles/:id` | Update role | SUPER_ADMIN |
| DELETE | `/api/admin/roles/:id` | Delete role | SUPER_ADMIN |
| POST | `/api/admin/roles/:id/assign-user` | Assign role | SUPER_ADMIN |
| DELETE | `/api/admin/roles/:id/assign-user/:userId` | Remove role | SUPER_ADMIN |
| GET | `/api/admin/roles/permissions/list` | List permissions | SUPER_ADMIN |

### Existing Endpoints (Used by Web App)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login (returns `isSuperAdmin`) |
| GET | `/api/admin/super-admin/capabilities` | List capabilities |
| PUT | `/api/admin/super-admin/capabilities/:id/status` | Update capability |
| GET | `/api/audit` | List audit logs |

---

## MIGRATION NOTES

### Breaking Changes

**None** - The system is backward compatible:
- Existing users continue to work
- Hardcoded roles still function (via `users.role` and `users.admin_role`)
- New system adds database roles as additional layer

### Migration Path

1. Run migration to create tables
2. Seed system roles
3. Existing users automatically get roles from `users.role` and `users.admin_role`
4. Gradually migrate to `user_roles` table for custom assignments
5. Old hardcoded checks continue to work during transition

### Rollback

If needed, the old permission system in `app/config/permissions.ts` can still be used. The new system is additive.

---

## SECURITY CONSIDERATIONS

1. **Super Admin Only:** All role management requires SUPER_ADMIN
2. **System Role Protection:** System roles cannot be deleted or deactivated
3. **Audit Trail:** All role operations are logged
4. **Permission Validation:** Invalid permissions are rejected
5. **Cache Invalidation:** Permission cache cleared on role changes
6. **Token Security:** JWT tokens in cookies (consider httpOnly in production)

---

## FILES CREATED/MODIFIED

### Backend Files

**New Files:**
- `backend/src/database/migrations/add_dynamic_roles_system.sql`
- `backend/src/database/seed-roles.js`
- `backend/src/services/roleService.js`
- `backend/src/routes/admin/roles.js`

**Modified Files:**
- `backend/src/middleware/auth.js` - Added database role resolution
- `backend/src/routes/auth.js` - Added `isSuperAdmin` to login response
- `backend/src/server.js` - Added roles route

### Web App Files

**New Files:**
- `admin-web/package.json`
- `admin-web/tsconfig.json`
- `admin-web/tailwind.config.js`
- `admin-web/next.config.js`
- `admin-web/app/layout.tsx`
- `admin-web/app/globals.css`
- `admin-web/app/login/page.tsx`
- `admin-web/app/dashboard/page.tsx`
- `admin-web/app/roles/page.tsx`
- `admin-web/app/capabilities/page.tsx`
- `admin-web/app/audit-logs/page.tsx`
- `admin-web/components/Layout.tsx`
- `admin-web/lib/api.ts`
- `admin-web/lib/auth.ts`
- `admin-web/README.md`

---

## TESTING CHECKLIST

- [ ] Run migration successfully
- [ ] Seed system roles
- [ ] Login as super admin
- [ ] Create custom role
- [ ] Edit role permissions
- [ ] Assign role to user
- [ ] Delete custom role
- [ ] Verify system roles cannot be deleted
- [ ] Check audit logs for role operations
- [ ] Toggle capability status
- [ ] View audit logs with filters
- [ ] Verify permission cache invalidation

---

## FUTURE ENHANCEMENTS

1. **Role Templates:** Pre-configured role templates
2. **Bulk Operations:** Assign roles to multiple users
3. **Role Hierarchy:** Parent-child role relationships
4. **Time-based Permissions:** Temporary role assignments
5. **Permission Groups:** Organize permissions into groups
6. **Role Analytics:** Usage statistics and reports
7. **Export/Import:** Backup and restore role configurations

---

## SUPPORT

For issues or questions:
1. Check audit logs for role operation errors
2. Verify SUPER_ADMIN role assignment
3. Check permission cache (clear if needed)
4. Review database constraints and indexes

---

**Implementation Date:** 2024
**Status:** ✅ Complete
**Version:** 1.0.0
