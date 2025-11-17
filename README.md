# VendorGrid

**Solving the 8,000-supplier spreadsheet problem that enterprises have endured for decades.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://reactjs.org/)

---

## The Problem (2012-2025)

**2012, Schlumberger:** One full-time employee managing 8,000+ supplier records in a spreadsheet.

**2018, Husky Energy:** Different company. Same spreadsheet. Same problem.

**2025, Everywhere:** Enterprises managing billions in procurement data with:
- ❌ No audit trails (compliance risk)
- ❌ No deletion recovery (data loss with no recourse)
- ❌ No timestamps (outdated data, no verification)
- ❌ No access history (security blind spots)
- ❌ Manual integration (duplicate records, inconsistent data)

**Why it persisted:** Traditional software economics made solving it too expensive.

**Cost to build traditionally:** 3-4 engineers × 6 months × $150K/year = $225K+

**Cost to endure:** $60K/year (1 FTE managing spreadsheets manually)

**Decision for 13 years:** Endure the spreadsheet.

---

## The Solution (October 27 - November 13, 2025)

**VendorGrid:** Production-grade vendor master data platform.

Built in **3 weeks** using AI-assisted development (Replit + Kilocode + OpenRouter).

### Core Features

✅ **Centralized vendor profiles** - Single source of truth shared across enterprise customers  
✅ **AES-256-GCM encryption** - Banking data protected at rest  
✅ **Immutable audit logging** - Complete compliance trail (who, what, when)  
✅ **Access history tracking** - Full transparency for security audits  
✅ **Canadian government integration** - Corporations Canada, Statistics Canada, provincial registries  
✅ **Multi-tenant architecture** - One vendor profile, many enterprise customers  
✅ **Real-time monitoring** - System health, proactive alerts, performance metrics  

### Production-Grade Quality

- **18 encryption tests** with 100% pass rate (edge cases: empty strings, Unicode, special characters, double encryption)
- **Rate limiting** on all endpoints (5/20/100 requests per 15min for auth/write/read)
- **Hybrid database support** (PostgreSQL for production, SQLite for zero-friction demos)
- **End-to-end testing** with Playwright
- **Operational runbooks** for key rotation, backups, incident response

---

## Why This Matters

### The Economics Shifted

**Traditional build (2012-2024):**
- Team: 3-4 software engineers
- Timeline: 6 months
- Cost: $100K-250K fully loaded
- **Result:** Too expensive relative to cost of enduring spreadsheets

**AI-assisted build (2025):**
- Team: 1 domain expert directing AI agents
- Timeline: 3 weeks (45 hours of human judgment)
- Cost: ~$1,500 (AI tools + infrastructure)
- **Result:** Cost to build < Cost to endure → Problem finally solved

### What Changed

Not the problem. Not the solution architecture.

**What changed:** Execution velocity through autonomous AI agents in "YOLO mode"

- Traditional AI coding: Write → Human review → Fix → Human review → Ship
- YOLO mode: Write → Agent detects bugs → Agent fixes → Agent validates → Ship

**Result:** 150x cost reduction, 8x time compression

## Business Impact & ROI

### For Procurement Teams

**Current state (spreadsheets):**
- 1 FTE managing data entry: **$60K/year**
- Compliance audit failures: **$50K-200K in remediation**
- Data loss incidents: **Weeks of reconstruction work**
- No vendor verification: **Contract fraud risk**

**With VendorGrid:**
- Automated data management: **$60K/year saved**
- Complete audit trails: **Zero compliance failures**
- Immutable records: **No data loss**
- Government integration: **Real-time verification**

**Payback period:** 6-12 months

### For Enterprises

**Scales from startup to enterprise:**
- Startups: SQLite deployment, zero infrastructure cost
- Mid-market: Neon PostgreSQL, $20/month managed database
- Enterprise: Self-hosted PostgreSQL, full data sovereignty

**Multi-tenant architecture:**
- One vendor profile shared across customers
- Reduced duplicate data entry
- Consistent verification across organizations
---

## Technical Architecture

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS + shadcn/ui components
- **Routing:** Wouter (lightweight client-side routing)
- **State Management:** TanStack Query (React Query)
- **Forms:** React Hook Form + Zod validation

### Backend
- **Runtime:** Node.js with Express.js
- **Language:** TypeScript
- **ORM:** Drizzle ORM (type-safe database queries)
- **Authentication:** Keycloak (OIDC/SAML) + session-based storage
- **Rate Limiting:** express-rate-limit (configurable per endpoint)

### Database
- **Hybrid Support:** PostgreSQL (production) + SQLite (development/demos)
- **Managed Option:** Neon Serverless PostgreSQL
- **Schema:** Auto-created on startup, database-agnostic design
- **Key Learning:** UUID generation moved to application layer for cross-database compatibility

### Security
- **Encryption:** AES-256-GCM for sensitive banking data at rest
- **Transit:** TLS encryption for data in transit
- **Access Control:** Role-based access control (RBAC)
- **Compliance:** SOC 2-grade audit logging, GDPR-ready architecture

### Data Ingestion
- **Government Sources:** 
  - Corporations Canada (federal)
  - Statistics Canada
  - Ontario Business Registry
  - Quebec REQ (Registraire des entreprises)
  - BC Registry Services
- **Volume:** Tested with 400K+ records (ODBus dataset)
- **Processing:** Streaming approach for memory efficiency
- **Validation:** Canadian-specific (postal codes, province codes, business numbers)

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL (production) or SQLite (development)
- Keycloak instance (or use development mode)

### Installation
```bash
# Clone the repository
git clone https://github.com/achosoluto/VendorGrid.git
cd VendorGrid

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/vendorgrid
# Or for SQLite: DATABASE_URL=file:./vendorgrid.db

# Encryption
ENCRYPTION_KEY=your-32-byte-hex-key-here

# Keycloak (optional for development)
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=vendorgrid
KEYCLOAK_CLIENT_ID=vendorgrid-app

# Server
PORT=3000
NODE_ENV=development
```

### Testing
```bash
# Run all tests
npm test

# Run encryption tests specifically
npm run test:encryption

# Run end-to-end tests
npm run test:e2e
```

---

## Project Structure
```
VendorGrid/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route-level pages
│   │   └── lib/           # Utilities, API client
├── server/                # Express backend
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic
│   ├── dataIngestion/     # Government data integration
│   └── __tests__/         # Backend tests
├── shared/                # Shared TypeScript types
├── migrations/            # Database migrations
├── keycloak-init/         # Keycloak configuration
├── monitoring/            # Health checks, alerts
├── tests/                 # End-to-end tests (Playwright)
└── docs/                  # Documentation
```

---

## Key Architectural Decisions

### 1. Database Compatibility (PostgreSQL + SQLite)

**Decision:** Support both databases instead of PostgreSQL-only

**Rationale:** 
- PostgreSQL for production/enterprise deployments
- SQLite for zero-friction demos (critical for enterprise sales)
- Forces better, more portable design patterns

**Implementation:** UUID generation in application layer (not database-specific functions)

**Learning:** Database compatibility constraints produce cleaner, more maintainable code

### 2. Selective Encryption

**Decision:** Encrypt only banking data (routing numbers, account numbers), not everything

**Rationale:**
- Over-encryption breaks search and kills performance
- Banking data = wire fraud risk → needs AES-256-GCM
- Vendor names, addresses, tax IDs need to remain searchable
- Compliance audits easier when not everything is encrypted

**Why it matters:** AI agents default to "encrypt everything." Domain expertise caught this.

### 3. Immutable Audit Trails

**Decision:** Audit logs cannot be modified or deleted, ever

**Rationale:**
- SOC 2 audits require complete history
- Compliance teams need to reconstruct exactly what happened
- Editable logs = useless logs

**Implementation:** Database-level immutability flag, export capability for external storage

---

## Development Insights

### What Worked

✅ **Hybrid database design** - SQLite demos closed deals faster  
✅ **Comprehensive encryption testing** - 18 tests caught edge cases AI missed  
✅ **Rate limiting from day one** - Prevented abuse during early testing  
✅ **YOLO mode (autonomous agents)** - Collapsed 6 months to 3 weeks  

### What Required Human Judgment

🧠 **Database compatibility decision** - Engineers would've picked PostgreSQL only  
🧠 **What to encrypt** - AI wanted to encrypt everything, breaking search  
🧠 **Audit trail immutability** - AI suggested "editable for corrections"  
🧠 **Rate limit values** - Balancing security vs. usability  

### Key Learning

> "AI agents execute. Domain experts judge.
> 
> Your job isn't understanding the code. It's understanding what 'correct' looks like when you see it."

---

## The Broader Story

This isn't just about VendorGrid. It's about what became possible in 2025.

**The pattern:**
1. **Identify a problem you've lived with for 5+ years** (vendor data chaos, HR spreadsheets, finance reconciliation)
2. **Understand why it persists** (usually: traditional build cost > cost to endure)
3. **Use AI execution velocity** (domain expertise + AI agents = production-grade software in weeks)
4. **Ship without permission** (no engineering team, no $100K budget, no 6-month timeline)

VendorGrid proves the economics shifted.

**What problem will you solve next?**

### Read the Full Story

📖 [THE_STORY.md](./THE_STORY.md) - Complete narrative from problem recognition (2012) to production deployment (2025)

### Background

- **Author:** Procurement/supply chain veteran (15+ years in enterprise operations)
- **Companies:** Schlumberger, Husky Energy
- **Approach:** Domain expertise + AI-assisted development (100% code generation via Replit, Kilocode, OpenRouter)
- **Timeline:** October 27 - November 13, 2025 (3 weeks, ~45 hours human time)

---

## Contributing

This project is open source to demonstrate what's possible with AI-assisted development and deep domain expertise.

**How to contribute:**

1. **Study the approach** - See how domain expertise directed AI execution
2. **Test with your data** - Try Canadian government data integration
3. **Adapt for your domain** - HR records? Finance reconciliation? Supply chain tracking?
4. **Share your learnings** - Open issues, start discussions, contribute improvements

**Not accepting:** Pull requests that sacrifice production quality for convenience

**Encouraging:** Discussions about architecture decisions, security improvements, operational best practices

---

## License

MIT License - See [LICENSE](./LICENSE) file for details

**What this means:**
- Use commercially ✅
- Modify freely ✅
- Distribute copies ✅
- Attribution required ✅
- No warranty (use at your own risk) ⚠️

---

## Contact & Questions

💬 **GitHub Discussions:** [Ask questions, share insights](https://github.com/achosoluto/VendorGrid/discussions)

📧 **For enterprises:** Interested in deploying VendorGrid? Contact via GitHub Issues (tag: enterprise)

🛠️ **For builders:** Following this path for your domain? Open a discussion and share your journey

---

## Acknowledgments

**Built with:**
- [Replit](https://replit.com) - Interactive development environment for design iteration
- [Kilocode](https://kilocode.ai) - Autonomous AI agents in YOLO mode for production hardening
- [OpenRouter](https://openrouter.ai) - API routing for AI model access

**Inspired by:**
- Marc Randolph (Netflix co-founder): "Fall in love with the problem, not the solution"
- 13 years of watching procurement teams manage critical data in spreadsheets
- The realization that domain expertise + AI execution velocity = executable solutions

---

**VendorGrid** - Because billion-dollar procurement data shouldn't live in spreadsheets.

Built in 3 weeks. Production-grade from day one. Proof that the economics shifted in 2025.

**What problem are you going to solve?**