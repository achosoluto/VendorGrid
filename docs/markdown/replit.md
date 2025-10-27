# Vendor Network Platform

## Overview

The Vendor Network Platform is a B2B SaaS application designed to create a centralized, verified database of vendor information. The platform enables vendors to manage a single, secure profile that can be shared across multiple enterprise customers, eliminating redundant paperwork and ensuring data accuracy. Built with security and transparency as core principles, the platform features comprehensive audit logging, data provenance tracking, and end-to-end encryption for sensitive information.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server
- **Wouter** for lightweight client-side routing
- **TanStack Query (React Query)** for server state management and API data fetching
- **Tailwind CSS** with shadcn/ui component library (New York style) for styling

**Design System:**
- Material Design-inspired enterprise UI with dark mode as primary theme
- Custom color palette emphasizing trust (blue), verification (green), and security (purple)
- Typography using Inter (Google Fonts) for body text and Roboto Mono for technical data
- Comprehensive component library including forms, tables, dialogs, and data visualization elements

**State Management:**
- React Query handles all server state with automatic caching and refetching
- Local component state managed with React hooks
- Authentication state tracked through custom `useAuth` hook
- Theme preference persisted to localStorage

### Backend Architecture

**Technology Stack:**
- **Node.js** with **Express.js** for REST API server
- **TypeScript** for type safety across the entire stack
- **Drizzle ORM** for database interactions with type-safe queries
- **Neon Serverless PostgreSQL** as the database provider

**Authentication & Authorization:**
- **Replit Auth** integration using OpenID Connect (OIDC)
- Passport.js strategy for authentication middleware
- Session-based authentication with PostgreSQL session storage (connect-pg-simple)
- Role-based access control (RBAC) enforced at the API level

**Security Features:**
- **AES-256-GCM encryption** for sensitive data (banking information) at rest
- Custom encryption module using Node.js crypto with scrypt key derivation
- TLS encryption for data in transit (enforced by environment)
- Multi-factor authentication requirement (via Replit Auth)
- Immutable audit logging for all data changes
- Session secrets and encryption keys stored as environment variables

**API Architecture:**
- RESTful API design with standard HTTP methods
- JSON request/response format
- Centralized error handling middleware
- Request logging with performance metrics
- Authentication middleware (`isAuthenticated`) protecting all vendor routes

### Data Architecture

**Database Schema:**

The platform uses PostgreSQL with five core tables:

1. **sessions** - Session storage for authentication (required by connect-pg-simple)
2. **users** - User accounts linked to Replit Auth (email, name, profile image)
3. **vendorProfiles** - Core vendor information including:
   - Company details (name, tax ID, address)
   - Contact information (phone, email, website)
   - Encrypted banking details (account/routing numbers)
   - Verification status and timestamps
4. **auditLogs** - Immutable audit trail tracking all profile changes with actor, action, and timestamp
5. **dataProvenance** - Tracks origin and verification method for each data point

**Data Encryption:**
- Sensitive fields (banking information) encrypted before database storage
- Encryption/decryption handled server-side only
- Salt and initialization vectors generated per encryption operation
- Authentication tags verify data integrity (GCM mode)

**Data Relationships:**
- One-to-one relationship between users and vendor profiles
- One-to-many relationships from vendor profiles to audit logs, access logs, and provenance records
- Cascade deletion ensures referential integrity

### Design Principles

**Security First:**
- Zero-trust architecture with strict access controls
- End-to-end encryption for sensitive data
- Comprehensive audit trails for compliance (SOC 2, GDPR)
- Mandatory MFA for all users

**Transparency:**
- Every data point tagged with source and verification method
- Complete audit history visible to vendor users
- Access logs showing who viewed vendor information
- Clear visual indicators for verification status

**User Experience:**
- Progressive disclosure of complex data
- Dark mode optimized for extended use
- Responsive design supporting desktop and mobile
- Minimal clicks for frequent tasks
- Clear error messages and loading states

## External Dependencies

### Third-Party Services

**Authentication:**
- **Replit Auth** (OpenID Connect) - Primary authentication provider
- Handles user identity verification and MFA
- Provides user profile data (email, name, profile image)

**Database:**
- **Neon Serverless PostgreSQL** - Managed PostgreSQL database
- Accessed via `@neondatabase/serverless` client with WebSocket support
- Connection string provided via `DATABASE_URL` environment variable

**UI Components:**
- **Radix UI** primitives - Accessible, unstyled component primitives for:
  - Dialogs, dropdowns, popovers
  - Form controls (checkboxes, radio buttons, selects)
  - Navigation menus, tabs, accordions
  - Tooltips, alerts, toasts
- **shadcn/ui** - Pre-styled components built on Radix UI
- **cmdk** - Command palette component for quick actions

**Fonts:**
- **Google Fonts** - Inter and Roboto Mono font families
- Loaded via link tags in HTML head

**Development Tools:**
- **@replit/vite-plugin-runtime-error-modal** - Enhanced error reporting in development
- **@replit/vite-plugin-cartographer** - Replit-specific development tooling
- **@replit/vite-plugin-dev-banner** - Development environment indicator

### NPM Packages

**Core Framework:**
- `express` - Web server framework
- `react`, `react-dom` - UI library
- `vite` - Build tool and dev server
- `typescript` - Type system

**Data Layer:**
- `drizzle-orm` - Type-safe ORM
- `drizzle-zod` - Zod schema validation integration
- `@neondatabase/serverless` - PostgreSQL client

**Authentication:**
- `passport` - Authentication middleware
- `openid-client` - OIDC client for Replit Auth
- `express-session` - Session management
- `connect-pg-simple` - PostgreSQL session store

**UI & Styling:**
- `tailwindcss` - Utility-first CSS framework
- `class-variance-authority` - Component variant management
- `clsx`, `tailwind-merge` - Conditional class name utilities
- `lucide-react` - Icon library

**Forms & Validation:**
- `react-hook-form` - Form state management
- `@hookform/resolvers` - Validation resolver utilities
- `zod` - Schema validation

**Utilities:**
- `date-fns` - Date formatting and manipulation
- `nanoid` - Unique ID generation
- `memoizee` - Function memoization

### Environment Variables

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string (from Neon)
- `SESSION_SECRET` - Secret key for session encryption and data encryption
- `REPL_ID` - Replit application identifier (for auth)
- `ISSUER_URL` - OIDC issuer URL (defaults to replit.com/oidc)
- `REPLIT_DOMAINS` - Allowed domains for OIDC redirect

## Recent Changes

### September 30, 2025 - Production Readiness Enhancements
**Rate Limiting Implementation:**
- Implemented three independent rate limiters using express-rate-limit v8.1.0
- Auth limiter: 5 requests/15min for authentication endpoints
- Write limiter: 20 requests/15min for POST/PATCH operations
- Read limiter: 100 requests/15min for GET operations
- Using draft-6 standard headers for RateLimit-* information
- All limiters tested and working correctly

**Audit Log Export for Compliance:**
- Added GET /api/vendor-profile/:id/audit-logs/export endpoint
- Supports JSON and CSV export formats
- RFC 4180 compliant CSV escaping for special characters (commas, quotes)
- Date range filtering with validation (startDate/endDate query parameters)
- JSON export includes metadata (exportedAt, vendorProfile, dateRange, totalRecords)
- Authorization: only profile owners can export their logs
- Rate limited with read limiter (100 req/15min)

**Encryption Edge Case Testing:**
- Created comprehensive test suite: server/encryption.test.ts
- 18 automated tests covering all edge cases:
  - Empty strings, whitespace, special characters
  - Unicode support, very long strings
  - Double encryption (repeated masking)
  - Encryption randomness (unique salt/IV per operation)
  - Invalid encrypted data handling
- 100% test pass rate, all edge cases handled correctly

**Operational Runbooks:**
- Created docs/operational-runbooks.md with complete procedures
- SESSION_SECRET rotation: emergency procedure with working migration scripts
- Audit trail review: schedules, SQL queries, compliance checklists
- Encryption key management: generation, storage, access control
- Database backup/recovery: Neon PITR procedures and manual CSV exports
- Security incident response: procedures for breach, unauthorized access, key compromise
- Created server/scripts/decrypt-migration.ts and reencrypt-migration.ts

**Rate Limiting:**
- express-rate-limit: v8.1.0 with modern `limit` parameter
- Three independent limiters prevent API abuse and DDoS attacks

### September 30, 2025 - MVP Completion
- Completed frontend-to-backend integration for vendor dashboard and profile management
- Fixed profile fetch to return `{profile: null}` instead of 404 when no profile exists
- Implemented proper TypeScript typing for User, VendorProfile, AuditLog, AccessLog, and DataProvenance
- Added React Query integration with proper error handling for authentication failures
- Created end-to-end test workflow covering login, profile creation, editing, and audit log viewing
- All tests passing: vendor workflow works end-to-end from authentication through profile management

### Implementation Status
✓ Database schema with encrypted sensitive fields (banking info)
✓ Replit Auth integration with session management
✓ Vendor profile CRUD operations with ownership verification
✓ Immutable audit logs for all profile changes
✓ Access history tracking (prepared for multi-tenant expansion)
✓ Data provenance tracking for verification methods
✓ Frontend dashboard with profile cards, metrics, and history tabs
✓ Profile edit form with secure field masking
✓ Tax ID immutability after profile creation
✓ End-to-end testing with Playwright
✓ **Rate limiting** (5/20/100 requests per 15min for auth/write/read)
✓ **Audit log exports** (JSON and CSV with RFC 4180 compliance)
✓ **Encryption testing** (18 comprehensive tests, 100% pass rate)
✓ **Operational runbooks** (SESSION_SECRET rotation, audit review, backup/recovery, incident response)

### Next Steps for Production
1. **Multi-tenant Access**: Enable enterprise customers to request access to vendor profiles
2. **Verification Workflow**: Implement admin panel for verifying vendor data
3. **Key Versioning**: Add encryption key versioning for zero-downtime SESSION_SECRET rotation
4. **CI/CD Integration**: Wire encryption tests into automated test runner
5. **Monitoring**: Set up automated alerts for suspicious audit activity