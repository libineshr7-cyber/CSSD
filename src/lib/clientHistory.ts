import { supabase } from './supabase'
import {
  demoLeads, demoClients, demoProjects, demoTasks,
  demoQuotations, demoAgreements, demoPayments,
  demoInvoices, demoTickets
} from '../data/demoData'
import type {
  Client, Lead, Project, Task,
  Quotation, Agreement, Payment, Invoice,
  SupportTicket, Document, Requirement
} from '../types/database'

export interface ClientFullHistory {
  client: Client
  lead: Lead | null
  requirements: Requirement[]
  projects: Project[]
  tasks: Task[]
  quotations: Quotation[]
  agreements: Agreement[]
  payments: Payment[]
  invoices: Invoice[]
  supportTickets: SupportTicket[]
  documents: Document[]
  summary: {
    totalBilled: number
    totalPaid: number
    outstandingBalance: number
    activeProjectsCount: number
    openTicketsCount: number
  }
}

export async function fetchClientFullHistory(clientId: string): Promise<ClientFullHistory | null> {
  // 1. Fetch client
  let client: Client | null = null
  try {
    const { data } = await (supabase as any)
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .maybeSingle()
    if (data) client = data as Client
  } catch (_) {}

  if (!client) {
    client = demoClients.find(c => c.id === clientId) || null
  }
  if (!client) return null

  // 2. Fetch linked Lead
  let lead: Lead | null = null
  if (client.lead_id) {
    try {
      const { data } = await (supabase as any)
        .from('leads')
        .select('*')
        .eq('id', client.lead_id)
        .maybeSingle()
      if (data) lead = data as Lead
    } catch (_) {}
    if (!lead) {
      lead = demoLeads.find(l => l.id === client!.lead_id) || null
    }
  }

  // 3. Fetch Requirements
  let requirements: Requirement[] = []
  try {
    const { data } = await (supabase as any)
      .from('requirements')
      .select('*')
      .eq('client_id', clientId)
    if (data && data.length > 0) requirements = data as Requirement[]
  } catch (_) {}

  // 4. Fetch Projects
  let projects: Project[] = []
  try {
    const { data } = await (supabase as any)
      .from('projects')
      .select('*')
      .eq('client_id', clientId)
    if (data && data.length > 0) projects = data as Project[]
  } catch (_) {}
  if (projects.length === 0) {
    projects = demoProjects.filter(p => p.client_id === clientId)
  }

  // 5. Fetch Tasks for these projects
  const projectIds = projects.map(p => p.id)
  let tasks: Task[] = []
  if (projectIds.length > 0) {
    tasks = demoTasks.filter(t => projectIds.includes(t.project_id))
  }

  // 6. Fetch Quotations
  let quotations: Quotation[] = []
  try {
    const { data } = await (supabase as any)
      .from('quotations')
      .select('*')
      .eq('client_id', clientId)
    if (data && data.length > 0) quotations = data as Quotation[]
  } catch (_) {}
  if (quotations.length === 0) {
    quotations = demoQuotations.filter(q => q.client_id === clientId)
  }

  // 7. Fetch Agreements
  let agreements: Agreement[] = []
  try {
    const { data } = await (supabase as any)
      .from('agreements')
      .select('*')
      .eq('client_id', clientId)
    if (data && data.length > 0) agreements = data as Agreement[]
  } catch (_) {}
  if (agreements.length === 0) {
    agreements = demoAgreements.filter(a => a.client_id === clientId)
  }

  // 8. Fetch Invoices
  let invoices: Invoice[] = []
  try {
    const { data } = await (supabase as any)
      .from('invoices')
      .select('*')
      .eq('client_id', clientId)
    if (data && data.length > 0) invoices = data as Invoice[]
  } catch (_) {}
  if (invoices.length === 0) {
    invoices = demoInvoices.filter(i => i.client_id === clientId)
  }

  // 9. Fetch Payments
  const invoiceIds = invoices.map(i => i.id)
  let payments: Payment[] = []
  if (invoiceIds.length > 0) {
    payments = demoPayments.filter(p => p.invoice_id && invoiceIds.includes(p.invoice_id))
  }

  // 10. Fetch Support Tickets
  let supportTickets: SupportTicket[] = []
  try {
    const { data } = await (supabase as any)
      .from('support_tickets')
      .select('*')
      .eq('client_id', clientId)
    if (data && data.length > 0) supportTickets = data as SupportTicket[]
  } catch (_) {}
  if (supportTickets.length === 0) {
    supportTickets = demoTickets.filter((st: SupportTicket) => st.client_id === clientId)
  }

  // 11. Fetch Documents
  let documents: Document[] = []
  try {
    const { data } = await (supabase as any)
      .from('documents')
      .select('*')
      .eq('client_id', clientId)
    if (data && data.length > 0) documents = data as Document[]
  } catch (_) {}

  // Calculate summary
  const totalBilled = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0)
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  const outstandingBalance = Math.max(0, totalBilled - totalPaid)
  const activeProjectsCount = projects.filter(p => p.status === 'development' || p.status === 'planning' || p.status === 'testing').length
  const openTicketsCount = supportTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length

  return {
    client,
    lead,
    requirements,
    projects,
    tasks,
    quotations,
    agreements,
    payments,
    invoices,
    supportTickets,
    documents,
    summary: {
      totalBilled,
      totalPaid,
      outstandingBalance,
      activeProjectsCount,
      openTicketsCount,
    },
  }
}
