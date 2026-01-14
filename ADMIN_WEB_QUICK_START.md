# Admin Web Console - Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database running
- Backend server running on port 3000 (or configure `NEXT_PUBLIC_API_URL`)

## Backend Setup (One-time)

### 1. Run Database Migration

```bash
cd backend

# Option 1: Using migrate script
npm run migrate

# Option 2: Manual SQL execution
psql -d campusiq -f src/database/migrations/add_dynamic_roles_system.sql
```

### 2. Seed System Roles

```bash
npm run seed-roles
```

This creates:
- REGISTRAR role
- DEAN role
- DIRECTOR role
- EXECUTIVE role
- SUPER_ADMIN role (with all permissions)

### 3. Assign SUPER_ADMIN to Admin User

If your admin user doesn't have SUPER_ADMIN role, assign it:

```sql
-- Find admin user and SUPER_ADMIN role
SELECT u.id as user_id, r.id as role_id
FROM users u, roles r
WHERE u.email = 'admin@campusiq.edu' AND r.role_key = 'SUPER_ADMIN';

-- Assign role (replace UUIDs from above query)
INSERT INTO user_roles (user_id, role_id, assigned_by)
VALUES ('<user_id>', '<role_id>', '<user_id>')
ON CONFLICT (user_id, role_id) DO NOTHING;
```

## Web App Setup

### 1. Install Dependencies

```bash
cd admin-web
npm install
```

### 2. Configure Environment

Create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3001` (or next available port).

### 4. Login

Use your super admin credentials:
- **Email:** `admin@campusiq.edu`
- **Password:** `password123` (or your configured password)

## Features

### Dashboard
- Overview statistics
- Quick action cards

### Roles Management
- View all roles (system + custom)
- Create custom roles
- Edit role permissions
- Assign roles to users
- Delete custom roles (system roles protected)

### Capabilities
- View system capabilities
- Toggle capability status (stable/degraded/disabled)
- View health information

### Audit Logs
- Filterable audit trail
- Search by action, entity type, user
- View IP addresses and timestamps

## Production Deployment

### Build Web App

```bash
cd admin-web
npm run build
npm start
```

### Environment Variables

**Backend:**
- `JWT_SECRET` - JWT signing secret
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Backend server port (default: 3000)

**Web App:**
- `NEXT_PUBLIC_API_URL` - Backend API URL

## Troubleshooting

### "Super admin access required"
- Verify user has SUPER_ADMIN role in `user_roles` table
- Check `roles` table has SUPER_ADMIN role
- Clear browser cookies and re-login

### "Role not found"
- Run `npm run seed-roles` in backend
- Verify migration was successful

### API Connection Errors
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify backend server is running
- Check CORS settings in backend

### Permission Cache Issues
- Permission cache auto-clears on role changes
- If issues persist, restart backend server

## Security Notes

1. **Token Storage:** Currently uses `js-cookie`. For production, consider httpOnly cookies (requires server-side rendering).

2. **Super Admin Access:** Only users with SUPER_ADMIN role can access the admin console.

3. **System Roles:** Cannot be deleted or deactivated. This protects core functionality.

4. **Audit Logging:** All role operations are logged. Review audit logs regularly.

## Next Steps

1. Customize role permissions for your organization
2. Create custom roles for specific use cases
3. Review audit logs regularly
4. Monitor capability health status
5. Set up production environment variables

---

For detailed documentation, see `DYNAMIC_ROLE_MANAGEMENT_IMPLEMENTATION.md`
