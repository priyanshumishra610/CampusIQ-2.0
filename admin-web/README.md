# CampusIQ Admin Web Console

Super Admin web interface for managing roles, permissions, capabilities, and audit logs.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```bash
# Create .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
```

3. Run development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3001` (or next available port).

## Features

- **Authentication**: Login with super admin credentials
- **Dashboard**: Overview of system statistics
- **Roles Management**: Create, edit, and delete roles with permission assignment
- **Capabilities**: View and toggle system feature availability
- **Audit Logs**: Review system activity with filtering

## Default Login

Use the super admin account created during backend seeding:
- Email: `admin@campusiq.edu`
- Password: `password123`

## Production Build

```bash
npm run build
npm start
```
