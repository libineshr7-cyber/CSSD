-- CapeSecure BMS Database Schema
-- Run these migrations in order in your Supabase SQL Editor

-- =====================================================
-- ENABLE EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- =====================================================
-- TABLE: leads
-- =====================================================
CREATE TABLE IF NOT EXISTS leads (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  company       TEXT,
  status        TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','contacted','qualified','proposal','negotiation','won','lost')),
  source        TEXT NOT NULL DEFAULT 'website'
                  CHECK (source IN ('website','referral','social','cold_call','email','event','other')),
  budget        NUMERIC(12,2),
  notes         TEXT,
  assigned_to   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  next_follow_up TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- TABLE: clients
-- =====================================================
CREATE TABLE IF NOT EXISTS clients (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id     UUID REFERENCES leads(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  phone       TEXT,
  company     TEXT,
  address     TEXT,
  city        TEXT,
  country     TEXT DEFAULT 'South Africa',
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','inactive','suspended','churned')),
  avatar_url  TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- TABLE: requirements
-- =====================================================
CREATE TABLE IF NOT EXISTS requirements (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id          UUID,
  title               TEXT NOT NULL,
  description         TEXT,
  website_type        TEXT,
  pages               TEXT[] DEFAULT '{}',
  features            TEXT[] DEFAULT '{}',
  design_preferences  TEXT,
  reference_urls      TEXT[] DEFAULT '{}',
  timeline            TEXT,
  budget_range        TEXT,
  status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','submitted','reviewed','approved')),
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- TABLE: quotations
-- =====================================================
CREATE TABLE IF NOT EXISTS quotations (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  requirement_id  UUID REFERENCES requirements(id) ON DELETE SET NULL,
  quote_number    TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  items           JSONB NOT NULL DEFAULT '[]',
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate        NUMERIC(5,2) NOT NULL DEFAULT 15,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  valid_until     DATE,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','sent','viewed','accepted','rejected','expired')),
  sent_at         TIMESTAMPTZ,
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- TABLE: agreements
-- =====================================================
CREATE TABLE IF NOT EXISTS agreements (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  quotation_id        UUID REFERENCES quotations(id) ON DELETE SET NULL,
  agreement_number    TEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  content             TEXT,
  total_value         NUMERIC(12,2) NOT NULL DEFAULT 0,
  advance_percentage  NUMERIC(5,2) NOT NULL DEFAULT 50,
  advance_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','sent','signed','active','completed','terminated')),
  signed_at           TIMESTAMPTZ,
  signature_url       TEXT,
  file_url            TEXT,
  start_date          DATE,
  end_date            DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- TABLE: projects
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agreement_id    UUID REFERENCES agreements(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'planning'
                    CHECK (status IN ('planning','design','development','review','testing','deployment','live','maintenance','paused','cancelled')),
  priority        TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low','medium','high','urgent')),
  start_date      DATE,
  deadline        DATE,
  completed_at    TIMESTAMPTZ,
  website_url     TEXT,
  staging_url     TEXT,
  repository_url  TEXT,
  tech_stack      TEXT[] DEFAULT '{}',
  progress        INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add FK from requirements to projects
ALTER TABLE requirements
  ADD CONSTRAINT fk_requirements_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

-- =====================================================
-- TABLE: tasks
-- =====================================================
CREATE TABLE IF NOT EXISTS tasks (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'todo'
                 CHECK (status IN ('todo','in_progress','review','done','blocked')),
  priority     TEXT NOT NULL DEFAULT 'medium'
                 CHECK (priority IN ('low','medium','high','urgent')),
  assigned_to  TEXT,
  due_date     DATE,
  completed_at TIMESTAMPTZ,
  tags         TEXT[] DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- TABLE: payments
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  invoice_id      UUID,
  agreement_id    UUID REFERENCES agreements(id) ON DELETE SET NULL,
  reference       TEXT NOT NULL UNIQUE,
  amount          NUMERIC(12,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'ZAR',
  payment_type    TEXT NOT NULL DEFAULT 'advance'
                    CHECK (payment_type IN ('advance','milestone','final','maintenance','other')),
  payment_method  TEXT NOT NULL DEFAULT 'bank_transfer'
                    CHECK (payment_method IN ('bank_transfer','card','cash','paypal','other')),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','received','failed','refunded')),
  received_date   DATE,
  notes           TEXT,
  proof_url       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- TABLE: invoices
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  payment_id      UUID REFERENCES payments(id) ON DELETE SET NULL,
  invoice_number  TEXT NOT NULL UNIQUE,
  items           JSONB NOT NULL DEFAULT '[]',
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate        NUMERIC(5,2) NOT NULL DEFAULT 15,
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date        DATE,
  paid_at         TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
  notes           TEXT,
  file_url        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add FK from payments to invoices (circular, needs deferred)
ALTER TABLE payments
  ADD CONSTRAINT fk_payments_invoice
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- =====================================================
-- TABLE: support_tickets
-- =====================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  ticket_number   TEXT NOT NULL UNIQUE,
  subject         TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','in_progress','waiting','resolved','closed')),
  priority        TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low','medium','high','urgent')),
  category        TEXT,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- TABLE: documents
-- =====================================================
CREATE TABLE IF NOT EXISTS documents (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id    UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id   UUID REFERENCES projects(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  category     TEXT NOT NULL DEFAULT 'Other',
  file_url     TEXT NOT NULL,
  file_size    BIGINT,
  file_type    TEXT,
  is_private   BOOLEAN NOT NULL DEFAULT TRUE,
  tags         TEXT[] DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- TABLE: audit_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   UUID,
  metadata      JSONB,
  ip_address    INET,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- TRIGGERS: auto-update updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['leads','clients','requirements','quotations','agreements','projects','tasks','payments','invoices','support_tickets','documents']
  LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      t, t
    );
  END LOOP;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE leads            ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs       ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can do everything (admin-only platform)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['leads','clients','requirements','quotations','agreements','projects','tasks','payments','invoices','support_tickets','documents']
  LOOP
    EXECUTE format(
      'CREATE POLICY "Authenticated admin full access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;

-- Audit log: insert only for authenticated
CREATE POLICY "Authenticated can insert audit logs" ON audit_logs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can read audit logs" ON audit_logs
  FOR SELECT TO authenticated USING (true);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_leads_status       ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email        ON leads(email);
CREATE INDEX IF NOT EXISTS idx_clients_status     ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_email      ON clients(email);
CREATE INDEX IF NOT EXISTS idx_projects_client    ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status    ON projects(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project      ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status       ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_payments_client    ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client    ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status    ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_tickets_client     ON support_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status     ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_audit_created      ON audit_logs(created_at DESC);
