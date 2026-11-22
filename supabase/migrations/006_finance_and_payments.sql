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
