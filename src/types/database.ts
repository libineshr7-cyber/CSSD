// Database type definitions for Supabase
// These will be auto-generated from Supabase CLI once connected

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      leads: {
        Row: Lead
        Insert: Omit<Lead, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Lead, 'id' | 'created_at'>>
      }
      clients: {
        Row: Client
        Insert: Omit<Client, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Client, 'id' | 'created_at'>>
      }
      requirements: {
        Row: Requirement
        Insert: Omit<Requirement, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Requirement, 'id' | 'created_at'>>
      }
      quotations: {
        Row: Quotation
        Insert: Omit<Quotation, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Quotation, 'id' | 'created_at'>>
      }
      agreements: {
        Row: Agreement
        Insert: Omit<Agreement, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Agreement, 'id' | 'created_at'>>
      }
      payments: {
        Row: Payment
        Insert: Omit<Payment, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Payment, 'id' | 'created_at'>>
      }
      invoices: {
        Row: Invoice
        Insert: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Invoice, 'id' | 'created_at'>>
      }
      projects: {
        Row: Project
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Project, 'id' | 'created_at'>>
      }
      tasks: {
        Row: Task
        Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Task, 'id' | 'created_at'>>
      }
      support_tickets: {
        Row: SupportTicket
        Insert: Omit<SupportTicket, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SupportTicket, 'id' | 'created_at'>>
      }
      documents: {
        Row: Document
        Insert: Omit<Document, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Document, 'id' | 'created_at'>>
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'created_at'>
        Update: Partial<Omit<AuditLog, 'id' | 'created_at'>>
      }
      admin_profiles: {
        Row: AdminProfile
        Insert: Partial<AdminProfile> & { id: string; email: string }
        Update: Partial<AdminProfile>
      }
      role_permissions: {
        Row: RolePermission
        Insert: RolePermission
        Update: Partial<RolePermission>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// ─── Domain Models ───────────────────────────────────────────────────────────

export type LeadStatus =
  | 'new_lead'
  | 'contacted'
  | 'discussion'
  | 'requirements_pending'
  | 'quotation_preparation'
  | 'quotation_sent'
  | 'won'
  | 'lost'
  | 'new'
  | 'qualified'
  | 'proposal'
  | 'negotiation'

export type LeadSource =
  | 'website'
  | 'referral'
  | 'social'
  | 'cold_call'
  | 'cold_outreach'
  | 'email'
  | 'event'
  | 'google_ads'
  | 'other'
  | string

export interface LeadNoteItem {
  id: string
  text: string
  author: string
  created_at: string
}

export interface Lead {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  status: LeadStatus
  source: LeadSource
  budget: number | null
  notes: string | null
  assigned_to: string | null
  next_follow_up: string | null
  follow_up_time?: string | null
  follow_up_notes?: string | null
  notes_history?: LeadNoteItem[]
  is_archived?: boolean
  archived_at?: string | null
  archived_reason?: string | null
  converted_client_id?: string | null
  created_at: string
  updated_at: string
}

export type ClientStatus = 'active' | 'inactive' | 'suspended' | 'churned' | 'archived' | 'completed'
export type PreferredComm = 'email' | 'phone' | 'whatsapp' | 'slack' | 'teams'

export interface Client {
  id: string
  client_code: string // e.g. CS-CLIENT-0001
  lead_id: string | null
  name: string
  business_name?: string | null
  company: string | null
  business_category?: string | null
  email: string
  phone: string | null
  address: string | null
  city: string | null
  state?: string | null
  postal_code?: string | null
  country: string | null
  gstin?: string | null
  preferred_comm?: PreferredComm
  status: ClientStatus
  avatar_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface RequirementReference {
  url: string
  notes?: string
}

export interface RequirementAttachment {
  id: string
  name: string
  url?: string
  size?: number
  type?: string
  uploaded_at: string
}

export interface Requirement {
  id: string
  client_id: string
  lead_id?: string | null
  project_id: string | null
  title: string
  description?: string
  website_type: string
  business_purpose?: string | null
  pages: string[]
  features: string[]
  frontend_tech?: string | null
  backend_tech?: string | null
  database_tech?: string | null
  payment_gateway?: string | null
  shipping_integration?: string | null
  domain_requirements?: string | null
  hosting_requirements?: string | null
  design_preferences: string | null
  reference_urls: string[]
  reference_websites?: RequirementReference[]
  timeline: string | null
  budget_range: string | null
  budget_min?: number | null
  budget_max?: number | null
  estimated_delivery_date?: string | null
  additional_notes?: string | null
  attachments?: RequirementAttachment[]
  status: 'draft' | 'submitted' | 'reviewed' | 'approved'
  created_at: string
  updated_at: string
}

export type QuotationStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'under_discussion'
  | 'revision_requested'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'accepted'

export interface QuotationItem {
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface PaymentMilestone {
  name: string
  percentage: number
  amount: number
  due_trigger: string
}

export interface QuotationApprovalDetails {
  approved_by: string
  approver_email: string
  approver_role?: string
  approved_at: string
  version: number
  ip_address?: string
  confirmation_statement?: string
  notes?: string
}

export interface Quotation {
  id: string
  client_id: string
  requirement_id: string | null
  parent_quotation_id?: string | null
  version?: number
  quote_number: string
  title: string
  description?: string | null
  items: QuotationItem[]
  subtotal: number
  discount: number
  tax_rate: number
  tax_amount: number
  total: number
  advance_percentage?: number
  advance_amount?: number
  balance_amount?: number
  payment_milestones?: PaymentMilestone[]
  delivery_timeline?: string | null
  terms_conditions?: string | null
  valid_until: string | null
  notes: string | null
  status: QuotationStatus
  approval_details?: QuotationApprovalDetails | null
  viewed_at?: string | null
  view_count?: number
  email_sent_to?: string | null
  email_sent_at?: string | null
  email_subject?: string | null
  converted_project_id?: string | null
  sent_at: string | null
  accepted_at: string | null
  created_at: string
  updated_at: string
}

export type AgreementStatus =
  | 'draft'
  | 'sent_for_signature'
  | 'partially_signed'
  | 'fully_signed'
  | 'declined'
  | 'expired'
  | 'sent'
  | 'signed'
  | 'active'
  | 'completed'
  | 'terminated'

export interface AgreementDeliverable {
  title: string
  description?: string
  quantity?: number
  price?: number
}

export interface AgreementPaymentScheduleItem {
  milestone: string
  percentage: number
  amount: number
  dueTrigger: string
}

export interface Agreement {
  id: string
  client_id: string
  quotation_id: string | null
  quotation_number?: string | null
  agreement_number: string
  title: string
  content?: string | null
  scope_of_services?: string | null
  project_deliverables?: AgreementDeliverable[]
  total_value: number
  advance_percentage: number
  advance_amount: number
  balance_amount: number
  payment_schedule?: AgreementPaymentScheduleItem[]
  delivery_timeline?: string | null
  domain_hosting_ownership?: string | null
  revisions_policy?: string | null
  ip_terms?: string | null
  confidentiality_terms?: string | null
  maintenance_terms?: string | null
  cancellation_terms?: string | null
  liability_terms?: string | null
  dispute_resolution?: string | null
  governing_law?: string | null
  status: AgreementStatus
  signing_method?: 'digital' | 'physical'
  esign_details?: any
  signature_audit?: any
  physical_custody?: any
  signed_at: string | null
  signature_url: string | null
  file_url: string | null
  start_date: string | null
  end_date: string | null
  is_privately_restricted?: boolean
  created_at: string
  updated_at: string
}

export type PaymentStatus = 'pending' | 'received' | 'failed' | 'refunded'
export type PaymentType = 'advance' | 'milestone' | 'final' | 'additional_feature' | 'maintenance' | 'refund' | 'other'
export type PaymentMethod = 'upi' | 'bank_transfer' | 'gateway' | 'card' | 'cash' | 'cheque' | 'paypal' | 'other'
export type PaymentVerificationStatus = 'pending_verification' | 'verified' | 'rejected' | 'disputed'

export interface Payment {
  id: string
  client_id: string
  project_id: string | null
  invoice_id: string | null
  agreement_id: string | null
  reference: string
  receipt_number?: string | null
  amount: number
  currency: string
  payment_type: PaymentType
  payment_method: PaymentMethod
  status: PaymentStatus
  verification_status?: PaymentVerificationStatus
  verified_by?: string | null
  verified_at?: string | null
  verification_evidence?: string | null
  recorded_by?: string | null
  refund_reason?: string | null
  refund_original_ref?: string | null
  balance_after_payment?: number | null
  received_date: string | null
  notes: string | null
  proof_url: string | null
  created_at: string
  updated_at: string
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export interface InvoiceItem {
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface InvoiceAuditItem {
  id: string
  action: string
  user: string
  timestamp: string
  reason?: string
}

export interface Invoice {
  id: string
  client_id: string
  project_id: string | null
  payment_id: string | null
  invoice_number: string
  items: InvoiceItem[]
  subtotal: number
  discount: number
  tax_rate: number
  tax_amount: number
  total: number
  is_gst_applicable?: boolean
  gst_type?: 'cgst_sgst' | 'igst' | 'none'
  cgst_amount?: number
  sgst_amount?: number
  igst_amount?: number
  amount_paid?: number
  balance_due?: number
  cancellation_reason?: string | null
  cancelled_by?: string | null
  cancelled_at?: string | null
  audit_trail?: InvoiceAuditItem[]
  due_date: string | null
  paid_at: string | null
  status: InvoiceStatus
  notes: string | null
  file_url: string | null
  created_at: string
  updated_at: string
}

export type ProjectStatus = 'planning' | 'design' | 'development' | 'review' | 'testing' | 'deployment' | 'live' | 'maintenance' | 'paused' | 'cancelled'
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent'

export type ProjectPipelineStage =
  | 'project_created'
  | 'advance_payment_verified'
  | 'requirements_finalized'
  | 'ui_ux_design'
  | 'design_review'
  | 'design_approved'
  | 'frontend_development'
  | 'backend_development'
  | 'database_integration'
  | 'internal_testing'
  | 'client_review'
  | 'revisions'
  | 'final_qa'
  | 'final_payment'
  | 'deployment'
  | 'handover'
  | 'completed'

export interface ProjectActivityLogItem {
  id: string
  action: string
  performed_by: string
  timestamp: string
  details?: string
  previous_stage?: string
  new_stage?: string
}

export interface Project {
  id: string
  project_number?: string
  client_id: string
  quotation_id?: string | null
  agreement_id: string | null
  name: string
  description: string | null
  budget?: number
  status: ProjectStatus
  pipeline_stage?: ProjectPipelineStage
  priority: ProjectPriority
  start_date: string | null
  deadline: string | null
  expected_delivery_date?: string | null
  project_manager?: string | null
  development_team?: string[]
  completed_at: string | null
  website_url: string | null
  staging_url: string | null
  repository_url: string | null
  tech_stack: string[]
  progress: number
  activity_log?: ProjectActivityLogItem[]
  created_at: string
  updated_at: string
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface TaskComment {
  id: string
  user: string
  text: string
  created_at: string
}

export interface TaskAttachment {
  id: string
  name: string
  url: string
  size?: number
  uploaded_at: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assigned_to: string | null
  due_date: string | null
  completed_at: string | null
  completed_by?: string | null
  progress?: number
  comments?: TaskComment[]
  attachments?: TaskAttachment[]
  tags: string[]
  created_at: string
  updated_at: string
}

export type DesignStage = 'Wireframe' | 'Mockup' | 'Prototype' | 'Final'
export type DesignApprovalStatus = 'pending' | 'approved' | 'revision_requested'

export interface DesignApprovalHistoryItem {
  action: string
  by: string
  timestamp: string
  feedback?: string
}

export interface DesignApproval {
  id: string
  project_id: string
  client_id?: string | null
  title: string
  stage: DesignStage
  preview_url: string
  figma_url?: string | null
  description?: string | null
  status: DesignApprovalStatus
  client_feedback?: string | null
  approved_by?: string | null
  approved_at?: string | null
  revision_requested_at?: string | null
  version: number
  approval_history?: DesignApprovalHistoryItem[]
  created_at: string
  updated_at: string
}

export type RevisionStatus = 'pending' | 'in_progress' | 'review' | 'resolved'
export type RevisionPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface ProjectRevision {
  id: string
  project_id: string
  design_approval_id?: string | null
  revision_number: number
  requested_changes: string
  assigned_person?: string | null
  requested_by?: string | null
  status: RevisionStatus
  priority: RevisionPriority
  request_date: string
  completion_deadline?: string | null
  resolved_date?: string | null
  resolution_notes?: string | null
  created_at: string
  updated_at: string
}

export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface SupportTicket {
  id: string
  client_id: string
  project_id: string | null
  ticket_number: string
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  category: string
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export type DocumentCategory =
  | 'Enquiry documents'
  | 'Requirements'
  | 'Quotations'
  | 'Agreements'
  | 'Invoices'
  | 'Payment receipts'
  | 'Design files'
  | 'Development documents'
  | 'Testing reports'
  | 'Deployment records'
  | 'Handover documents'
  | 'Maintenance agreements'
  | 'Support records'

export interface DocumentVersionHistoryItem {
  version: number
  uploaded_at: string
  uploaded_by: string
  file_url: string
  file_size?: number
  notes?: string
}

export interface DocumentAccessLogItem {
  id: string
  user: string
  action: 'viewed' | 'downloaded' | 'previewed' | 'signed_url_generated'
  timestamp: string
  ip_address?: string
}

export interface Document {
  id: string
  client_id: string | null
  project_id: string | null
  name: string
  description: string | null
  category: DocumentCategory | string
  file_url: string
  storage_path?: string | null
  file_size: number | null
  file_type: string | null
  version?: number
  uploaded_by?: string | null
  is_private: boolean
  archived?: boolean
  retention_policy?: string
  version_history?: DocumentVersionHistoryItem[]
  access_history?: DocumentAccessLogItem[]
  tags: string[]
  created_at: string
  updated_at: string
}

export interface BackupSchedule {
  id: string
  backup_type: 'database_snapshot' | 'storage_replication' | 'secondary_cold_archive'
  snapshot_id: string
  size_bytes: number
  integrity_hash: string
  retention_policy: string
  verification_status: 'verified' | 'pending' | 'failed'
  last_restoration_drill: string | null
  storage_destination: string
  created_at: string
}

export interface ClientPortalAccess {
  id: string
  client_id: string
  portal_email: string
  portal_passcode_hash?: string
  is_active: boolean
  last_login: string | null
  login_attempts: number
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  metadata: Json | null
  ip_address: string | null
  created_at: string
}

// ─── Phase 8: Testing, Deployment & Handover Types ────────────────────────────

export type QATestStatus = 'passed' | 'failed' | 'pending' | 'skipped'

export interface QATestCase {
  id: string
  project_id?: string | null
  checklist_item: string
  suite: string
  test_name: string
  status: QATestStatus
  duration_ms: number
  executed_by: string
  executed_at: string
  notes?: string | null
  created_at: string
}

export type BugSeverity = 'critical' | 'high' | 'medium' | 'low'
export type BugStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface BugReport {
  id: string
  bug_id: string
  project_id: string
  title: string
  description: string
  screenshot_url?: string | null
  severity: BugSeverity
  status: BugStatus
  assigned_to?: string | null
  reported_by: string
  resolution_notes?: string | null
  resolved_at?: string | null
  created_at: string
  updated_at: string
}

export type DeploymentEnvironment = 'production' | 'staging' | 'preview'
export type DeploymentStatus = 'success' | 'failed' | 'in_progress' | 'rolled_back'
export type DNSStatus = 'configured' | 'propagating' | 'pending'
export type SSLStatus = 'active' | 'pending' | 'expired'

export interface Deployment {
  id: string
  deployment_id: string
  project_id: string
  domain_name: string
  domain_registrar: string
  dns_status: DNSStatus
  hosting_provider: string
  frontend_deployment_url: string
  backend_api_url?: string | null
  database_configuration?: {
    cluster?: string
    engine?: string
    ssl_enabled?: boolean
    backups_enabled?: boolean
  }
  ssl_status: SSLStatus
  environment: DeploymentEnvironment
  deployment_version: string
  delegated_access_ref?: string
  status: DeploymentStatus
  deployed_by: string
  deployed_at: string
  build_logs: string[]
  created_at: string
  updated_at: string
}

export interface HandoverChecklistItem {
  id: string
  label: string
  category: string
  checked: boolean
  verified_by?: string
  verified_at?: string
}

export interface ProjectHandover {
  id: string
  project_id: string
  client_id: string
  live_website_url: string
  domain_ownership_confirmed: boolean
  domain_transfer_details?: string | null
  hosting_information?: string | null
  database_access_transfer?: string | null
  admin_dashboard_access?: string | null
  source_code_transfer?: string | null
  documentation_urls?: string[]
  backup_instructions?: string | null
  maintenance_sla?: string | null
  outstanding_issues?: string | null
  checklist_items: HandoverChecklistItem[]
  status: 'pending' | 'in_progress' | 'completed'
  agency_signatory_name?: string | null
  agency_signatory_title?: string | null
  agency_signed_at?: string | null
  client_signatory_name?: string | null
  client_signatory_title?: string | null
  client_acknowledgement?: string | null
  client_signed_at?: string | null
  handover_date: string
  created_at: string
  updated_at: string
}

// ─── UI State Types ───────────────────────────────────────────────────────────

export type NavModule =
  | 'overview'
  | 'leads'
  | 'clients'
  | 'requirements'
  | 'quotations'
  | 'agreements'
  | 'payments'
  | 'invoices'
  | 'projects'
  | 'tasks'
  | 'design-approvals'
  | 'testing'
  | 'deployments'
  | 'handover'
  | 'maintenance'
  | 'monitoring'
  | 'tickets'
  | 'documents'
  | 'reports'
  | 'settings'

export type AppRole =
  | 'super_admin'
  | 'administrator'
  | 'project_manager'
  | 'finance_manager'
  | 'technical_staff'

export interface AdminProfile {
  id: string
  email: string
  full_name: string
  role: AppRole
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

export interface RolePermission {
  role: AppRole
  module: NavModule
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
  created_at?: string
  updated_at?: string
}

export const ROLE_LABELS: Record<AppRole, { label: string; badge: string; description: string }> = {
  super_admin: {
    label: 'Super Admin',
    badge: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
    description: 'Unrestricted master access to all operations, security configurations, and audit controls.',
  },
  administrator: {
    label: 'Administrator',
    badge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    description: 'Full administrative access across clients, projects, finances, and operational teams.',
  },
  project_manager: {
    label: 'Project Manager',
    badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    description: 'Oversees development cycles, sprints, client requirements, milestones, and handovers.',
  },
  finance_manager: {
    label: 'Finance Manager',
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    description: 'Manages billing, invoices, quotation approvals, agreements, and revenue analytics.',
  },
  technical_staff: {
    label: 'Technical Staff',
    badge: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
    description: 'Engineering access to tasks, QA test suites, deployments, monitoring, and ticket triage.',
  },
}

// ─── Phase 10: Maintenance and Website Health Monitoring Types ────────────────

export type MaintenanceBillingFrequency = 'yearly' | 'semi_annual' | 'quarterly' | 'monthly'
export type MaintenancePaymentStatus = 'paid' | 'pending' | 'overdue' | 'cancelled'
export type MaintenanceContractStatus = 'active' | 'pending_renewal' | 'expired' | 'suspended'

export interface MaintenancePlanConfig {
  id: string
  name: string
  price: number
  billing_frequency: MaintenanceBillingFrequency
  inclusions: string[]
  exclusions: string[]
  support_hours_per_month: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface MaintenanceActivityItem {
  id: string
  activity: string
  performed_by: string
  date: string
  notes?: string
  status?: 'completed' | 'in_progress' | 'scheduled'
}

export interface SupportEntitlement {
  hours_per_month: number
  hours_used: number
  priority_sla: string
  included_tickets?: number
}

export interface MaintenanceRecord {
  id: string
  client_id: string
  project_id?: string | null
  plan_id: string
  plan_name: string
  price: number
  billing_frequency: MaintenanceBillingFrequency | string
  start_date: string
  renewal_date: string
  payment_status: MaintenancePaymentStatus
  contract_status: MaintenanceContractStatus
  support_entitlement?: SupportEntitlement
  maintenance_history?: MaintenanceActivityItem[]
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export type WebsiteUptimeStatus = 'up' | 'degraded' | 'down'
export type WebsiteSSLStatus = 'valid' | 'expiring_soon' | 'expired' | 'invalid'
export type BackupStatus = 'success' | 'failed' | 'pending' | 'unverified'

export interface MonitoredWebsite {
  id: string
  client_id: string
  project_id?: string | null
  name: string
  url: string
  status: WebsiteUptimeStatus
  http_status: number
  response_time_ms: number
  uptime_percentage: number
  ssl_status: WebsiteSSLStatus
  ssl_valid_to?: string | null
  ssl_days_remaining: number
  ssl_issuer?: string | null
  domain_expiry_date?: string | null
  domain_source_verified: boolean
  domain_registrar?: string | null
  scheduled_backup_status: BackupStatus
  backup_source_verified: boolean
  last_backup_at?: string | null
  hosting_availability: string
  monitoring_interval_mins: number
  last_checked_at: string
  created_at?: string
  updated_at?: string
}

export interface MonitoringLogItem {
  id: string
  website_id: string
  http_status: number
  response_time_ms: number
  status: WebsiteUptimeStatus
  details?: string | null
  created_at: string
}

export type AlertType = 'downtime' | 'ssl_expiry' | 'domain_expiry' | 'renewal_approaching' | 'backup_failed' | 'server_error'
export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface SystemAlert {
  id: string
  alert_type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  client_id?: string | null
  website_id?: string | null
  maintenance_record_id?: string | null
  is_resolved: boolean
  resolved_at?: string | null
  created_at: string
}


