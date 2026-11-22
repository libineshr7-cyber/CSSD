# CapeSecure Business Management System (BMS)
## Phase 12: Comprehensive Technical Architecture Documentation

---

### 1. Executive Summary & Architecture Overview

CapeSecure Solutions LLP Business Management System (BMS) is a secure, cloud-native enterprise resource platform designed for cybersecurity, IT infrastructure, and digital defense firms. It orchestrates the entire operational client lifecycle from initial lead ingestion to recurring website maintenance and SLA compliance.

```
                  ┌──────────────────────────────────────────────┐
                  │          CapeSecure Client Layer             │
                  │   (Public Website / Client Portal / Admin)   │
                  └──────────────────────┬───────────────────────┘
                                         │ HTTPS / TLS 1.3
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │        Single Page Application (SPA)         │
                  │ React 18 • TypeScript • Tailwind v4 • Router │
                  └───────┬──────────────────────┬───────────────┘
                          │                      │
        REST / PostgREST  │                      │ Transactional API
                          ▼                      ▼
  ┌───────────────────────────────────┐  ┌────────────────────────────────┐
  │     Supabase Cloud Services       │  │     Brevo Transactional API    │
  │ • PostgreSQL 15 with RLS          │  │ • 30 Automated Event Triggers  │
  │ • Private Storage (Signed URLs)   │  │ • Deduplication Engine         │
  │ • Point-In-Time Backup & WAL      │  │ • Delivery Audit Trail Logs    │
  └───────────────────────────────────┘  └────────────────────────────────┘
```

---

### 2. Core System Technology Stack

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | 18.3.1 | Core UI library with component composition |
| **Language** | TypeScript | 5.5.3 | Strict type enforcement, zero-any policy |
| **Styling Engine** | Tailwind CSS | 4.0.0 | High-performance compiled utility classes |
| **Routing** | React Router DOM | 6.24.0 | SPA navigation, RBAC protected routes |
| **State & Data Store** | Supabase PostgreSQL | 15.1 | Managed relational DB with Row Level Security |
| **Document Security** | Supabase Storage | 2.45.0 | Private buckets with 3600s time-limited signed URLs |
| **Email Infrastructure**| Brevo (Sendinblue) API | v3 | High-deliverability transactional notifications |
| **Document Engine** | Client-Side PDFBuilder | Custom | Pure binary vector PDF generator without print popups |
| **Telemetry & Charts** | Recharts & Framer Motion | 2.12 / 11.0 | Real-time analytics charts and fluid animations |

---

### 3. Database Architecture & Schema Specification

The database utilizes 11 modular, forward-compatible SQL migrations ensuring referential integrity, cascading updates, and granular Row Level Security (RLS).

#### 3.1 Migration Ledger
1. `001_initial_schema.sql`: Core tables (`leads`, `clients`, `requirements`, `quotations`, `agreements`, `projects`, `tasks`, `payments`, `invoices`, `support_tickets`, `documents`, `audit_logs`).
2. `002_auth_and_rbac.sql`: Profile definitions, 5 role tiers, and permissions matrix.
3. `003_client_and_lead_enhancements.sql`: Sequential client code generator (`CS-CLI-2026-001`), tax identifiers (GSTIN/PAN), and client status transitions.
4. `004_quotation_management.sql`: Sequential quotation numbering (`CS-QTE-2026-001`), version control trees, GST breakdowns, and digital approvals.
5. `005_agreement_management.sql`: Agreement sequence (`CS-AGR-2026-001`), legal clauses, e-signature provider metadata, and physical signing custody logs.
6. `006_finance_and_payments.sql`: Sequential invoice generator (`CS-INV-2026-001`), receipt generator (`CS-REC-2026-001`), GST split (CGST/SGST/IGST), and financial audit trails.
7. `007_project_management.sql`: Sequential project generator (`CS-PRJ-2026-001`), 17 pipeline stages, task comments/attachments, design previews, and revision tickets.
8. `008_testing_deployment_handover.sql`: 14 QA test suites, bug tracking, deployment environment credentials vault, and dual-party signed handover certificates.
9. `009_document_management_and_storage.sql`: 13 document categories, access history logs, multi-version tracking, backup schedule verification, and client portal authentication access.
10. `010_maintenance_and_monitoring.sql`: Configurable maintenance plans (Standard ₹1,999 / Advanced ₹2,999), recurring contract records, synthetic website health probes, and incident alerts.
11. `011_email_and_business_automation.sql`: 30 automated lifecycle event rules, email dispatch outbox, delivery status audit logs, and internal notification center.

#### 3.2 Relational Entity Relationship Model
```
┌──────────────┐       1:N       ┌────────────────────┐
│    Leads     ├────────────────►│  Requirements Spec  │
└──────┬───────┘                 └─────────┬──────────┘
       │ 1:1 Convert                       │ 1:N
       ▼                                   ▼
┌──────────────┐       1:N       ┌────────────────────┐
│   Clients    ├────────────────►│     Quotations     │
└──────┬───────┘                 └─────────┬──────────┘
       │                                   │ 1:1
       │ 1:N                               ▼
       ├────────────────────────►┌────────────────────┐
       │                         │     Agreements     │
       │                         └─────────┬──────────┘
       │                                   │ 1:1
       │ 1:N                               ▼
       ├────────────────────────►┌────────────────────┐
       │                         │      Projects      │
       │                         └─────────┬──────────┘
       │                                   │ 1:N
       │                         ┌─────────┴──────────┐
       │                         ▼                    ▼
       │                  ┌──────────────┐    ┌──────────────┐
       │                  │    Tasks     │    │   Designs    │
       │                  └──────────────┘    └──────────────┘
       │                                              │ 1:N
       │                                              ▼
       │                                      ┌──────────────┐
       │                                      │  Revisions   │
       │                                      └──────────────┘
       │ 1:N
       ├────────────────────────►┌────────────────────┐
       │                         │ Invoices & Billing │
       │                         └─────────┬──────────┘
       │                                   │ 1:N
       │                                   ▼
       ├────────────────────────►┌────────────────────┐
       │                         │  Verified Payments │
       │                         └─────────┬──────────┘
       │                                   │ 1:1
       │                                   ▼
       │                         ┌────────────────────┐
       │                         │  Payment Receipts  │
       │                         └────────────────────┘
       │ 1:N
       ├────────────────────────►┌────────────────────┐
       │                         │  Deployments & QA  │
       │                         └─────────┬──────────┘
       │                                   │ 1:1
       │                                   ▼
       │                         ┌────────────────────┐
       │                         │ Handover Acceptance│
       │                         └────────────────────┘
       │ 1:N
       ├────────────────────────►┌────────────────────┐
       │                         │ Maintenance & SLA  │
       │                         └─────────┬──────────┘
       │                                   │ 1:N
       │                                   ▼
       │                         ┌────────────────────┐
       │                         │ Synthetic Probes   │
       │                         └────────────────────┘
       │ 1:N
       └────────────────────────►┌────────────────────┐
                                 │ Client Portal Auth │
                                 └────────────────────┘
```

---

### 4. Security Architecture & Access Control (RBAC)

#### 4.1 Five-Tier Role Hierarchy
1. **Super Admin:** Unrestricted global authority, security policies, API key configuration, and administrative audits.
2. **Administrator:** Full managerial control across clients, projects, agreements, and operational resources.
3. **Project Manager:** Sprints, tasks, requirements, design approvals, QA tests, and handover execution.
4. **Finance Manager:** Billing, quotations, agreements, GST tax invoices, and verified payment receipts.
5. **Technical Staff:** Developer access to tasks, bug tickets, testing checklists, deployments, and synthetic probes.

#### 4.2 Client Portal Data Isolation
- Client portal requests are authenticated via email + unique passcode verification stored in `client_portal_access`.
- **Zero Cross-Client Data Leakage:** All queries executed in the client portal explicitly enforce:
  `WHERE client_id = authenticated_session_client_id`
- Clients cannot inspect or query records belonging to any other enterprise.

#### 4.3 Zero-Plaintext Credential Mandate
- In accordance with enterprise cybersecurity guidelines, server credentials, registrar passwords, and database connection strings are never stored as plain text.
- Infrastructure and hosting transfer configurations utilize delegated IAM roles, DNS token challenges, and encrypted bearer tokens.

#### 4.4 Private Document Storage Architecture
- Public document access is completely disabled.
- Storage files reside in private client folders (`clients/{client_id}/{category}/{document_id}.ext`).
- When an authorized user downloads or previews a file, the platform generates a cryptographic HMAC signed URL with an expiration period of **3600 seconds (1 hour)**. Every URL generation logs timestamp, IP address, and identity in `access_history`.

---

### 5. Email & Business Automation Architecture

#### 5.1 Provider Engine
- Integrated directly with Brevo REST API v3 using HTTPS authorization.
- Supported sender identity verification with fallback to verified environment configuration.

#### 5.2 Deduplication Engine
- To prevent spamming clients during rapid status transitions, every outbound automated event computes a unique deduplication key:
  `${rule_id}_${reference_id}_${YYYY-MM-DD}`
- If an email has already been transmitted for that record on the same date, subsequent duplicate dispatches are automatically suppressed unless explicitly triggered by an administrator's "Resend" command.

#### 5.3 Verified Delivery Audit Trail
- System enforces strict compliance: *"Never report an email as delivered unless the email provider confirms its delivery status."*
- Emails are categorized into 5 discrete states:
  - `queued`: Enqueued in database pending provider acceptance.
  - `sent`: Successfully transmitted to and accepted by the Brevo transactional gateway (with `provider_message_id`).
  - `delivered`: Confirmed delivery payload received via webhook.
  - `bounced`: Invalid recipient mailbox or domain rejection.
  - `failed`: Network timeout or API refusal (with recorded `error_message`).

---

### 6. Client-Side PDF Generation Engine

The application includes an in-memory vector binary PDF generation engine (`PDFBuilder`) implemented in [pdfGenerator.ts](file:///d:/Project%20CSSD/src/lib/pdfGenerator.ts). It generates valid binary PDF 1.4 documents completely client-side without opening print dialogues or third-party web renderers.

#### PDF Documents Generated:
1. **Quotation Specification Document** (`downloadQuotationPDF`): Sequential numbering, GST breakdown, itemized scope, payment milestone schedule, and digital acceptance seal.
2. **Master Service Agreement** (`downloadAgreementPDF`): 17 legal clauses, deliverable schedule, payment terms, confidentiality terms, and dual signature blocks.
3. **Sequential Tax Invoice** (`downloadInvoicePDF`): Compliant with Indian GST Act requirements (CGST/SGST/IGST breakdown, GSTIN/PAN, due dates, balance due).
4. **Verified Payment Receipt** (`downloadReceiptPDF`): Sequential `CS-REC-2026-xxx` numbering, UTR reference, payment mode, and verified settlement timestamp.
5. **Handover Acceptance Certificate** (`downloadHandoverDocumentPDF`): 12-section asset transfer summary, live website verification, and dual-party legal execution.
6. **Maintenance & Health Report** (`downloadMaintenanceReportPDF`): Annual subscription summary, telemetry benchmarks (uptime % and response latency), maintenance activity logs, and SLA compliance certificate.
