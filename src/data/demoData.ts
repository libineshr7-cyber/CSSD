import type { Lead, Client, Requirement, Quotation, Agreement, Payment, Invoice, Project, Task, SupportTicket, Document } from '../types/database'

// ─── Clean Real-Time State (Zero Fake Data) ──────────────────────────────────
// All records are loaded live in real-time from Supabase PostgreSQL database.

export const demoLeads: Lead[] = []
export const demoClients: Client[] = []
export const demoRequirements: Requirement[] = []
export const demoProjects: Project[] = []
export const demoPayments: Payment[] = []
export const demoTasks: Task[] = []
export const demoTickets: SupportTicket[] = []
export const demoQuotations: Quotation[] = []
export const demoAgreements: Agreement[] = []
export const demoInvoices: Invoice[] = []
export const demoDocuments: Document[] = []
