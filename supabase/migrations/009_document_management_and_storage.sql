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
