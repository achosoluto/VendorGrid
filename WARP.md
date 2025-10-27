# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

# VendorGrid

A project for vendor grid management and operations.

**Status**: Early inception stage - repository initialized locally with no commits yet.

**Repository**: https://github.com/gammaton588/VendorGrid (private)

## Overview

VendorGrid is a vendor management system designed for cost-aware, provider-agnostic operations with automatic routing and load balancing based on price and health metrics.

## Initial Setup

Since this is a new repository, you'll need to establish the basic Git workflow:

### 1. Verify Repository State
```bash
pwd
git status
git rev-parse --is-inside-work-tree || git init
```

### 2. Configure Git (if needed)
```bash
git config --global user.name "Your Name"
git config --global user.email "your_email@example.com"
git config --global init.defaultBranch main
git branch -M main
```

### 3. Connect to Remote Repository
The repository is private, so you'll need proper authentication:

```bash
# Add origin remote
git remote add origin git@github.com:gammaton588/VendorGrid.git

# Or update if it exists
git remote set-url origin git@github.com:gammaton588/VendorGrid.git

# Verify remotes
git remote -v
```

### 4. First Commit and Push
```bash
git add README.md WARP.md
git commit -m "chore: initial repository setup with WARP.md"
git push -u origin main
```

## Development Environment

### Recommended Tools
- Git 2.39+
- GitHub CLI (`gh`) for repository management
- SSH keys configured for GitHub access
- Node.js LTS (for potential frontend/backend development)
- Python 3.11+ (for automation scripts)
- Docker Desktop and docker-compose (for local services)
- jq and yq (for JSON/YAML processing)

### Installation (macOS with Homebrew)
```bash
brew install git gh jq yq make
brew install fnm  # Fast Node Manager
fnm install --lts
fnm use lts
```

## Architectural Principles

Given the cost-aware requirements from your rules, the system should follow these principles:

### Cost-Aware Design
- **Lowest cost provider preference**: Implement provider adapters with automatic routing based on price
- **Multi-provider strategy**: Avoid vendor lock-in through abstraction layers
- **Dynamic load balancing**: Route traffic based on both cost and health metrics

### Core Architecture Patterns
- **Hexagonal Architecture**: Isolate business logic from external dependencies
- **Event-driven workflows**: For vendor onboarding and compliance processes  
- **Provider adapters**: Abstract different vendor APIs and services
- **Audit trail**: Immutable logging for all vendor interactions and changes

## Expected Domain Areas

Based on typical vendor management systems:

### Core Modules
- **Vendor Directory**: Vendor profiles, contacts, capabilities, certifications
- **Sourcing & Procurement**: Product catalogs, pricing, RFQs, contract management
- **Onboarding & Compliance**: KYC, risk assessment, document management
- **Performance Management**: SLA tracking, performance metrics, issue management
- **Financial Management**: Invoicing, payments, cost analysis
- **Integration Hub**: ERP, CRM, and other system connectors

### Data Architecture
- **Primary Database**: PostgreSQL (for transactional data)
- **Caching Layer**: Redis (for frequently accessed data)
- **File Storage**: Cloud storage for documents and attachments
- **Message Queue**: For async processing and event handling

## Security Considerations

- **Authentication**: Strong identity verification for vendor access
- **Authorization**: Role-based access control with least privilege
- **Data Encryption**: At rest and in transit
- **Audit Logging**: Comprehensive activity tracking
- **Compliance**: Support for SOC 2, GDPR, and industry-specific requirements

## Future Development Commands

Once the codebase is established, common commands will likely include:

### Development Workflow
```bash
# Install dependencies (example for Node.js project)
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Build for production
npm run build
```

### Database Operations
```bash
# Run database migrations
npm run db:migrate

# Seed development data
npm run db:seed

# Reset database
npm run db:reset
```

### Docker Operations
```bash
# Start local services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f
```

## Integration Testing

For a vendor management system, integration testing will be crucial:

```bash
# Run integration tests
npm run test:integration

# Run API tests
npm run test:api

# Run end-to-end tests
npm run test:e2e
```

## Deployment

Cost-aware deployment following your preferences:

```bash
# Deploy to lowest-cost environment
npm run deploy:staging

# Production deployment with cost monitoring
npm run deploy:prod

# Check deployment costs
npm run cost:check
```

## References

- README.md - Basic project information
- GitHub Repository: https://github.com/gammaton588/VendorGrid
- Cost optimization: Follow lowest-cost provider principles with automatic routing