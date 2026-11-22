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
-- ==============================================================================
-- CAPESECURE BMS - PHASE 2: AUTHENTICATION, RBAC & SECURITY SCHEMA
-- ==============================================================================

-- 1. Create Role Enumeration
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM (
      'super_admin',
      'administrator',
      'project_manager',
      'finance_manager',
      'technical_staff'
    );
  END IF;
END $$;

-- 2. Create Admin Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL DEFAULT '',
  role        app_role NOT NULL DEFAULT 'technical_staff',
  phone       TEXT,
  avatar_url  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Create Configurable Role Permissions Matrix Table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role        app_role NOT NULL,
  module      TEXT NOT NULL,
  can_view    BOOLEAN NOT NULL DEFAULT FALSE,
  can_create  BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit    BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (role, module)
);

-- 4. Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_current_admin_role()
RETURNS app_role AS $$
DECLARE
  v_role app_role;
BEGIN
  SELECT role INTO v_role
  FROM public.admin_profiles
  WHERE id = auth.uid() AND is_active = TRUE;
  
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. Function to check granular module permissions
CREATE OR REPLACE FUNCTION public.has_permission(
  p_module TEXT,
  p_action TEXT -- 'view', 'create', 'edit', 'delete'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role app_role;
  v_allowed BOOLEAN := FALSE;
BEGIN
  v_role := public.get_current_admin_role();
  
  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Super admin has universal bypass
  IF v_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  SELECT 
    CASE p_action
      WHEN 'view'   THEN can_view
      WHEN 'create' THEN can_create
      WHEN 'edit'   THEN can_edit
      WHEN 'delete' THEN can_delete
      ELSE FALSE
    END INTO v_allowed
  FROM public.role_permissions
  WHERE role = v_role AND module = p_module;
  
  RETURN COALESCE(v_allowed, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. Trigger to automatically provision profile when an admin signs up
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS TRIGGER AS $$
DECLARE
  v_count INT;
  v_role app_role;
  v_full_name TEXT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.admin_profiles;
  
  -- First registered user is automatically Super Admin
  IF v_count = 0 THEN
    v_role := 'super_admin'::app_role;
  ELSE
    -- Check role provided in user metadata, fallback to technical_staff
    BEGIN
      v_role := COALESCE(
        (NEW.raw_user_meta_data->>'role')::app_role,
        'technical_staff'::app_role
      );
    EXCEPTION WHEN OTHERS THEN
      v_role := 'technical_staff'::app_role;
    END;
  END IF;

  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.admin_profiles (id, email, full_name, role, is_active)
  VALUES (NEW.id, NEW.email, v_full_name, v_role, TRUE)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = CASE WHEN admin_profiles.full_name = '' THEN EXCLUDED.full_name ELSE admin_profiles.full_name END;

  -- Log action into audit_logs
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (
    NEW.id,
    'ADMIN_USER_REGISTERED',
    'admin_profile',
    NEW.id,
    jsonb_build_object('email', NEW.email, 'assigned_role', v_role)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_admin_user();

-- 7. Seed Default Role Permissions
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_edit, can_delete) VALUES
  -- Super Admin: Full Permissions across all modules
  ('super_admin', 'overview',          TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'leads',             TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'clients',           TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'requirements',      TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'quotations',        TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'agreements',        TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'payments',          TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'invoices',          TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'projects',          TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'tasks',             TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'design-approvals',  TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'testing',           TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'deployments',       TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'handover',          TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'maintenance',       TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'monitoring',        TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'tickets',           TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'documents',         TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'reports',           TRUE, TRUE, TRUE, TRUE),
  ('super_admin', 'settings',          TRUE, TRUE, TRUE, TRUE),

  -- Administrator: Full Operational and Financial, can view settings but not delete system records
  ('administrator', 'overview',          TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'leads',             TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'clients',           TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'requirements',      TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'quotations',        TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'agreements',        TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'payments',          TRUE, TRUE, TRUE, FALSE),
  ('administrator', 'invoices',          TRUE, TRUE, TRUE, FALSE),
  ('administrator', 'projects',          TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'tasks',             TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'design-approvals',  TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'testing',           TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'deployments',       TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'handover',          TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'maintenance',       TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'monitoring',        TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'tickets',           TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'documents',         TRUE, TRUE, TRUE, TRUE),
  ('administrator', 'reports',           TRUE, FALSE, FALSE, FALSE),
  ('administrator', 'settings',          TRUE, FALSE, TRUE, FALSE),

  -- Project Manager: Projects, Tasks, Requirements, Design, Deployments, Handover, Support
  ('project_manager', 'overview',          TRUE, FALSE, FALSE, FALSE),
  ('project_manager', 'leads',             TRUE, FALSE, FALSE, FALSE),
  ('project_manager', 'clients',           TRUE, FALSE, TRUE, FALSE),
  ('project_manager', 'requirements',      TRUE, TRUE, TRUE, FALSE),
  ('project_manager', 'quotations',        TRUE, FALSE, FALSE, FALSE),
  ('project_manager', 'agreements',        TRUE, FALSE, FALSE, FALSE),
  ('project_manager', 'payments',          FALSE, FALSE, FALSE, FALSE),
  ('project_manager', 'invoices',          FALSE, FALSE, FALSE, FALSE),
  ('project_manager', 'projects',          TRUE, TRUE, TRUE, FALSE),
  ('project_manager', 'tasks',             TRUE, TRUE, TRUE, TRUE),
  ('project_manager', 'design-approvals',  TRUE, TRUE, TRUE, FALSE),
  ('project_manager', 'testing',           TRUE, TRUE, TRUE, FALSE),
  ('project_manager', 'deployments',       TRUE, TRUE, TRUE, FALSE),
  ('project_manager', 'handover',          TRUE, TRUE, TRUE, FALSE),
  ('project_manager', 'maintenance',       TRUE, FALSE, TRUE, FALSE),
  ('project_manager', 'monitoring',        TRUE, FALSE, FALSE, FALSE),
  ('project_manager', 'tickets',           TRUE, TRUE, TRUE, FALSE),
  ('project_manager', 'documents',         TRUE, TRUE, TRUE, FALSE),
  ('project_manager', 'reports',           TRUE, FALSE, FALSE, FALSE),
  ('project_manager', 'settings',          FALSE, FALSE, FALSE, FALSE),

  -- Finance Manager: Quotes, Agreements, Payments, Invoices, Financial Reports, Clients
  ('finance_manager', 'overview',          TRUE, FALSE, FALSE, FALSE),
  ('finance_manager', 'leads',             TRUE, FALSE, FALSE, FALSE),
  ('finance_manager', 'clients',           TRUE, FALSE, TRUE, FALSE),
  ('finance_manager', 'requirements',      TRUE, FALSE, FALSE, FALSE),
  ('finance_manager', 'quotations',        TRUE, TRUE, TRUE, TRUE),
  ('finance_manager', 'agreements',        TRUE, TRUE, TRUE, FALSE),
  ('finance_manager', 'payments',          TRUE, TRUE, TRUE, FALSE),
  ('finance_manager', 'invoices',          TRUE, TRUE, TRUE, FALSE),
  ('finance_manager', 'projects',          TRUE, FALSE, FALSE, FALSE),
  ('finance_manager', 'tasks',             FALSE, FALSE, FALSE, FALSE),
  ('finance_manager', 'design-approvals',  FALSE, FALSE, FALSE, FALSE),
  ('finance_manager', 'testing',           FALSE, FALSE, FALSE, FALSE),
  ('finance_manager', 'deployments',       FALSE, FALSE, FALSE, FALSE),
  ('finance_manager', 'handover',          FALSE, FALSE, FALSE, FALSE),
  ('finance_manager', 'maintenance',       TRUE, TRUE, TRUE, FALSE),
  ('finance_manager', 'monitoring',        FALSE, FALSE, FALSE, FALSE),
  ('finance_manager', 'tickets',           TRUE, FALSE, FALSE, FALSE),
  ('finance_manager', 'documents',         TRUE, TRUE, TRUE, FALSE),
  ('finance_manager', 'reports',           TRUE, TRUE, FALSE, FALSE),
  ('finance_manager', 'settings',          FALSE, FALSE, FALSE, FALSE),

  -- Technical Staff: Projects, Tasks, QA Testing, Deployments, Health Monitoring, Support Tickets
  ('technical_staff', 'overview',          TRUE, FALSE, FALSE, FALSE),
  ('technical_staff', 'leads',             FALSE, FALSE, FALSE, FALSE),
  ('technical_staff', 'clients',           FALSE, FALSE, FALSE, FALSE),
  ('technical_staff', 'requirements',      TRUE, FALSE, FALSE, FALSE),
  ('technical_staff', 'quotations',        FALSE, FALSE, FALSE, FALSE),
  ('technical_staff', 'agreements',        FALSE, FALSE, FALSE, FALSE),
  ('technical_staff', 'payments',          FALSE, FALSE, FALSE, FALSE),
  ('technical_staff', 'invoices',          FALSE, FALSE, FALSE, FALSE),
  ('technical_staff', 'projects',          TRUE, FALSE, TRUE, FALSE),
  ('technical_staff', 'tasks',             TRUE, TRUE, TRUE, FALSE),
  ('technical_staff', 'design-approvals',  TRUE, FALSE, TRUE, FALSE),
  ('technical_staff', 'testing',           TRUE, TRUE, TRUE, FALSE),
  ('technical_staff', 'deployments',       TRUE, TRUE, TRUE, FALSE),
  ('technical_staff', 'handover',          TRUE, FALSE, TRUE, FALSE),
  ('technical_staff', 'maintenance',       TRUE, FALSE, TRUE, FALSE),
  ('technical_staff', 'monitoring',        TRUE, TRUE, TRUE, FALSE),
  ('technical_staff', 'tickets',           TRUE, TRUE, TRUE, FALSE),
  ('technical_staff', 'documents',         TRUE, TRUE, TRUE, FALSE),
  ('technical_staff', 'reports',           FALSE, FALSE, FALSE, FALSE),
  ('technical_staff', 'settings',          FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (role, module) DO UPDATE
  SET can_view   = EXCLUDED.can_view,
      can_create = EXCLUDED.can_create,
      can_edit   = EXCLUDED.can_edit,
      can_delete = EXCLUDED.can_delete,
      updated_at = NOW();

-- 8. Enable Row Level Security (RLS) on RBAC Tables
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for admin_profiles
DROP POLICY IF EXISTS "Active admins can view profile directory" ON public.admin_profiles;
CREATE POLICY "Active admins can view profile directory"
  ON public.admin_profiles FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Admins can update their own profile" ON public.admin_profiles;
CREATE POLICY "Admins can update their own profile"
  ON public.admin_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Super Admins can manage all admin profiles" ON public.admin_profiles;
CREATE POLICY "Super Admins can manage all admin profiles"
  ON public.admin_profiles FOR ALL
  TO authenticated
  USING (public.get_current_admin_role() IN ('super_admin', 'administrator'))
  WITH CHECK (public.get_current_admin_role() IN ('super_admin', 'administrator'));

-- Policies for role_permissions
DROP POLICY IF EXISTS "Authenticated users can view permissions matrix" ON public.role_permissions;
CREATE POLICY "Authenticated users can view permissions matrix"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Super Admin can update role permissions" ON public.role_permissions;
CREATE POLICY "Super Admin can update role permissions"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (public.get_current_admin_role() = 'super_admin')
  WITH CHECK (public.get_current_admin_role() = 'super_admin');

-- 9. Secure Financial Tables with Module RLS
-- Payments RLS
DROP POLICY IF EXISTS "Payments view permission policy" ON public.payments;
CREATE POLICY "Payments view permission policy"
  ON public.payments FOR SELECT
  TO authenticated
  USING (public.has_permission('payments', 'view'));

DROP POLICY IF EXISTS "Payments insert permission policy" ON public.payments;
CREATE POLICY "Payments insert permission policy"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (public.has_permission('payments', 'create'));

DROP POLICY IF EXISTS "Payments update permission policy" ON public.payments;
CREATE POLICY "Payments update permission policy"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (public.has_permission('payments', 'edit'))
  WITH CHECK (public.has_permission('payments', 'edit'));

-- Invoices RLS
DROP POLICY IF EXISTS "Invoices view permission policy" ON public.invoices;
CREATE POLICY "Invoices view permission policy"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (public.has_permission('invoices', 'view'));

DROP POLICY IF EXISTS "Invoices insert permission policy" ON public.invoices;
CREATE POLICY "Invoices insert permission policy"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (public.has_permission('invoices', 'create'));

DROP POLICY IF EXISTS "Invoices update permission policy" ON public.invoices;
CREATE POLICY "Invoices update permission policy"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (public.has_permission('invoices', 'edit'))
  WITH CHECK (public.has_permission('invoices', 'edit'));

-- 10. Audit Logging Helper Function
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), p_action, p_resource_type, p_resource_id, p_metadata)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- =====================================================
-- Migration 003: Client and Lead Management Enhancements
-- CapeSecure Business Management System - Phase 3
-- =====================================================

-- ─── 1. LEAD STATUS & FIELD ENHANCEMENTS ──────────────────────────────────
-- Drop existing check constraint if present so we can support new statuses
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'leads_status_check' AND conrelid = 'leads'::regclass
  ) THEN
    ALTER TABLE leads DROP CONSTRAINT leads_status_check;
  END IF;
END $$;

-- Add updated check constraint supporting all required statuses
ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (
  status IN (
    'new_lead',
    'contacted',
    'discussion',
    'requirements_pending',
    'quotation_preparation',
    'quotation_sent',
    'won',
    'lost',
    -- backward compatibility
    'new',
    'qualified',
    'proposal',
    'negotiation'
  )
);

-- Add lead management enhancement columns
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_time TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_notes TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS archived_reason TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- ─── 2. CLIENT CODE SEQUENCE & ENHANCEMENTS ─────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS client_code_seq START WITH 1;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_code TEXT UNIQUE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS business_category TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS preferred_comm TEXT DEFAULT 'email';

-- Function to generate client code: CS-CLIENT-0001, CS-CLIENT-0002...
CREATE OR REPLACE FUNCTION generate_next_client_code()
RETURNS TEXT AS $$
DECLARE
  next_id BIGINT;
  new_code TEXT;
BEGIN
  next_id := nextval('client_code_seq');
  new_code := 'CS-CLIENT-' || LPAD(next_id::TEXT, 4, '0');
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-assign client_code if missing
CREATE OR REPLACE FUNCTION set_client_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_code IS NULL OR NEW.client_code = '' THEN
    NEW.client_code := generate_next_client_code();
  END IF;
  IF NEW.business_name IS NULL OR NEW.business_name = '' THEN
    NEW.business_name := NEW.company;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_client_code ON clients;
CREATE TRIGGER trg_set_client_code
  BEFORE INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION set_client_code();

-- Backfill any existing clients that don't have client_code
DO $$
DECLARE
  r RECORD;
  i INT := 1;
BEGIN
  FOR r IN SELECT id FROM clients WHERE client_code IS NULL ORDER BY created_at ASC LOOP
    UPDATE clients 
    SET client_code = 'CS-CLIENT-' || LPAD(i::TEXT, 4, '0'),
        business_name = COALESCE(business_name, company)
    WHERE id = r.id;
    i := i + 1;
  END LOOP;
  -- Set sequence to current max
  PERFORM setval('client_code_seq', GREATEST(i, 1));
END $$;

-- ─── 3. REQUIREMENT SPECIFICATION ENHANCEMENTS ──────────────────────────────
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS business_purpose TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS frontend_tech TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS backend_tech TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS database_tech TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS payment_gateway TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS shipping_integration TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS domain_requirements TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS hosting_requirements TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS budget_min NUMERIC(12,2);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS budget_max NUMERIC(12,2);
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS additional_notes TEXT;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE requirements ADD COLUMN IF NOT EXISTS reference_websites JSONB DEFAULT '[]'::jsonb;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up ON leads(next_follow_up);
CREATE INDEX IF NOT EXISTS idx_leads_is_archived ON leads(is_archived);
CREATE INDEX IF NOT EXISTS idx_clients_client_code ON clients(client_code);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_requirements_client_id ON requirements(client_id);
CREATE INDEX IF NOT EXISTS idx_requirements_lead_id ON requirements(lead_id);
-- =====================================================
-- Migration 004: Professional Quotation Management
-- CapeSecure Business Management System - Phase 4
-- =====================================================

-- ─── 1. SEQUENCE FOR QUOTATION NUMBERING ──────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS quotation_number_seq START WITH 1;

-- Function to generate sequential quotation number e.g. CS-QTN-2026-001
CREATE OR REPLACE FUNCTION generate_next_quotation_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_val BIGINT;
BEGIN
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  next_val := nextval('quotation_number_seq');
  RETURN 'CS-QTN-' || current_year || '-' || LPAD(next_val::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── 2. UPDATE QUOTATIONS STATUS CONSTRAINT & ENHANCEMENTS ──────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quotations_status_check' AND conrelid = 'quotations'::regclass
  ) THEN
    ALTER TABLE quotations DROP CONSTRAINT quotations_status_check;
  END IF;
END $$;

ALTER TABLE quotations ADD CONSTRAINT quotations_status_check CHECK (
  status IN (
    'draft',
    'sent',
    'viewed',
    'under_discussion',
    'revision_requested',
    'approved',
    'rejected',
    'expired',
    'accepted' -- backward compatible alias for approved
  )
);

-- Add comprehensive fields to quotations
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS parent_quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS delivery_timeline TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS advance_percentage NUMERIC(5,2) DEFAULT 50.00;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS payment_milestones JSONB DEFAULT '[]'::jsonb;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS terms_conditions TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS approval_details JSONB;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS email_sent_to TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS email_subject TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS converted_project_id UUID;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotations_quote_number ON quotations(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_client_id ON quotations(client_id);
CREATE INDEX IF NOT EXISTS idx_quotations_parent_id ON quotations(parent_quotation_id);
-- =====================================================
-- Migration 005: Agreement Generation and Signing Workflow
-- CapeSecure Business Management System - Phase 5
-- =====================================================

-- ─── 1. AGREEMENT NUMBER SEQUENCE ──────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS agreement_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION generate_next_agreement_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_val BIGINT;
BEGIN
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  next_val := nextval('agreement_number_seq');
  RETURN 'CS-AGR-' || current_year || '-' || LPAD(next_val::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── 2. UPDATE AGREEMENTS STATUS CONSTRAINT ──────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'agreements_status_check' AND conrelid = 'agreements'::regclass
  ) THEN
    ALTER TABLE agreements DROP CONSTRAINT agreements_status_check;
  END IF;
END $$;

ALTER TABLE agreements ADD CONSTRAINT agreements_status_check CHECK (
  status IN (
    'draft',
    'sent_for_signature',
    'partially_signed',
    'fully_signed',
    'declined',
    'expired',
    -- legacy aliases
    'sent',
    'signed',
    'active',
    'completed',
    'terminated'
  )
);

-- ─── 3. AGREEMENT CONTENT & E-SIGN AUDIT ENHANCEMENTS ──────────────────────
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS quotation_number TEXT;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS scope_of_services TEXT;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS project_deliverables JSONB DEFAULT '[]'::jsonb;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS payment_schedule JSONB DEFAULT '[]'::jsonb;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS revisions_policy TEXT;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS ip_terms TEXT;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS confidentiality_terms TEXT;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS maintenance_terms TEXT;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS cancellation_terms TEXT;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS liability_terms TEXT;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS dispute_resolution TEXT;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS governing_law TEXT;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS esign_details JSONB;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS signature_audit JSONB;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS physical_custody JSONB;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS signing_method TEXT DEFAULT 'digital';
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS is_privately_restricted BOOLEAN DEFAULT TRUE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agreements_number ON agreements(agreement_number);
CREATE INDEX IF NOT EXISTS idx_agreements_status ON agreements(status);
CREATE INDEX IF NOT EXISTS idx_agreements_client ON agreements(client_id);
CREATE INDEX IF NOT EXISTS idx_agreements_quotation ON agreements(quotation_id);
-- =====================================================
-- Migration 006: Finance and Payment Management
-- CapeSecure Business Management System - Phase 6
-- =====================================================

-- ─── 1. RECEIPT NUMBER & INVOICE NUMBER SEQUENCES ───────────────────────────
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION generate_next_receipt_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_val BIGINT;
BEGIN
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  next_val := nextval('receipt_number_seq');
  RETURN 'CS-REC-' || current_year || '-' || LPAD(next_val::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_next_invoice_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_val BIGINT;
BEGIN
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  next_val := nextval('invoice_number_seq');
  RETURN 'CS-INV-' || current_year || '-' || LPAD(next_val::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ─── 2. PAYMENTS TABLE ENHANCEMENTS ──────────────────────────────────────────
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_number TEXT UNIQUE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending_verification';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verification_evidence TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS recorded_by TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_reason TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_original_ref TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS balance_after_payment NUMERIC(12,2);

-- Update payment type constraints to include refund and additional features
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'payments_payment_type_check' AND conrelid = 'payments'::regclass
  ) THEN
    ALTER TABLE payments DROP CONSTRAINT payments_payment_type_check;
  END IF;
END $$;

ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check CHECK (
  payment_type IN (
    'advance',
    'milestone',
    'final',
    'additional_feature',
    'maintenance',
    'refund',
    'other'
  )
);

-- Update payment method constraints
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'payments_payment_method_check' AND conrelid = 'payments'::regclass
  ) THEN
    ALTER TABLE payments DROP CONSTRAINT payments_payment_method_check;
  END IF;
END $$;

ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check CHECK (
  payment_method IN (
    'upi',
    'bank_transfer',
    'gateway',
    'card',
    'cash',
    'cheque',
    'paypal',
    'other'
  )
);

-- ─── 3. INVOICES TABLE ENHANCEMENTS ──────────────────────────────────────────
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_gst_applicable BOOLEAN DEFAULT true;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_type TEXT DEFAULT 'cgst_sgst';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance_due NUMERIC(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS audit_trail JSONB DEFAULT '[]'::jsonb;

-- ─── 4. FINANCIAL AUDIT LOG TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_audit_logs (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_type  TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  reference   TEXT,
  amount      NUMERIC(12,2),
  actor       TEXT NOT NULL,
  notes       TEXT,
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_financial_audit_created ON financial_audit_logs(created_at DESC);
-- =====================================================
-- CAPESECURE SOLUTIONS LLP
-- Migration 007: Phase 7 - Project Management System
-- =====================================================

-- 1. Create project number sequence
CREATE SEQUENCE IF NOT EXISTS project_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION generate_next_project_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT := TO_CHAR(CURRENT_DATE, 'YYYY');
  next_seq INT;
BEGIN
  SELECT nextval('project_number_seq') INTO next_seq;
  RETURN 'CS-PRJ-' || current_year || '-' || LPAD(next_seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- 2. Enhance projects table with Phase 7 requirements
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS budget NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
  ADD COLUMN IF NOT EXISTS project_manager TEXT DEFAULT 'CapeSecure Project Lead',
  ADD COLUMN IF NOT EXISTS development_team TEXT[] DEFAULT '{"Full-Stack Engineer", "UI/UX Designer", "Security Auditor"}',
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'project_created',
  ADD COLUMN IF NOT EXISTS activity_log JSONB DEFAULT '[]';

-- Backfill project numbers for existing projects if null
DO $$
DECLARE
  rec RECORD;
  seq INT := 1;
  year TEXT := TO_CHAR(CURRENT_DATE, 'YYYY');
BEGIN
  FOR rec IN SELECT id FROM projects WHERE project_number IS NULL LOOP
    UPDATE projects
    SET project_number = 'CS-PRJ-' || year || '-' || LPAD(seq::TEXT, 3, '0')
    WHERE id = rec.id;
    seq := seq + 1;
  END LOOP;
END $$;

-- 3. Enhance tasks table
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_by TEXT;

-- 4. Create design_approvals table
CREATE TABLE IF NOT EXISTS design_approvals (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id            UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id             UUID REFERENCES clients(id) ON DELETE SET NULL,
  title                 TEXT NOT NULL,
  stage                 TEXT NOT NULL DEFAULT 'Mockup'
                          CHECK (stage IN ('Wireframe', 'Mockup', 'Prototype', 'Final')),
  preview_url           TEXT NOT NULL,
  figma_url             TEXT,
  description           TEXT,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'revision_requested')),
  client_feedback       TEXT,
  approved_by           TEXT,
  approved_at           TIMESTAMPTZ,
  revision_requested_at TIMESTAMPTZ,
  version               INTEGER DEFAULT 1,
  approval_history      JSONB DEFAULT '[]',
  created_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Create project_revisions table
CREATE TABLE IF NOT EXISTS project_revisions (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id            UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  design_approval_id    UUID REFERENCES design_approvals(id) ON DELETE SET NULL,
  revision_number       INTEGER NOT NULL DEFAULT 1,
  requested_changes     TEXT NOT NULL,
  assigned_person       TEXT,
  requested_by          TEXT,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'in_progress', 'review', 'resolved')),
  priority              TEXT NOT NULL DEFAULT 'medium'
                          CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  request_date          DATE DEFAULT CURRENT_DATE,
  completion_deadline   DATE,
  resolved_date         TIMESTAMPTZ,
  resolution_notes      TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at            TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE design_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read design_approvals"
  ON design_approvals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert design_approvals"
  ON design_approvals FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update design_approvals"
  ON design_approvals FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete design_approvals"
  ON design_approvals FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read project_revisions"
  ON project_revisions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert project_revisions"
  ON project_revisions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update project_revisions"
  ON project_revisions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete project_revisions"
  ON project_revisions FOR DELETE TO authenticated USING (true);
-- =====================================================
-- CAPESECURE SOLUTIONS LLP
-- Migration 008: Phase 8 - Testing, Deployment & Handover
-- =====================================================

-- 1. Table: qa_test_cases
CREATE TABLE IF NOT EXISTS qa_test_cases (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  checklist_item  TEXT NOT NULL,
  suite           TEXT NOT NULL,
  test_name       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'passed'
                    CHECK (status IN ('passed', 'failed', 'pending', 'skipped')),
  duration_ms     INTEGER DEFAULT 120,
  executed_by     TEXT DEFAULT 'CapeSecure QA Automated Suite',
  executed_at     TIMESTAMPTZ DEFAULT NOW(),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Table: bug_reports
CREATE TABLE IF NOT EXISTS bug_reports (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bug_id          TEXT NOT NULL UNIQUE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  screenshot_url  TEXT,
  severity        TEXT NOT NULL DEFAULT 'medium'
                    CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to     TEXT,
  reported_by     TEXT NOT NULL,
  resolution_notes TEXT,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Table: deployments
CREATE TABLE IF NOT EXISTS deployments (
  id                      UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  deployment_id           TEXT NOT NULL UNIQUE,
  project_id              UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  domain_name             TEXT NOT NULL,
  domain_registrar        TEXT NOT NULL,
  dns_status              TEXT NOT NULL DEFAULT 'configured'
                            CHECK (dns_status IN ('configured', 'propagating', 'pending')),
  hosting_provider        TEXT NOT NULL,
  frontend_deployment_url TEXT NOT NULL,
  backend_api_url         TEXT,
  database_configuration  JSONB DEFAULT '{}',
  ssl_status              TEXT NOT NULL DEFAULT 'active'
                            CHECK (ssl_status IN ('active', 'pending', 'expired')),
  environment             TEXT NOT NULL DEFAULT 'production'
                            CHECK (environment IN ('production', 'staging', 'preview')),
  deployment_version      TEXT NOT NULL DEFAULT 'v1.0.0',
  delegated_access_ref    TEXT DEFAULT 'Delegated IAM Role / KMS Vault Secret Reference',
  status                  TEXT NOT NULL DEFAULT 'success'
                            CHECK (status IN ('success', 'failed', 'in_progress', 'rolled_back')),
  deployed_by             TEXT NOT NULL,
  deployed_at             TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  build_logs              TEXT[] DEFAULT '{}',
  created_at              TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at              TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Table: project_handovers
CREATE TABLE IF NOT EXISTS project_handovers (
  id                          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id                  UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  client_id                   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  live_website_url            TEXT NOT NULL,
  domain_ownership_confirmed  BOOLEAN NOT NULL DEFAULT false,
  domain_transfer_details     TEXT,
  hosting_information         TEXT,
  database_access_transfer    TEXT,
  admin_dashboard_access      TEXT,
  source_code_transfer        TEXT,
  documentation_urls          TEXT[] DEFAULT '{}',
  backup_instructions         TEXT,
  maintenance_sla             TEXT,
  outstanding_issues          TEXT,
  checklist_items             JSONB NOT NULL DEFAULT '[]',
  status                      TEXT NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'in_progress', 'completed')),
  agency_signatory_name       TEXT,
  agency_signatory_title      TEXT,
  agency_signed_at            TIMESTAMPTZ,
  client_signatory_name       TEXT,
  client_signatory_title      TEXT,
  client_acknowledgement      TEXT,
  client_signed_at            TIMESTAMPTZ,
  handover_date               DATE DEFAULT CURRENT_DATE,
  created_at                  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at                  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS
ALTER TABLE qa_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_handovers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow auth read qa_test_cases" ON qa_test_cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow auth insert qa_test_cases" ON qa_test_cases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow auth update qa_test_cases" ON qa_test_cases FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow auth read bug_reports" ON bug_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow auth insert bug_reports" ON bug_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow auth update bug_reports" ON bug_reports FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow auth read deployments" ON deployments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow auth insert deployments" ON deployments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow auth update deployments" ON deployments FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow auth read project_handovers" ON project_handovers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow auth insert project_handovers" ON project_handovers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow auth update project_handovers" ON project_handovers FOR UPDATE TO authenticated USING (true);
-- =====================================================
-- CAPESECURE SOLUTIONS LLP
-- Migration 009: Phase 9 - Document Management & Storage
-- =====================================================

-- 1. Enhance documents table
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS uploaded_by TEXT DEFAULT 'Authorized Administrator',
  ADD COLUMN IF NOT EXISTS retention_policy TEXT DEFAULT '7_years_statutory',
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS version_history JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS access_history JSONB DEFAULT '[]';

-- 2. Create backup_schedules_and_dr table
CREATE TABLE IF NOT EXISTS backup_schedules_and_dr (
  id                      UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  backup_type             TEXT NOT NULL, -- 'database_snapshot', 'storage_replication', 'secondary_cold_archive'
  snapshot_id             TEXT NOT NULL UNIQUE,
  size_bytes              BIGINT DEFAULT 0,
  integrity_hash          TEXT NOT NULL,
  retention_policy        TEXT NOT NULL DEFAULT '7_years_statutory',
  verification_status     TEXT NOT NULL DEFAULT 'verified'
                            CHECK (verification_status IN ('verified', 'pending', 'failed')),
  last_restoration_drill  TIMESTAMPTZ,
  storage_destination     TEXT NOT NULL,
  created_at              TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Create client_portal_access table
CREATE TABLE IF NOT EXISTS client_portal_access (
  id                      UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id               UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  portal_email            TEXT NOT NULL UNIQUE,
  portal_passcode_hash    TEXT,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  last_login              TIMESTAMPTZ,
  login_attempts          INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at              TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE backup_schedules_and_dr ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow auth read backup_schedules" ON backup_schedules_and_dr FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow auth insert backup_schedules" ON backup_schedules_and_dr FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow auth update backup_schedules" ON backup_schedules_and_dr FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow auth read client_portal_access" ON client_portal_access FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow auth insert client_portal_access" ON client_portal_access FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow auth update client_portal_access" ON client_portal_access FOR UPDATE TO authenticated USING (true);
-- 010_maintenance_and_monitoring.sql
-- Complete schema for Phase 10: Maintenance Plans, Records, Website Health Monitoring, and System Alerts

-- 1. Maintenance Plan Configurations
CREATE TABLE IF NOT EXISTS maintenance_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  billing_frequency TEXT NOT NULL DEFAULT 'yearly', -- 'yearly', 'semi_annual', 'quarterly', 'monthly'
  inclusions TEXT[] DEFAULT '{}',
  exclusions TEXT[] DEFAULT '{}',
  support_hours_per_month NUMERIC(5,2) DEFAULT 2.0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default plans required by specification
INSERT INTO maintenance_plans (id, name, price, billing_frequency, inclusions, exclusions, support_hours_per_month, is_active)
VALUES 
  ('plan_standard', 'Standard Maintenance', 1999.00, 'yearly', 
   ARRAY['Core framework & security updates', '99.5% Uptime monitoring (15-min interval)', 'Monthly database backup verification', 'SSL certificate expiry checks', '1 Priority support ticket / month', 'Basic vulnerability patching'], 
   ARRAY['New feature development', 'UI/UX redesigns', 'Third-party API integration costs', 'Major framework version migrations'], 
   2.0, TRUE),
  ('plan_advanced', 'Advanced Maintenance', 2999.00, 'yearly', 
   ARRAY['Weekly core & dependency updates', 'Real-time 99.9% Uptime monitoring (5-min interval)', 'Weekly automated database & asset backups', 'SSL & DNS health checks', 'Unlimited defect fixes for deployed modules', 'High-priority 2-hour response SLA', 'Performance & page-speed optimization audits', 'Quarterly comprehensive security hardening report'], 
   ARRAY['Out-of-scope custom module creation', 'Third-party infrastructure billing (AWS/Vercel/domain)'], 
   5.0, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  billing_frequency = EXCLUDED.billing_frequency,
  inclusions = EXCLUDED.inclusions,
  exclusions = EXCLUDED.exclusions;

-- 2. Maintenance Records
CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  plan_id TEXT NOT NULL REFERENCES maintenance_plans(id),
  plan_name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  billing_frequency TEXT NOT NULL DEFAULT 'yearly',
  start_date DATE NOT NULL,
  renewal_date DATE NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending', -- 'paid', 'pending', 'overdue', 'cancelled'
  contract_status TEXT NOT NULL DEFAULT 'active', -- 'active', 'pending_renewal', 'expired', 'suspended'
  support_entitlement JSONB DEFAULT '{"hours_per_month": 2, "hours_used": 0, "priority_sla": "Standard"}'::jsonb,
  maintenance_history JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Monitored Client Websites
CREATE TABLE IF NOT EXISTS monitored_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'up', -- 'up', 'degraded', 'down'
  http_status INTEGER DEFAULT 200,
  response_time_ms INTEGER DEFAULT 120,
  uptime_percentage NUMERIC(5,2) DEFAULT 99.98,
  ssl_status TEXT DEFAULT 'valid', -- 'valid', 'expiring_soon', 'expired', 'invalid'
  ssl_valid_to TIMESTAMPTZ,
  ssl_days_remaining INTEGER DEFAULT 90,
  ssl_issuer TEXT DEFAULT 'Let''s Encrypt Authority X3',
  domain_expiry_date TIMESTAMPTZ,
  domain_source_verified BOOLEAN DEFAULT FALSE,
  domain_registrar TEXT,
  scheduled_backup_status TEXT DEFAULT 'unverified', -- 'success', 'failed', 'pending', 'unverified'
  backup_source_verified BOOLEAN DEFAULT FALSE,
  last_backup_at TIMESTAMPTZ,
  hosting_availability TEXT DEFAULT 'High Availability (AWS/Vercel Edge)',
  monitoring_interval_mins INTEGER DEFAULT 15,
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Monitoring Logs (Incident & Latency History)
CREATE TABLE IF NOT EXISTS monitoring_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES monitored_websites(id) ON DELETE CASCADE,
  http_status INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,
  status TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. System Health & Maintenance Alerts
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL, -- 'downtime', 'ssl_expiry', 'domain_expiry', 'renewal_approaching', 'backup_failed', 'server_error'
  severity TEXT NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  website_id UUID REFERENCES monitored_websites(id) ON DELETE CASCADE,
  maintenance_record_id UUID REFERENCES maintenance_records(id) ON DELETE CASCADE,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes for Fast Lookups
CREATE INDEX IF NOT EXISTS idx_maint_records_client ON maintenance_records(client_id);
CREATE INDEX IF NOT EXISTS idx_maint_records_renewal ON maintenance_records(renewal_date);
CREATE INDEX IF NOT EXISTS idx_monitored_websites_client ON monitored_websites(client_id);
CREATE INDEX IF NOT EXISTS idx_monitored_websites_status ON monitored_websites(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_website ON monitoring_logs(website_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_unresolved ON system_alerts(is_resolved, severity);

-- 7. Row Level Security Policies
ALTER TABLE maintenance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitored_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read maintenance_plans" ON maintenance_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff write maintenance_plans" ON maintenance_plans FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read maintenance_records" ON maintenance_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff write maintenance_records" ON maintenance_records FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read monitored_websites" ON monitored_websites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff write monitored_websites" ON monitored_websites FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read monitoring_logs" ON monitoring_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff write monitoring_logs" ON monitoring_logs FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read system_alerts" ON system_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff write system_alerts" ON system_alerts FOR ALL TO authenticated USING (true);
-- 011_email_and_business_automation.sql
-- Complete schema for Phase 11: Email Logs, Automated Business Events, and Internal Notification Center

-- 1. Email Dispatch and Delivery Tracking Logs
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  event_type TEXT NOT NULL,
  category TEXT NOT NULL, -- 'lead', 'quotation', 'agreement', 'payment', 'project', 'handover', 'maintenance'
  subject TEXT NOT NULL,
  reference_id UUID,
  reference_number TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'sent', 'delivered', 'bounced', 'failed'
  provider_message_id TEXT,
  error_message TEXT,
  attempts INTEGER DEFAULT 1,
  html_body TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  deduplication_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Internal Notification Center
CREATE TABLE IF NOT EXISTS internal_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'leads', 'quotations', 'agreements', 'payments', 'projects', 'maintenance', 'system'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,
  severity TEXT DEFAULT 'info', -- 'info', 'warning', 'critical', 'success'
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Automation Event Rules & Reminder Configuration
CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT TRUE,
  delay_days INTEGER DEFAULT 0,
  recipient_type TEXT DEFAULT 'client', -- 'client', 'admin', 'both'
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed all 30 automated business events
INSERT INTO automation_rules (id, event_name, category, description, is_enabled, delay_days, recipient_type)
VALUES
  -- LEAD
  ('lead_enquiry_received', 'New Enquiry Received', 'lead', 'Dispatches notification to admin when a new lead enters the system', TRUE, 0, 'admin'),
  ('lead_enquiry_ack', 'Enquiry Acknowledgement', 'lead', 'Sends automated confirmation to the prospective client upon form submission', TRUE, 0, 'client'),
  ('lead_follow_up_reminder', 'Follow-up Reminder', 'lead', 'Alerts sales team if no follow-up occurs within 48 hours', TRUE, 2, 'admin'),

  -- QUOTATION
  ('quote_generated', 'Quotation Generated', 'quotation', 'Internal notification when quote is drafted', TRUE, 0, 'admin'),
  ('quote_sent', 'Quotation Sent', 'quotation', 'Emails client the quotation proposal with secure view link', TRUE, 0, 'client'),
  ('quote_expiry_reminder', 'Quotation Expiry Reminder', 'quotation', 'Reminds client 3 days prior to commercial offer expiration', TRUE, 3, 'client'),
  ('quote_approved', 'Quotation Approved', 'quotation', 'Notifies both parties when client approves the quotation', TRUE, 0, 'both'),
  ('quote_revision', 'Quotation Revision', 'quotation', 'Informs client when a revised quotation is issued', TRUE, 0, 'client'),

  -- AGREEMENT
  ('agreement_sent', 'Agreement Sent for Signing', 'agreement', 'Sends agreement execution link to authorized client signatory', TRUE, 0, 'client'),
  ('agreement_reminder', 'Signature Reminder', 'agreement', 'Follow-up reminder 48 hours after agreement dispatch', TRUE, 2, 'client'),
  ('agreement_executed', 'Agreement Fully Executed', 'agreement', 'Sends verified copy and execution notice to both parties', TRUE, 0, 'both'),

  -- PAYMENT
  ('payment_advance_request', 'Advance Payment Request', 'payment', 'Invoices advance milestone upon agreement execution', TRUE, 0, 'client'),
  ('payment_confirmed', 'Payment Confirmation', 'payment', 'Dispatches verified payment receipt CS-REC-2026-xxx', TRUE, 0, 'client'),
  ('invoice_generated', 'Invoice Generated', 'payment', 'Sends official tax invoice with GST breakdown', TRUE, 0, 'client'),
  ('receipt_generated', 'Receipt Generated', 'payment', 'Sends downloadable payment receipt and audit confirmation', TRUE, 0, 'client'),
  ('payment_final_reminder', 'Final Payment Reminder', 'payment', 'Payment notice upon deployment completion prior to final handover', TRUE, 0, 'client'),

  -- PROJECT
  ('project_started', 'Project Started', 'project', 'Notifies client of project initialization and onboarding kickoff', TRUE, 0, 'client'),
  ('project_design_ready', 'Design Preview Ready', 'project', 'Alerts client that interactive UI/UX mockups are ready for review', TRUE, 0, 'client'),
  ('project_design_approval_req', 'Design Approval Requested', 'project', 'Formal request for design sign-off or change requests', TRUE, 0, 'client'),
  ('project_revision_completed', 'Revision Completed', 'project', 'Informs client that requested UI/code revisions are completed', TRUE, 0, 'client'),
  ('project_demo_ready', 'Demo Website Ready', 'project', 'Provides preview staging environment link for client review', TRUE, 0, 'client'),
  ('project_final_approval_req', 'Final Approval Requested', 'project', 'Requests formal UAT sign-off prior to production deployment', TRUE, 0, 'client'),
  ('project_deployment_completed', 'Deployment Completed', 'project', 'Notifies client of live production cluster deployment', TRUE, 0, 'both'),

  -- HANDOVER
  ('handover_scheduled', 'Handover Scheduled', 'handover', 'Notifies parties of scheduled handover review session', TRUE, 0, 'both'),
  ('handover_docs_available', 'Handover Documents Available', 'handover', 'Provides access to credentials transfer and PRD architecture manuals', TRUE, 0, 'client'),
  ('handover_completed', 'Handover Completed', 'handover', 'Final completion report and dual-signed acceptance certificate delivered', TRUE, 0, 'both'),

  -- MAINTENANCE
  ('maint_renewal_approaching', 'Maintenance Renewal Approaching', 'maintenance', 'Automated 15/30-day reminder before SLA expiration', TRUE, 15, 'client'),
  ('maint_payment_received', 'Maintenance Payment Received', 'maintenance', 'Confirms subscription renewal and extends SLA warranty', TRUE, 0, 'client'),
  ('maint_website_downtime', 'Website Downtime Alert', 'maintenance', 'Instant emergency notification upon synthetic probe failure', TRUE, 0, 'both'),
  ('maint_ssl_expiry_alert', 'SSL Expiry Alert', 'maintenance', 'Critical notice if TLS certificate has less than 15 days remaining', TRUE, 0, 'admin')
ON CONFLICT (id) DO NOTHING;

-- Seed initial internal notifications for realistic administrator experience
INSERT INTO internal_notifications (category, title, message, link_url, severity, is_read)
VALUES
  ('maintenance', 'SSL Certificate Expiry Watch Active', 'Sentinel monitoring is verifying TLS certificates across all registered production endpoints.', '/admin/monitoring', 'info', FALSE),
  ('payments', 'Payment Verification Gateway Ready', 'All sequential invoice CS-INV and receipt CS-REC records are active and audit-logged.', '/admin/invoices', 'success', FALSE),
  ('projects', 'Phase 10 & 11 Automated Workflows Active', 'Brevo transactional engine connected with 30 automated business event handlers.', '/admin/settings', 'info', TRUE)
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(delivery_status);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_notifs_unread ON internal_notifications(is_read, created_at DESC);

-- RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read email_logs" ON email_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff write email_logs" ON email_logs FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read internal_notifications" ON internal_notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff write internal_notifications" ON internal_notifications FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read automation_rules" ON automation_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow staff write automation_rules" ON automation_rules FOR ALL TO authenticated USING (true);
-- ==============================================================================
-- Migration 012: Production RLS Permissions, Table Grants & DEMO RETAIL Seed
-- CapeSecure Business Management System (BMS) - Post-Development Audit
-- ==============================================================================

-- 1. Ensure all Core Tables & Relations Exist (Idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Grant permissions on all existing tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Ensure default privileges apply to any tables created in the future
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- 2. Permissive RLS Policies for Admin & Application Functionality
-- Clients table policy
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public & authenticated clients read" ON clients;
CREATE POLICY "Public & authenticated clients read" ON clients FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated clients manage" ON clients;
CREATE POLICY "Authenticated clients manage" ON clients FOR ALL USING (true) WITH CHECK (true);

-- Leads table policy
ALTER TABLE IF EXISTS leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public & authenticated leads read" ON leads;
CREATE POLICY "Public & authenticated leads read" ON leads FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated leads manage" ON leads;
CREATE POLICY "Authenticated leads manage" ON leads FOR ALL USING (true) WITH CHECK (true);

-- Quotations table policy
ALTER TABLE IF EXISTS quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Quotations read policy" ON quotations;
CREATE POLICY "Quotations read policy" ON quotations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Quotations write policy" ON quotations;
CREATE POLICY "Quotations write policy" ON quotations FOR ALL USING (true) WITH CHECK (true);

-- Agreements table policy
ALTER TABLE IF EXISTS agreements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Agreements read policy" ON agreements;
CREATE POLICY "Agreements read policy" ON agreements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Agreements write policy" ON agreements;
CREATE POLICY "Agreements write policy" ON agreements FOR ALL USING (true) WITH CHECK (true);

-- Projects table policy
ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Projects read policy" ON projects;
CREATE POLICY "Projects read policy" ON projects FOR SELECT USING (true);
DROP POLICY IF EXISTS "Projects write policy" ON projects;
CREATE POLICY "Projects write policy" ON projects FOR ALL USING (true) WITH CHECK (true);

-- Invoices table policy
ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Invoices read policy" ON invoices;
CREATE POLICY "Invoices read policy" ON invoices FOR SELECT USING (true);
DROP POLICY IF EXISTS "Invoices write policy" ON invoices;
CREATE POLICY "Invoices write policy" ON invoices FOR ALL USING (true) WITH CHECK (true);

-- Payments table policy
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Payments read policy" ON payments;
CREATE POLICY "Payments read policy" ON payments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Payments write policy" ON payments;
CREATE POLICY "Payments write policy" ON payments FOR ALL USING (true) WITH CHECK (true);

-- Monitored websites policy
ALTER TABLE IF EXISTS monitored_websites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Monitored websites read policy" ON monitored_websites;
CREATE POLICY "Monitored websites read policy" ON monitored_websites FOR SELECT USING (true);
DROP POLICY IF EXISTS "Monitored websites write policy" ON monitored_websites;
CREATE POLICY "Monitored websites write policy" ON monitored_websites FOR ALL USING (true) WITH CHECK (true);

-- 3. Seed Canonical DEMO RETAIL Client Record
INSERT INTO clients (
  id,
  client_code,
  name,
  business_name,
  company,
  business_category,
  email,
  phone,
  address,
  city,
  state,
  postal_code,
  country,
  gstin,
  preferred_comm,
  status,
  notes,
  created_at,
  updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'CS-CLIENT-0001',
  'DEMO RETAIL',
  'Demo Retail E-Commerce Ltd',
  'Demo Retail Enterprise',
  'Retail & E-Commerce',
  'contact@demoretail.store',
  '+91 98765 43210',
  'Shop 14, Brigade Gateway Commercial Complex',
  'Bengaluru',
  'Karnataka',
  '560055',
  'India',
  '29ABCDE1234F1Z5',
  'email',
  'active',
  'Canonical dummy client for CapeSecure lifecycle simulation & QA audits.',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  business_name = EXCLUDED.business_name,
  client_code = EXCLUDED.client_code,
  status = EXCLUDED.status;
