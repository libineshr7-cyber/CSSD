# CapeSecure Business Management System

A production-ready internal business management platform for CapeSecure, managing the complete client lifecycle from lead acquisition to handover and maintenance.

## 🚀 Features

- **Lead Management** – Track and qualify incoming leads through a full pipeline
- **Client Management** – Complete client profiles and relationship history
- **Requirements Gathering** – Structured requirement collection forms
- **Quotations** – Create, send, and track professional quotations with auto-calculated totals
- **Agreements** – Generate and manage service agreements with signature tracking
- **Payments & Invoices** – Track all financial transactions with proof of payment
- **Project Management** – Kanban and table views with progress tracking
- **Task Management** – Per-project task boards with priority and assignee
- **Design Approvals** – Manage design feedback and approval workflows
- **Testing & QA** – Test suite management and bug tracking
- **Deployments** – Deployment tracking with environment management
- **Client Handover** – Checklist-based handover tracker
- **Maintenance Plans** – Track recurring maintenance and renewal schedules
- **Website Monitoring** – Uptime and health monitoring for client websites
- **Support Tickets** – Internal ticket system with priority management
- **Document Storage** – Secure document management with access control
- **Reports & Analytics** – Revenue, project, and client analytics with charts
- **Settings** – Full system configuration, team, integrations, and audit log

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Routing | React Router v6 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Backend | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Hosting | Vercel |

## 📦 Getting Started

### 1. Clone and install

```bash
git clone https://github.com/capesecure/bms.git
cd bms
npm install
```

### 2. Environment setup

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database setup

Run the SQL migration in your Supabase SQL Editor:

```
supabase/migrations/001_initial_schema.sql
```

### 4. Run development server

```bash
npm run dev
```

## 🔐 Demo Mode

If no Supabase environment variables are configured, the app runs in **Demo Mode** with pre-loaded sample data.

Demo credentials:
- Email: `admin@capesecure.co.za`
- Password: `admin123`

## 🏗️ Project Structure

```
src/
├── components/
│   └── layout/         # AppLayout, Sidebar, TopNav
├── contexts/           # AuthContext, ThemeContext
├── data/               # demoData.ts (sample data)
├── lib/                # supabase.ts, utils.ts
├── pages/              # All 20 page components
├── types/              # TypeScript type definitions
├── App.tsx             # Router and providers
└── main.tsx            # Entry point
supabase/
└── migrations/         # Database SQL migrations
```

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- Authenticated admin-only access via Supabase Auth
- Service role key never exposed to client
- Signed URLs for private document access
- Audit logging for all important actions
- Input validation on all forms

## 📊 Database Schema

The database includes 12 core tables:
- `leads`, `clients`, `requirements`
- `quotations`, `agreements`
- `projects`, `tasks`
- `payments`, `invoices`
- `support_tickets`, `documents`
- `audit_logs`

All tables have Row Level Security, auto-updated `updated_at` timestamps, and appropriate indexes.

## 🚢 Deployment

```bash
npm run build
```

Deploy to Vercel with environment variables configured.

## 📝 License

Internal use only – CapeSecure proprietary system.
