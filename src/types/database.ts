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

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
export type LeadSource = 'website' | 'referral' | 'social' | 'cold_call' | 'email' | 'event' | 'other'

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
  created_at: string
  updated_at: string
}

export type ClientStatus = 'active' | 'inactive' | 'suspended' | 'churned'

export interface Client {
  id: string
  lead_id: string | null
  name: string
  email: string
  phone: string | null
  company: string | null
  address: string | null
  city: string | null
  country: string | null
  status: ClientStatus
  avatar_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Requirement {
  id: string
  client_id: string
  project_id: string | null
  title: string
  description: string
  website_type: string
  pages: string[]
  features: string[]
  design_preferences: string | null
  reference_urls: string[]
  timeline: string | null
  budget_range: string | null
  status: 'draft' | 'submitted' | 'reviewed' | 'approved'
  created_at: string
  updated_at: string
}

export type QuotationStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired'

export interface QuotationItem {
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface Quotation {
  id: string
  client_id: string
  requirement_id: string | null
  quote_number: string
  title: string
  items: QuotationItem[]
  subtotal: number
  discount: number
  tax_rate: number
  tax_amount: number
  total: number
  valid_until: string | null
  notes: string | null
  status: QuotationStatus
  sent_at: string | null
  accepted_at: string | null
  created_at: string
  updated_at: string
}

export type AgreementStatus = 'draft' | 'sent' | 'signed' | 'active' | 'completed' | 'terminated'

export interface Agreement {
  id: string
  client_id: string
  quotation_id: string | null
  agreement_number: string
  title: string
  content: string
  total_value: number
  advance_percentage: number
  advance_amount: number
  balance_amount: number
  status: AgreementStatus
  signed_at: string | null
  signature_url: string | null
  file_url: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export type PaymentStatus = 'pending' | 'received' | 'failed' | 'refunded'
export type PaymentType = 'advance' | 'milestone' | 'final' | 'maintenance' | 'other'
export type PaymentMethod = 'bank_transfer' | 'card' | 'cash' | 'paypal' | 'other'

export interface Payment {
  id: string
  client_id: string
  project_id: string | null
  invoice_id: string | null
  agreement_id: string | null
  reference: string
  amount: number
  currency: string
  payment_type: PaymentType
  payment_method: PaymentMethod
  status: PaymentStatus
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

export interface Project {
  id: string
  client_id: string
  agreement_id: string | null
  name: string
  description: string | null
  status: ProjectStatus
  priority: ProjectPriority
  start_date: string | null
  deadline: string | null
  completed_at: string | null
  website_url: string | null
  staging_url: string | null
  repository_url: string | null
  tech_stack: string[]
  progress: number
  created_at: string
  updated_at: string
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

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
  tags: string[]
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

export interface Document {
  id: string
  client_id: string | null
  project_id: string | null
  name: string
  description: string | null
  category: string
  file_url: string
  file_size: number | null
  file_type: string | null
  is_private: boolean
  tags: string[]
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

