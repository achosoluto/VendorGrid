# VendorGrid - Government Data Integration Platform

A secure B2B SaaS application that creates a centralized, verified database of vendor information. Features AI-powered government data integration, real-time monitoring, and comprehensive Canadian business registry support. Vendors manage a single, secure profile that can be shared across multiple enterprise customers.

## Features

### Core Functionality
- **Single Vendor Profile**: Vendors maintain one verified profile for all enterprise customers
- **Government Data Integration**: AI-powered ingestion from Canadian business registries
- **Real-time Monitoring**: Live system health dashboard and proactive alerts
- **End-to-End Encryption**: AES-256-GCM encryption for sensitive banking information
- **Immutable Audit Logging**: Complete audit trail of all profile changes
- **Data Provenance Tracking**: Track the origin and verification method for each data point
- **Access History**: Transparency of who viewed vendor information
- **Rate Limiting**: Protection against API abuse (5/20/100 requests per 15min for auth/write/read)
- **Audit Log Exports**: JSON and CSV export formats for compliance (SOC 2, GDPR)
- **Canadian Business Support**: Full support for Canadian business numbers, GST/HST, and provinces

### Government Data Sources
- **Corporations Canada Federal Registry**: 45,000+ business records
- **Statistics Canada Business Register**: 32,000+ active companies
- **Ontario Business Registry**: Provincial business data
- **Quebec Business Registry (REQ)**: Quebec business information
- **BC Business Registry**: British Columbia business records

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
- PostgreSQL database (local or Neon)
- Replit account for authentication

### Environment Variables

Create or ensure these environment variables are set:

```bash
DATABASE_URL=postgresql://...           # PostgreSQL connection string
SESSION_SECRET=your-secret-key-here    # Secret for session encryption
REPL_ID=your-repl-id                   # Replit application ID
ISSUER_URL=https://replit.com/oidc     # OIDC issuer (default)
REPLIT_DOMAINS=your-domain.com         # Allowed domains for auth
```

### Installation

```bash
# Install dependencies
npm install

# Set up database
npm run db:push

# Start development servers
npm run dev          # Backend (port 5000)
# In another terminal:
cd client && npm run dev  # Frontend (port 5173)
```

### Quick Demo

For a complete demo experience:

```bash
# Start the comprehensive demo system
./run-demo.sh
```

The application will be available at:
- **Backend API**: `http://localhost:5000`
- **Frontend Web App**: `http://localhost:5173`
- **Demo Page**: `http://localhost:5173/demo`
- **Comprehensive Demo**: `http://localhost/demo.html`

## Project Structure

```
├── client/                   # Frontend React application
│   ├── src/
│   │   ├── components/      # Reusable UI components (shadcn/ui)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities and helpers
│   │   ├── pages/           # Page components
│   │   └── services/        # API service layer
│   └── index.html
├── server/                  # Backend Express application
│   ├── agents/              # AI agents for data integration
│   ├── connectors/          # Government data connectors
│   ├── dataIngestion/       # Data ingestion pipeline
│   ├── demo/                # Demo system
│   ├── monitoring/          # System monitoring
│   ├── routes/              # API route handlers
│   ├── scripts/             # Utility scripts
│   ├── services/            # Business logic services
│   ├── db.ts                # Database connection
│   ├── encryption.ts        # Encryption utilities
│   └── index.ts             # Server entry point
├── shared/                  # Shared code between frontend and backend
│   └── types/               # TypeScript types
├── scripts/                 # Standalone scripts
├── migrations/              # Database migrations
├── docs/                    # Documentation
└── logs/                    # Application logs
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

### Government Data Integration
- `POST /api/government-data/demo/start` - Start comprehensive demo
- `POST /api/government-data/demo/stop` - Stop demo with summary
- `GET /api/government-data/demo/status` - Current demo status
- `POST /api/government-data/demo/scenario/{type}` - Run specific scenarios
- `GET /api/government-data/monitoring/dashboard` - Live system dashboard
- `GET /api/government-data/analytics/summary` - Analytics overview

### Vendor Claiming
- `GET /api/vendor-claiming/search` - Search for companies to claim
- `POST /api/vendor-claiming/initiate` - Start claiming process
- `POST /api/vendor-claiming/verify` - Verify company ownership

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

## Documentation

- **📋 Setup Guide**: `docs/markdown/SETUP_COMPLETE.md` - Complete setup and configuration
- **🎬 Demo Guide**: `docs/markdown/DEMO.md` - Interactive demo instructions
- **⚙️ Operational Runbooks**: `docs/operational-runbooks.md` - Production procedures
- **🌐 Web Demo Access**: `WEB_DEMO_ACCESS.md` - Live web application guide
- **🎨 Design Guidelines**: `docs/markdown/design_guidelines.md` - UI/UX standards
- **🇨🇦 Canadian Business Support**: `docs/markdown/PROGRESS_CANADIAN_COMPANIES.md` - Implementation status
- **📊 Implementation Summary**: `docs/markdown/IMPLEMENTATION_SUMMARY.md` - Project overview

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
