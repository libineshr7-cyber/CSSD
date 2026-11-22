import { supabase } from './supabase'
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
  // 1. Fetch real client from Supabase
  let client: Client | null = null
  try {
    const { data, error } = await (supabase as any)
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .maybeSingle()
    if (!error && data) client = data as Client
  } catch (_) {}

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

  // 5. Fetch Tasks for these projects
  const projectIds = projects.map(p => p.id)
  let tasks: Task[] = []
  if (projectIds.length > 0) {
    try {
      const { data } = await (supabase as any)
        .from('tasks')
        .select('*')
        .in('project_id', projectIds)
      if (data && data.length > 0) tasks = data as Task[]
    } catch (_) {}
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

  // 7. Fetch Agreements
  let agreements: Agreement[] = []
  try {
    const { data } = await (supabase as any)
      .from('agreements')
      .select('*')
      .eq('client_id', clientId)
    if (data && data.length > 0) agreements = data as Agreement[]
  } catch (_) {}

  // 8. Fetch Invoices
  let invoices: Invoice[] = []
  try {
    const { data } = await (supabase as any)
      .from('invoices')
      .select('*')
      .eq('client_id', clientId)
    if (data && data.length > 0) invoices = data as Invoice[]
  } catch (_) {}

  // 9. Fetch Payments
  const invoiceIds = invoices.map(i => i.id)
  let payments: Payment[] = []
  if (invoiceIds.length > 0) {
    try {
      const { data } = await (supabase as any)
        .from('payments')
        .select('*')
        .in('invoice_id', invoiceIds)
      if (data && data.length > 0) payments = data as Payment[]
    } catch (_) {}
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

  // 11. Fetch Documents
  let documents: Document[] = []
  try {
    const { data } = await (supabase as any)
      .from('documents')
      .select('*')
      .eq('client_id', clientId)
    if (data && data.length > 0) documents = data as Document[]
  } catch (_) {}

  // Calculate real summary from database
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
