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
