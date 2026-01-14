# Panel Builder System - Quick Start

## What is a Panel?

A **Panel** is a customizable workspace configuration that defines:
- **Theme**: Colors, light/dark mode, logo
- **Navigation**: Which modules are visible and in what order
- **Capabilities**: Override system capability status
- **Permissions**: Additional permissions granted to users

Panels are **separate from Roles**:
- **Roles** = What you CAN do (permissions)
- **Panels** = How you SEE the system (workspace)

## Quick Setup

### 1. Run Database Migration

```bash
cd backend
npm run migrate
```

### 2. Seed System Panels

```bash
npm run seed-panels
```

This creates:
- **Super Admin Panel** - Full access
- **Operations Panel** - Limited access

### 3. Access Panel Builder

1. Login to admin web (`/login`)
2. Navigate to **Panels** in sidebar
3. Click **Create Panel** or edit existing

## Creating Your First Panel

1. **Create Panel**
   - Name: "My Custom Panel"
   - Description: "Custom workspace for my team"

2. **Configure Theme** (Theme Tab)
   - Select primary color
   - Select secondary color
   - Choose light/dark mode
   - See live preview update

3. **Configure Navigation** (Navigation Tab)
   - Add modules: Dashboard, Roles, Capabilities
   - Drag to reorder
   - Hide modules you don't need
   - See sidebar preview update

4. **Override Capabilities** (Capabilities Tab)
   - Change capability status for this panel
   - Example: Set "attendance" to "degraded" for this panel only

5. **Set Permissions** (Permissions Tab)
   - Select permissions granted by this panel
   - Users assigned this panel get these permissions

6. **Save & Publish**
   - Click **Save** to save draft
   - Click **Publish** to make available
   - Panel is now ready for assignment

## Assigning Panels to Users

### Via API:
```bash
POST /api/admin/panels/:panelId/assign-user
{
  "userId": "user-uuid",
  "isDefault": true
}
```

### Via UI (Future):
- User management page
- Panel assignment interface

## Panel Selection on Login

When user logs in:
- If user has **1 panel**: Auto-selected
- If user has **multiple panels**: Selection modal shown
- If user has **default panel**: Used automatically
- Panel theme and navigation applied immediately

## Key Concepts

### Panel Status
- **draft**: Being edited, not available
- **published**: Available for assignment
- **archived**: Hidden but preserved

### System vs Custom Panels
- **System panels**: Cannot be deleted, seeded on migration
- **Custom panels**: Created by admins, can be deleted if unused

### Panel Capabilities
- Panels can override system-wide capability status
- Example: System says "attendance" is "stable", but Panel says "degraded"
- Users with that panel see degraded status

### Panel Permissions
- Panels can grant additional permissions
- Works alongside role-based permissions
- User's effective permissions = union of role + panel permissions

## Example Use Cases

### 1. Department-Specific Panel
- **Theme**: Department colors
- **Navigation**: Only relevant modules
- **Permissions**: Department-specific permissions

### 2. Read-Only Panel
- **Navigation**: Dashboard, Reports only
- **Permissions**: View-only permissions
- **Capabilities**: All enabled

### 3. Maintenance Panel
- **Theme**: Warning colors
- **Navigation**: Minimal
- **Capabilities**: Some disabled
- **Permissions**: Limited

## Troubleshooting

### Panel not showing in login
- Check panel status is "published"
- Verify user is assigned to panel
- Check user has SUPER_ADMIN role

### Theme not applying
- Verify panel is selected (check cookie)
- Check panel themeConfig is valid JSON
- Refresh page after panel change

### Navigation not updating
- Verify navigationConfig.modules includes module IDs
- Check navigationConfig.hidden doesn't hide all modules
- Ensure module IDs match available modules

---

For detailed documentation, see `PANEL_BUILDER_SYSTEM_IMPLEMENTATION.md`
