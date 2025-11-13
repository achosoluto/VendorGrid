# Vendor Network Platform

A secure B2B SaaS application that creates a centralized, verified database of vendor information. Vendors manage a single, secure profile that can be shared across multiple enterprise customers, eliminating redundant paperwork and ensuring data accuracy.

## Features

### Core Functionality
- **Single Vendor Profile**: Vendors maintain one verified profile for all enterprise customers
- **End-to-End Encryption**: AES-256-GCM encryption for sensitive banking information
- **Immutable Audit Logging**: Complete audit trail of all profile changes
- **Data Provenance Tracking**: Track the origin and verification method for each data point
- **Access History**: Transparency of who viewed vendor information
- **Rate Limiting**: Protection against API abuse (5/20/100 requests per 15min for auth/write/read)
- **Audit Log Exports**: JSON and CSV export formats for compliance (SOC 2, GDPR)

### Security Features
- Multi-factor authentication via Replit Auth
- Session-based authentication with PostgreSQL storage
- AES-256-GCM encryption for sensitive data at rest
- TLS encryption for data in transit
- Role-based access control (RBAC)
- Comprehensive rate limiting on all endpoints

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tool and development server
- **Wouter** - Lightweight client-side routing
- **TanStack Query** - Server state management
- **Tailwind CSS** + **shadcn/ui** - Styling and component library
- **React Hook Form** + **Zod** - Form handling and validation

### Backend
- **Node.js** with **Express.js**
- **TypeScript** - Type safety
- **Drizzle ORM** - Type-safe database queries
- **Neon Serverless PostgreSQL** - Managed database
- **Passport.js** - Authentication middleware
- **Replit Auth (OIDC)** - Authentication provider

## Getting Started

### Prerequisites
- Node.js 18+ installed
- (Optional) PostgreSQL database for production-like testing

### Local Development Setup

The application includes a **local development mode** that allows you to run the server without Replit authentication or a database. This is perfect for local development and testing.

#### Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Copy the example environment file
cp .env.example .env

# 3. Start development server
npm run dev
```

The application will be available at `http://localhost:5000`

**What happens in local dev mode:**
- Automatic mock authentication (no Replit Auth required)
- In-memory session storage (no PostgreSQL required for sessions)
- Optional database connection (works without DATABASE_URL)
- Access the app and it will auto-login as a test user

#### Environment Variables

The `.env` file created from `.env.example` includes:

```bash
# Local Development Mode - bypasses Replit auth
LOCAL_DEV_MODE=true

# Session Secret - Required (can be any string for local dev)
SESSION_SECRET=local-dev-secret-key-change-in-production

# Database URL - Optional for local dev
# DATABASE_URL=postgresql://localhost:5432/vendorgrid

# Server Port - Default: 5000
PORT=5000
```

### Production Setup (Replit/Deployed Environment)

For production deployment with full authentication and database:

```bash
# Disable local dev mode
LOCAL_DEV_MODE=false

# PostgreSQL connection string (required in production)
DATABASE_URL=postgresql://...

# Strong session secret (generate with: openssl rand -base64 32)
SESSION_SECRET=your-secret-key-here

# Replit Auth configuration (required in production)
REPL_ID=your-repl-id
REPLIT_DOMAINS=your-domain.replit.dev
ISSUER_URL=https://replit.com/oidc
```

```bash
# Install dependencies
npm install

# Push database schema to your PostgreSQL database
npm run db:push

# Start production server
npm start
```

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and helpers
│   │   ├── pages/         # Page components
│   │   └── App.tsx        # Main application component
│   └── index.html
├── server/                # Backend Express application
│   ├── dataIngestion/    # Data ingestion pipeline
│   ├── scripts/          # Utility scripts
│   ├── db.ts             # Database connection
│   ├── encryption.ts     # Encryption utilities
│   ├── replitAuth.ts     # Authentication setup
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Database storage layer
│   └── index.ts          # Server entry point
├── shared/               # Shared code between frontend and backend
│   └── schema.ts         # Database schema and types
└── docs/                 # Documentation
    └── operational-runbooks.md
```

## Database Schema

### Core Tables

1. **users** - User accounts linked to Replit Auth
2. **vendorProfiles** - Company information, contact details, encrypted banking data
3. **auditLogs** - Immutable audit trail of all profile changes
4. **accessLogs** - Track who viewed vendor information
5. **dataProvenance** - Origin and verification method for each data point
6. **sessions** - Session storage for authentication

### Relationships

- One-to-one: Users → Vendor Profiles
- One-to-many: Vendor Profiles → Audit Logs, Access Logs, Provenance Records

## API Endpoints

### Authentication
- `GET /api/login` - Initiate login flow
- `GET /api/callback` - OAuth callback
- `GET /api/logout` - Logout user
- `GET /api/auth/user` - Get current user

### Vendor Profiles
- `GET /api/vendor-profile` - Get vendor profile for logged-in user
- `POST /api/vendor-profile` - Create vendor profile
- `PATCH /api/vendor-profile/:id` - Update vendor profile

### Audit & Compliance
- `GET /api/vendor-profile/:id/audit-logs` - Get audit logs
- `GET /api/vendor-profile/:id/audit-logs/export` - Export audit logs (JSON/CSV)
- `GET /api/vendor-profile/:id/access-logs` - Get access logs
- `GET /api/vendor-profile/:id/provenance` - Get data provenance

### Data Ingestion (Demo)
- `POST /api/data-ingestion/start` - Start ingestion pipeline
- `GET /api/data-ingestion/status` - Get ingestion status
- `GET /api/data-ingestion/recent-activities` - Get recent activities

## Development

### Database Migrations

```bash
# Push schema changes to database
npm run db:push

# Force push (use when db:push shows data-loss warning)
npm run db:push --force
```

### Running Tests

```bash
# Run encryption tests
npx tsx server/encryption.test.ts
```

### Code Style
- TypeScript strict mode enabled
- ESLint for code quality
- Consistent formatting with Prettier

## Security Best Practices

### Encryption
- Banking information encrypted with AES-256-GCM
- Unique salt and IV per encryption operation
- Authentication tags verify data integrity

### Authentication
- Multi-factor authentication required
- Session-based auth with secure cookies
- Automatic token refresh
- HTTPS enforced in production

### Rate Limiting
- Auth endpoints: 5 requests/15min
- Write operations: 20 requests/15min
- Read operations: 100 requests/15min

## Compliance

### Audit Trail
- All profile changes logged immutably
- Actor, action, timestamp, and field changes tracked
- Export capability for compliance (SOC 2, GDPR)

### Data Provenance
- Source and verification method tracked for each field
- Complete transparency of data origins
- Timestamped provenance records

## Operational Runbooks

See `docs/operational-runbooks.md` for:
- SESSION_SECRET rotation procedures
- Audit trail review schedules
- Encryption key management
- Database backup/recovery procedures
- Security incident response

## Production Deployment

1. Set all required environment variables
2. Enable HTTPS/TLS
3. Configure rate limiting appropriately
4. Set up database backups (Neon PITR recommended)
5. Monitor audit logs for suspicious activity
6. Implement key rotation schedule

## Roadmap

- [ ] Multi-tenant access for enterprise customers
- [ ] Admin panel for vendor verification
- [ ] Encryption key versioning for zero-downtime rotation
- [ ] Automated alerts for suspicious audit activity
- [ ] Real-time data ingestion from government sources

## License

Proprietary - All rights reserved

## Support

For issues or questions, contact the development team.
