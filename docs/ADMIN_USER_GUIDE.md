# CapeSecure Business Management System (BMS)
## Administrator & Operations User Manual

---

### Introduction
The CapeSecure Business Management System (BMS) is the centralized administrative platform powering the operations, client lifecycle, financial accounting, and infrastructure maintenance for **CapeSecure Solutions LLP**.

This manual guides administrative and technical staff through all core operational modules.

---

### Module 1: Authentication & Role-Based Access Control (RBAC)

#### Access & Sign In
- Navigate to `/login` or `/admin/login`.
- Enter your administrator email and master password.
- Session tokens are encrypted and time-bound. An interactive idle countdown in the top navigation bar displays remaining session validity and warns prior to automatic sign-out.

#### Role Permissions Hierarchy
Staff permissions are governed by 5 distinct operational roles:
- **Super Admin:** Unrestricted global authority, security audits, and API integrations.
- **Administrator:** Master management of clients, billing, projects, and team profiles.
- **Project Manager:** Sprint execution, task delegation, design approvals, and client handovers.
- **Finance Manager:** Quotation reviews, tax invoices, payment verification, and revenue reports.
- **Technical Staff:** Development tasks, QA checklists, deployments, and synthetic uptime monitoring.

---

### Module 2: Leads Pipeline & Client Conversion

1. **Intake:** Ingest inquiries from the public website contact form, telephone, or manual entry in **Leads (`/admin/leads`)**.
2. **Qualification:** Set lead status (`New`, `Contacted`, `Qualified`, `Proposal`, `Negotiation`).
3. **One-Click Client Conversion:** Once a lead accepts scope, click **"Convert to Client"**. This automatically provisions a sequential client code (`CS-CLI-2026-xxx`), initializes CRM records, and opens requirement engineering.

---

### Module 3: Client Profiles & CRM Records

- Located at **Clients (`/admin/clients`)**.
- Stores registered business name, authorized contact person, official email, phone, address, and Indian tax identifiers (GSTIN, PAN).
- Features a unified activity history showing past quotations, active agreements, open projects, and historical invoices.

---

### Module 4: Requirements Engineering & Specifications

- Located at **Requirements (`/admin/requirements`)**.
- Document functional specifications, architecture features, page breakdowns, reference URLs, and client budget expectations.
- Export formal **Requirement Specification Documents** to PDF or HTML with one click.
- Directly trigger quotation generation linked to approved requirements.

---

### Module 5: Quotations & Commercial Proposals

- Located at **Quotations (`/admin/quotations`)**.
- **Sequential Numbering:** Automatically generates sequential numbers (e.g., `CS-QTE-2026-001`).
- **GST Compliance:** Itemized commercial services with configurable GST rates (18% standard, or 0% for non-taxable entities).
- **Public Proposal Portal (`/quote/:id`):** Clients can review line items, payment milestones, and grant one-click digital approval.
- **Version Control:** When clients request modifications, click **"Create Revision"** to generate `v2`, preserving complete parent-child audit history.
- **PDF Generation:** Download official vector PDF proposals via `downloadQuotationPDF()`.

---

### Module 6: Master Service Agreements (MSA) & E-Signing

- Located at **Agreements (`/admin/agreements`)**.
- **Sequential Numbering:** Automatically formats numbers as `CS-AGR-2026-001`.
- **17 Legal Clauses:** Service provider details, client details, scope of work, deliverables, payment terms, domain/hosting ownership, revisions policy, IP ownership, confidentiality, cancellation, and dispute resolution.
- **Signing Workflows:**
  - **Digital Signing:** Direct provider integration (Zoho Sign, Leegality, DocuSign). Never simulates legally verified digital signatures.
  - **Physical Signing:** Option to upload high-resolution scans of physically countersigned agreements with physical document custody location records.
- **PDF Generation:** Download formal legally binding MSA documents via `downloadAgreementPDF()`.

---

### Module 7: Financial Management & Payment Verification

- Located at **Payments (`/admin/payments`)**.
- Supports Advance, Milestone, Final, Additional Feature, Maintenance, and Refund transactions.
- **Strict Anti-Fraud Verification Mandate:** Payments are never marked as received merely because a screenshot is submitted. Administrators must verify against banking UTR / gateway records before clicking **"Verify Payment"**.
- Automatically updates invoice balances and generates sequential payment receipts (`CS-REC-2026-001`).

---

### Module 8: Sequential GST Invoices & Payment Receipts

- Located at **Invoices (`/admin/invoices`)**.
- Sequential numbering (`CS-INV-2026-001`).
- Full support for Indian GST requirements (CGST + SGST for intra-state Kerala, IGST for inter-state transactions).
- Document correction workflow: issued invoices are never silently overwritten; changes record an immutable audit entry in `audit_trail`.
- Instant vector PDF downloads via `downloadInvoicePDF()` and `downloadReceiptPDF()`.

---

### Module 9: Project Management & 17-Stage Pipeline

- Located at **Projects (`/admin/projects`)**.
- Sequential numbering (`CS-PRJ-2026-001`).
- Interactive **17-Stage Production Lifecycle Stepper**:
  1. Project Created
  2. Advance Payment Verified
  3. Requirements Finalized
  4. UI/UX Design
  5. Design Review
  6. Design Approved
  7. Frontend Development
  8. Backend Development
  9. Database Integration
  10. Internal Testing
  11. Client Review
  12. Revisions
  13. Final QA
  14. Final Payment
  15. Deployment
  16. Handover
  17. Completed
- Includes Kanban view, table view, manager assignments, and delivery target countdowns.

---

### Module 10: Task Delegation & Progress Tracking

- Located at **Tasks (`/admin/tasks`)**.
- Assign tasks to team members with priority levels (`Low`, `Medium`, `High`, `Urgent`).
- Progress slider (0% to 100%), comments stream, and file attachment uploads.

---

### Module 11: Design Previews & Revision Control

- Located at **Design Reviews (`/admin/design-approvals`)**.
- Upload wireframes, mockups, or prototypes with interactive Figma prototype URLs.
- Clients can review in their portal, approve, or request revisions.
- Formal revision tickets (`project_revisions`) track assigned designers, requested changes, and resolution dates.

---

### Module 12: QA Testing Suite & Bug Reporting

- Located at **Testing (`/admin/testing`)**.
- **14 Mandatory QA Checklists:** Responsive design, desktop compatibility, mobile compatibility, browser compatibility, form validation, authentication, payment gateway testing, database functionality, API functionality, performance, security, SSL/HTTPS, broken links, and backup verification.
- **Bug Reporting:** Record defects with severity, screenshot proof, assigned engineer, and resolution logs.

---

### Module 13: Deployments & Infrastructure Credentials Vault

- Located at **Deployments (`/admin/deployments`)**.
- Track domain registrar, DNS status, hosting provider, frontend URL, backend API, SSL status, and production version.
- **Zero-Plaintext Policy:** Plaintext passwords are prohibited; uses delegated IAM roles and secure token management.

---

### Module 14: Handover & Delivery Acceptance Protocol

- Located at **Handover (`/admin/handover`)**.
- **10-Point Handover Checklist:** A project cannot be marked completed until all 10 checklist items and client acknowledgement are recorded.
- **Dual Signatures:** Agency technical lead and client authorized signatory.
- Generates 12-section **Handover Acceptance Certificate & Final Project Completion Report** PDF via `downloadHandoverDocumentPDF()`.

---

### Module 15: Recurring Maintenance & SLA Management

- Located at **Maintenance (`/admin/maintenance`)**.
- **Standard Maintenance Plan:** ₹1,999/year.
- **Advanced Maintenance Plan:** ₹2,999/year.
- Configurable prices, inclusions, and exclusions.
- 6-step renewal workflow (reminder notice, invoice generation, payment verification, contract extension, activity logging, PDF report download).
- **Compliance Policy:** Automatic card charges without an authorized mandate are strictly prevented.

---

### Module 16: Website Health Sentinel & Synthetic Heartbeat Probes

- Located at **Monitoring (`/admin/monitoring`)**.
- Continuous synthetic probes tracking HTTP response status, latency (ms), and uptime %.
- SSL certificate expiration countdown with alerts (&lt;30 days warning, &lt;15 days critical).
- **Data Source Integrity:** Domain expiration and backup status are only displayed if an authenticated API has been verified.
- Direct **"Raise Support Ticket"** action on any active incident.

---

### Module 17: Document Vault & Signed URL Security

- Located at **Documents (`/admin/documents`)**.
- 13 standardized document classification categories.
- Client folder segregation.
- Time-limited signed URLs (3600s expiration) with access history audit logs.
- Multi-version tracking, archiving, and disaster recovery verification drills.

---

### Module 18: Notification Center, Settings & Outbox

- **Top Navigation Bell:** In-app notification center with unread count and category filters.
- **Settings (`/admin/settings`):**
  - Configure Brevo API keys and sender identity.
  - Automation Rules Matrix covering all 30 lifecycle events with active toggles and delay sliders.
  - Email Outbox & Delivery Audit Logs with verified status badges (`sent`, `delivered`, `failed`) and 1-click **Resend** capability.
