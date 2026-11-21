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
