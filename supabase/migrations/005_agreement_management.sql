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
