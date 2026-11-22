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
