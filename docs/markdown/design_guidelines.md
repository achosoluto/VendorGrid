# Design Guidelines - The Proactive Vendor Platform

## Design Approach: Enterprise Trust & Transparency

**Selected Approach**: Design System - Material Design with enterprise customization
**Rationale**: This is a security-critical, data-intensive B2B platform where trust, clarity, and efficiency are paramount. Material Design provides the robust foundation for complex data interactions while maintaining professional credibility.

**Key Design Principles**:
- **Trust Through Clarity**: Every interface element reinforces security and data integrity
- **Transparency First**: Always show data provenance, verification status, and audit trails
- **Efficient Workflows**: Minimize clicks, maximize clarity for frequent tasks
- **Progressive Disclosure**: Complex data revealed contextually, not all at once

## Core Design Elements

### A. Color Palette

**Dark Mode** (Primary):
- Background: 222 15% 8%
- Surface: 222 15% 12%
- Surface Elevated: 222 15% 16%
- Primary Brand: 214 95% 60% (Trust Blue - verification badges, CTAs)
- Success/Verified: 142 76% 45% (Green - verified status indicators)
- Warning/Pending: 38 92% 50% (Amber - pending verification)
- Error/Risk: 0 84% 60% (Critical alerts, security warnings)
- Text Primary: 0 0% 98%
- Text Secondary: 0 0% 70%
- Border: 222 15% 24%

**Light Mode**:
- Background: 0 0% 98%
- Surface: 0 0% 100%
- Surface Elevated: 210 20% 98%
- Primary: 214 100% 50%
- Text Primary: 222 15% 12%
- Text Secondary: 222 10% 40%

**Accent** (Use sparingly):
- Security Highlight: 280 70% 60% (Purple - for security features, MFA prompts)

### B. Typography

**Font Families**:
- Primary: 'Inter' (Google Fonts) - Body text, UI elements
- Headings: 'Inter' with increased weight
- Monospace: 'Roboto Mono' - Tax IDs, reference numbers, technical data

**Type Scale**:
- Display: text-4xl font-bold (32px) - Dashboard headers
- H1: text-3xl font-semibold (24px) - Page titles
- H2: text-2xl font-semibold (20px) - Section headers
- H3: text-xl font-medium (18px) - Card titles
- Body: text-base (16px) - Primary content
- Small: text-sm (14px) - Metadata, labels
- Caption: text-xs (12px) - Timestamps, provenance tags

### C. Layout System

**Spacing Units**: Tailwind units of 2, 4, 6, 8, 12, 16
- Tight grouping: p-2, gap-2
- Standard spacing: p-4, gap-4, m-6
- Section separation: py-8, py-12
- Page margins: p-8, p-12

**Grid System**:
- Dashboard: 12-column grid for data tables
- Forms: 2-column responsive (lg:grid-cols-2)
- Cards: 3-column for vendor listings (lg:grid-cols-3)
- Max container width: max-w-7xl

### D. Component Library

**Navigation**:
- Top bar: Dark header with logo, global search, user menu
- Sidebar: Collapsible navigation with icon + label
- Breadcrumbs: Always visible for deep navigation context

**Data Display**:
- Vendor Cards: Elevated surface with verification badge, company name, Tax ID (masked), status indicator
- Data Tables: Sticky headers, row hover states, sortable columns, inline actions
- Audit Log: Timeline-style with timestamp, actor, action, immutable tag
- Profile Views: Two-column layout (info left, verification/audit right)

**Forms & Input**:
- Text Fields: Outlined variant with clear labels, helper text for sensitive fields
- Dropdowns: Material select with search for large lists
- File Upload: Drag-drop area with clear security notice
- Validation: Inline, real-time for critical fields (Tax ID format)

**Security Elements**:
- MFA Prompt: Modal with QR code and backup codes
- Verification Badges: Color-coded chips (green verified, amber pending, gray unverified)
- Data Provenance Tags: Small pill showing source + timestamp (e.g., "Verified via Tax ID • Sep 29, 2025")
- Encryption Indicators: Lock icons next to sensitive fields with tooltip

**Feedback & Status**:
- Toast Notifications: Top-right, auto-dismiss for non-critical
- Alerts: Prominent banners for security warnings
- Loading States: Skeleton screens for data-heavy views
- Empty States: Helpful illustrations with clear next actions

**CTAs & Actions**:
- Primary Button: Filled with primary color, use for main actions
- Secondary: Outlined for supporting actions
- Danger: Red fill for destructive actions with confirmation
- Icon Buttons: For compact actions in tables/cards

### E. Animation & Motion

**Minimal Approach**:
- Page transitions: Simple 200ms fade
- Modal entry: 150ms scale from 0.95 to 1
- Status changes: Smooth 300ms color transition for badges
- NO scroll animations, parallax, or decorative motion
- Focus on instant feedback for user actions

## Images Strategy

**Dashboard/Application**: No hero images - this is a data-focused tool
**Marketing Page** (if needed):
- Hero: Large abstract visual representing network/connectivity (nodes, secure data flow) - NOT a photo
- Trust Section: Icons or abstract illustrations for security features
- NO stock photos of people - use iconography and data visualizations

## Special Considerations

**Transparency UI Patterns**:
- Every data field includes small provenance tag below
- Audit log always accessible via icon in top-right of profile cards
- "Who Viewed" section on vendor dashboard with avatars + timestamps
- Clear visual distinction between verified (solid green badge) vs pending (outlined amber)

**Security-First Visual Language**:
- Lock icons and shield badges throughout for encryption/security features
- MFA setup uses step-by-step wizard with clear progress indicator
- Critical actions (banking info changes) have confirmation modals with red accent
- All forms handling sensitive data have prominent security notice at top

**Responsive Behavior**:
- Mobile: Stack all multi-column layouts
- Tables: Horizontal scroll on mobile with sticky first column
- Sidebar: Collapses to icon-only on tablet, off-canvas on mobile
- Forms: Single column on mobile with full-width inputs