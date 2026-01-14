# Panel Builder System Implementation

## Executive Summary

The Panel Builder System is a first-class platform feature that enables creation of customizable workspace configurations. Panels define identity, capabilities, navigation, permissions, and visual themes - separating workspace views from role-based permissions.

---

## PART A — BACKEND: PANEL SYSTEM (CORE)

### 1. Database Schema

**Migration:** `backend/src/database/migrations/add_panels_system.sql`

**Tables Created:**

1. **`panels`** - Core panel entity
   - `id` (UUID) - Primary key
   - `name` (VARCHAR) - Panel name
   - `description` (TEXT) - Panel description
   - `theme_config` (JSONB) - Visual theme configuration
   - `navigation_config` (JSONB) - Navigation structure
   - `capability_overrides` (JSONB) - Panel-specific capability status
   - `permission_set` (TEXT[]) - Permissions granted by panel
   - `is_system_panel` (BOOLEAN) - System panels cannot be deleted
   - `status` (VARCHAR) - draft/published/archived
   - `created_by`, `created_at`, `updated_at`

2. **`user_panels`** - User-panel assignments
   - `user_id` (UUID) - User reference
   - `panel_id` (UUID) - Panel reference
   - `is_default` (BOOLEAN) - Default panel flag
   - `assigned_by`, `assigned_at`
   - Unique constraint on (user_id, panel_id)

3. **`panel_capabilities`** - Panel capability overrides tracking
   - `panel_id` (UUID) - Panel reference
   - `capability_id` (VARCHAR) - Capability identifier
   - `status` (VARCHAR) - Override status
   - `reason` (TEXT) - Override reason

### 2. Panel Service

**File:** `backend/src/services/panelService.js`

**Key Functions:**
- `getUserPanels(userId)` - Get all panels for user
- `getDefaultPanel(userId)` - Get user's default panel
- `getPanel(panelId)` - Get panel by ID
- `getAllPanels(options)` - List all panels (admin)
- `createPanel(panelData)` - Create new panel
- `updatePanel(panelId, updates)` - Update panel
- `clonePanel(panelId, newName, createdBy)` - Clone panel
- `deletePanel(panelId)` - Delete panel (if unused)
- `assignPanelToUser(userId, panelId, assignedBy, isDefault)` - Assign panel
- `removePanelFromUser(userId, panelId)` - Remove panel assignment
- `getPanelCapabilities(panelId)` - Get panel capabilities with overrides
- `getPanelPermissions(panelId)` - Get panel permissions

### 3. Panel APIs

**File:** `backend/src/routes/admin/panels.js`

**Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/panels` | List all panels |
| GET | `/api/admin/panels/:id` | Get panel details |
| POST | `/api/admin/panels` | Create panel |
| PUT | `/api/admin/panels/:id` | Update panel |
| POST | `/api/admin/panels/:id/clone` | Clone panel |
| DELETE | `/api/admin/panels/:id` | Delete panel |
| POST | `/api/admin/panels/:id/assign-user` | Assign panel to user |
| DELETE | `/api/admin/panels/:id/assign-user/:userId` | Remove panel from user |
| POST | `/api/admin/panels/:id/publish` | Publish panel (draft → published) |

**Security:**
- All routes require SUPER_ADMIN role
- All actions are audit-logged
- System panels cannot be deleted

### 4. Auth Integration

**Updated Files:**
- `backend/src/routes/auth.js` - Login now returns user panels
- `backend/src/middleware/auth.js` - Includes default panel in req.user

**Login Response Now Includes:**
```json
{
  "user": {
    "panels": [...],
    "defaultPanel": {...}
  }
}
```

---

## PART B — SUPER ADMIN WEB: PANEL BUILDER UI

### 5. Panel Builder Interface

**Files:**
- `admin-web/app/panels/page.tsx` - Panel list page
- `admin-web/app/panels/[id]/page.tsx` - Panel builder page

**Features:**
- **Panel List**: View all panels with status, user count, actions
- **Create Panel**: Quick creation with default config
- **Panel Builder**: Full editor with tabs:
  - **Theme Tab**: Color pickers, mode selector, logo URL
  - **Navigation Tab**: Drag-and-drop module ordering, show/hide
  - **Capabilities Tab**: Override capability status per panel
  - **Permissions Tab**: Select permissions granted by panel

### 6. Live Preview

**Component:** `PanelPreview` in `admin-web/app/panels/[id]/page.tsx`

**Features:**
- Real-time sidebar preview
- Header color preview
- Light/dark mode toggle
- Navigation structure preview
- Responsive layout preview

### 7. Publish Flow

**Status Workflow:**
- `draft` → Edit and preview
- `published` → Available for assignment
- `archived` → Hidden but preserved

**Publish Action:**
- Changes status from `draft` to `published`
- Audit logged
- Becomes available for user assignment

---

## PART C — LOGIN & PANEL RESOLUTION

### 8. Panel Resolution on Login

**Flow:**
1. User logs in
2. Backend returns user's panels and default panel
3. Frontend stores panels in context
4. If multiple panels: show selection modal
5. If single panel: auto-select
6. If default panel exists: use it
7. Apply panel theme and navigation

**Files:**
- `admin-web/app/login/page.tsx` - Panel selection modal
- `admin-web/app/page.tsx` - Panel initialization
- `admin-web/lib/panelContext.tsx` - Panel state management

### 9. Dynamic Theme & Navigation

**Implementation:**
- `admin-web/components/Layout.tsx` - Applies panel theme/navigation
- Theme colors applied via inline styles
- Navigation filtered and ordered by panel config
- Hidden modules excluded from navigation

**Theme Application:**
- Primary color for active states
- Mode (light/dark) for background colors
- Secondary color for accents
- Logo URL support (future)

**Navigation Application:**
- Modules filtered by `navigationConfig.modules`
- Order applied from `navigationConfig.order`
- Hidden modules excluded via `navigationConfig.hidden`

---

## SEPARATION: PANEL vs ROLE

### Key Differences

| Aspect | Role | Panel |
|--------|------|-------|
| **Purpose** | Permissions | Workspace/View |
| **Scope** | What user CAN do | How user SEES system |
| **Granularity** | Permission-level | Module-level |
| **Customization** | Permissions only | Theme + Navigation + Capabilities |
| **Assignment** | One-to-many | Many-to-many |

### Relationship

- **Roles** define permissions (what actions are allowed)
- **Panels** define workspace (what UI is shown, how it looks)
- **Users** can have multiple roles AND multiple panels
- **Panels** can grant permissions (via `permission_set`)
- **Panels** can override capabilities (via `capability_overrides`)

---

## SETUP INSTRUCTIONS

### Backend Setup

1. **Run Migration:**
```bash
cd backend
npm run migrate
# Or manually: psql -d campusiq -f src/database/migrations/add_panels_system.sql
```

2. **Seed System Panels:**
```bash
npm run seed-panels
```

This creates:
- **Super Admin Panel** - Full access, all modules
- **Operations Panel** - Limited access, specific modules

### Web App Setup

The panel builder is already integrated into the admin web app.

**Access:**
1. Login to admin web
2. Navigate to **Panels** in sidebar
3. Click **Create Panel** or edit existing
4. Use Panel Builder to customize

---

## API SUMMARY

### Panel Management Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/panels` | List panels | SUPER_ADMIN |
| GET | `/api/admin/panels/:id` | Get panel | SUPER_ADMIN |
| POST | `/api/admin/panels` | Create panel | SUPER_ADMIN |
| PUT | `/api/admin/panels/:id` | Update panel | SUPER_ADMIN |
| POST | `/api/admin/panels/:id/clone` | Clone panel | SUPER_ADMIN |
| DELETE | `/api/admin/panels/:id` | Delete panel | SUPER_ADMIN |
| POST | `/api/admin/panels/:id/assign-user` | Assign panel | SUPER_ADMIN |
| DELETE | `/api/admin/panels/:id/assign-user/:userId` | Remove panel | SUPER_ADMIN |
| POST | `/api/admin/panels/:id/publish` | Publish panel | SUPER_ADMIN |

### Updated Endpoints

| Method | Endpoint | Change |
|--------|----------|--------|
| POST | `/api/auth/login` | Now returns `user.panels` and `user.defaultPanel` |

---

## USAGE EXAMPLES

### Creating a Custom Panel

1. Navigate to `/panels`
2. Click **Create Panel**
3. Enter name and description
4. Click **Create**
5. Edit panel:
   - **Theme**: Set colors and mode
   - **Navigation**: Add/remove/reorder modules
   - **Capabilities**: Override capability status
   - **Permissions**: Select permissions
6. Click **Save**
7. Click **Publish** when ready

### Assigning Panel to User

1. Go to panel detail page
2. Use API: `POST /api/admin/panels/:id/assign-user`
   ```json
   {
     "userId": "user-uuid",
     "isDefault": true
   }
   ```

### Cloning a Panel

1. In panel list, click clone icon
2. Enter new name
3. Panel is cloned with all configurations
4. Edit as needed

---

## ARCHITECTURE NOTES

### Panel vs Role Separation

**Roles** are about **authorization**:
- What permissions does user have?
- What actions can they perform?
- Database-driven, cached for performance

**Panels** are about **presentation**:
- What modules are visible?
- What does the UI look like?
- What theme is applied?
- Customizable per workspace

### Capability Overrides

Panels can override system-wide capability status:
- System capability: `attendance` = `stable`
- Panel override: `attendance` = `degraded`
- Users with this panel see degraded status
- Other users see stable status

### Permission Sets

Panels can grant permissions:
- Panel `permission_set` = `['task:create', 'task:view']`
- Users assigned this panel get these permissions
- Works alongside role-based permissions
- Union of all permissions (role + panel) is user's effective permissions

---

## FILES CREATED/MODIFIED

### Backend Files

**New:**
- `backend/src/database/migrations/add_panels_system.sql`
- `backend/src/services/panelService.js`
- `backend/src/routes/admin/panels.js`
- `backend/src/database/seed-panels.js`

**Modified:**
- `backend/src/routes/auth.js` - Added panel data to login response
- `backend/src/middleware/auth.js` - Added default panel to req.user
- `backend/src/server.js` - Added panels route

### Web App Files

**New:**
- `admin-web/app/panels/page.tsx` - Panel list
- `admin-web/app/panels/[id]/page.tsx` - Panel builder
- `admin-web/lib/panelContext.tsx` - Panel state management

**Modified:**
- `admin-web/lib/auth.ts` - Added Panel interface
- `admin-web/app/layout.tsx` - Added PanelProvider
- `admin-web/components/Layout.tsx` - Dynamic theme/navigation
- `admin-web/app/login/page.tsx` - Panel selection
- `admin-web/app/page.tsx` - Panel initialization

---

## FUTURE ENHANCEMENTS

1. **Panel Templates**: Pre-built panel configurations
2. **Panel Sharing**: Share panels across organizations
3. **Panel Versioning**: Track panel changes over time
4. **Custom CSS**: Advanced theme customization
5. **Module Builder**: Create custom modules
6. **Panel Analytics**: Usage statistics per panel
7. **Bulk Assignment**: Assign panels to multiple users
8. **Panel Permissions**: Control who can edit panels

---

**Implementation Date:** 2024
**Status:** ✅ Complete
**Version:** 1.0.0
