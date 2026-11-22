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
