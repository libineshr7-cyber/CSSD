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
