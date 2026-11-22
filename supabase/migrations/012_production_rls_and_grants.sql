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
