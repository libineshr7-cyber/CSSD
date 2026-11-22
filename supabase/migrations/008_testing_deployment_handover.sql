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
