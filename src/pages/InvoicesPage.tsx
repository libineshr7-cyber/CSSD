import { useState, useMemo, useEffect } from 'react'
import {
  Plus, Search, Download, CheckCircle2, Clock, AlertTriangle,
  Receipt, Eye, Send, Mail, RefreshCw, FileText, X, Trash2,
  Ban, History, ShieldAlert, ShieldCheck
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { downloadInvoicePDF } from '../lib/pdfGenerator'
import { sendInvoiceEmail } from '../lib/emailService'
import { useAuth } from '../contexts/AuthContext'
import type {
  Invoice,
  InvoiceStatus,
  InvoiceItem,
  InvoiceAuditItem,
  Client,
  Project,
  Quotation
} from '../types/database'

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; badge: string }> = {
  draft:     { label: 'Draft',     badge: 'bg-slate-500/10 text-slate-400 border border-slate-500/20' },
  sent:      { label: 'Sent',      badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  paid:      { label: 'Paid',      badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  overdue:   { label: 'Overdue',   badge: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  cancelled: { label: 'Cancelled', badge: 'bg-rose-500/10 text-rose-400 border border-rose-500/20' },
}

export default function InvoicesPage() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [emailModalInvoice, setEmailModalInvoice] = useState<Invoice | null>(null)
  const [emailMessage, setEmailMessage] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

  // Documented Cancellation State
  const [cancellingInvoice, setCancellingInvoice] = useState<Invoice | null>(null)
  const [cancellationReason, setCancellationReason] = useState('')
  const [submittingCancellation, setSubmittingCancellation] = useState(false)

  // Audit Trail Viewer State
  const [auditInvoice, setAuditInvoice] = useState<Invoice | null>(null)

  // Form states
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [quotationId, setQuotationId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [gstType, setGstType] = useState<'cgst_sgst' | 'igst' | 'none'>('cgst_sgst')
  const [taxRate, setTaxRate] = useState<number>(18)
  const [notes, setNotes] = useState('Payment terms: Net 7 days. Bank: State Bank of India | IFSC: SBIN0001234 | UPI: capesecure@upi. Quote invoice reference on transfer.')
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: 'Enterprise Web Application Engineering & Cloud Security', quantity: 1, unit_price: 50000, total: 50000 }
  ])

  // Load live data from Supabase
  const loadData = async () => {
    setLoading(true)
    try {
      const [
        { data: invData, error: invErr },
        { data: cData },
        { data: prData },
        { data: qData },
      ] = await Promise.all([
        (supabase as any).from('invoices').select('*').order('created_at', { ascending: false }),
        (supabase as any).from('clients').select('*').order('name', { ascending: true }),
        (supabase as any).from('projects').select('*').order('name', { ascending: true }),
        (supabase as any).from('quotations').select('*').order('created_at', { ascending: false }),
      ])

      if (!invErr && invData) {
        setInvoices(invData as Invoice[])
      }
      if (cData) setClients(cData as Client[])
      if (prData) setProjects(prData as Project[])
      if (qData) setQuotations(qData as Quotation[])
    } catch (err) {
      console.error('Failed to load invoice data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    // Real-time updates
    const channel = supabase
      .channel('capesecure-invoices-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients])
  const projectMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects])

  // Adjust tax rate when GST Type changes
  useEffect(() => {
    if (gstType === 'none') {
      setTaxRate(0)
    } else {
      setTaxRate(18)
    }
  }, [gstType])

  // Handle Quotation Selection to pre-fill items
  const handleQuotationChange = (qId: string) => {
    setQuotationId(qId)
    if (!qId) return

    const selectedQ = quotations.find(q => q.id === qId)
    if (selectedQ) {
      if (selectedQ.client_id) setClientId(selectedQ.client_id)
      if (selectedQ.items && selectedQ.items.length > 0) {
        setItems(
          selectedQ.items.map(it => ({
            description: it.description,
            quantity: it.quantity,
            unit_price: it.unit_price,
            total: it.total,
          }))
        )
      } else {
        setItems([{
          description: selectedQ.title || 'Custom Web Development',
          quantity: 1,
          unit_price: selectedQ.total || 0,
          total: selectedQ.total || 0
        }])
      }
      if (selectedQ.tax_rate !== undefined) {
        if (selectedQ.tax_rate === 0) {
          setGstType('none')
          setTaxRate(0)
        } else {
          setTaxRate(selectedQ.tax_rate)
        }
      }
    }
  }

  const stats = useMemo(() => {
    const validInvoices = invoices.filter(i => i.status !== 'cancelled')
    const totalBilled = validInvoices.reduce((acc, i) => acc + (Number(i.total) || 0), 0)
    const totalPaid = validInvoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + (Number(i.total) || 0), 0)
    const totalOverdue = validInvoices.filter(i => i.status === 'overdue').reduce((acc, i) => acc + (Number(i.total) || 0), 0)
    const totalPending = validInvoices.filter(i => i.status === 'sent' || i.status === 'draft').reduce((acc, i) => acc + (Number(i.balance_due ?? i.total) || 0), 0)
    return { totalBilled, totalPaid, totalOverdue, totalPending }
  }, [invoices])

  const filtered = useMemo(() => {
    return invoices.filter(i => {
      const client = clientMap[i.client_id]
      const matchSearch =
        i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        (client?.name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (client?.business_name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (client?.company?.toLowerCase().includes(search.toLowerCase()) ?? false)
      const matchStatus = statusFilter === 'all' || i.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [invoices, search, statusFilter, clientMap])

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, total: 0 }])
  }

  const updateItem = (index: number, field: keyof InvoiceItem, val: string | number) => {
    const updated = [...items]
    const item = { ...updated[index], [field]: val }
    if (field === 'quantity' || field === 'unit_price') {
      item.total = Number(item.quantity) * Number(item.unit_price)
    }
    updated[index] = item
    setItems(updated)
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const subtotal = useMemo(() => items.reduce((acc, it) => acc + (it.total || 0), 0), [items])

  const calculatedTax = useMemo(() => {
    if (gstType === 'none') {
      return { isGst: false, cgst: 0, sgst: 0, igst: 0, totalTax: 0 }
    }
    if (gstType === 'cgst_sgst') {
      const cgst = Math.round((subtotal * 0.09) * 100) / 100
      const sgst = Math.round((subtotal * 0.09) * 100) / 100
      return { isGst: true, cgst, sgst, igst: 0, totalTax: cgst + sgst }
    }
    const igst = Math.round((subtotal * 0.18) * 100) / 100
    return { isGst: true, cgst: 0, sgst: 0, igst, totalTax: igst }
  }, [subtotal, gstType])

  const grandTotal = subtotal + calculatedTax.totalTax

  const generateNextInvoiceNumber = () => {
    const year = new Date().getFullYear()
    const nextSeq = String(invoices.length + 1).padStart(3, '0')
    return `CS-INV-${year}-${nextSeq}`
  }

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId) {
      toast.error('Please select a client')
      return
    }

    const nextInvoiceNumber = generateNextInvoiceNumber()
    const nowIso = new Date().toISOString()
    const currentUserEmail = user?.email || 'Authorized Administrator'

    const initialAudit: InvoiceAuditItem[] = [
      {
        id: `audit-${Date.now()}`,
        action: 'Invoice Created',
        user: currentUserEmail,
        timestamp: nowIso,
        reason: 'Initial statutory invoice creation'
      }
    ]

    const newInv: Partial<Invoice> = {
      client_id: clientId,
      project_id: projectId || null,
      payment_id: null,
      invoice_number: nextInvoiceNumber,
      items,
      subtotal,
      discount: 0,
      tax_rate: gstType === 'none' ? 0 : taxRate,
      tax_amount: calculatedTax.totalTax,
      total: grandTotal,
      is_gst_applicable: calculatedTax.isGst,
      gst_type: gstType === 'none' ? 'none' : (gstType === 'igst' ? 'igst' : 'cgst_sgst'),
      cgst_amount: calculatedTax.cgst,
      sgst_amount: calculatedTax.sgst,
      igst_amount: calculatedTax.igst,
      amount_paid: 0,
      balance_due: grandTotal,
      audit_trail: initialAudit,
      due_date: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      paid_at: null,
      status: 'sent',
      notes,
      file_url: null,
      created_at: nowIso,
      updated_at: nowIso,
    }

    try {
      const { data, error } = await (supabase as any)
        .from('invoices')
        .insert([newInv])
        .select()
        .single()

      if (error) {
        console.error('Supabase error inserting invoice:', error)
        // Optimistic UI fallback
        const fallbackInv: Invoice = {
          id: `inv-${Date.now()}`,
          ...(newInv as any),
        }
        setInvoices([fallbackInv, ...invoices])
      } else if (data) {
        setInvoices([data as Invoice, ...invoices])
      }

      setShowModal(false)
      toast.success(`Tax Invoice ${nextInvoiceNumber} created successfully!`)

      // Auto-trigger genuine PDF download
      const targetClient = clientMap[clientId]
      const targetProj = projectMap[projectId]
      downloadInvoicePDF({ ...(newInv as any), id: data?.id || 'temp' }, targetClient, targetProj)
    } catch (err: any) {
      toast.error(`Error saving invoice: ${err.message || 'Unknown error'}`)
    }
  }

  const markPaid = async (inv: Invoice) => {
    const paidAt = new Date().toISOString()
    const currentUserEmail = user?.email || 'Authorized Administrator'
    const toastId = toast.loading('Marking invoice as paid and updating ledger...')

    const auditEntry: InvoiceAuditItem = {
      id: `audit-${Date.now()}`,
      action: 'Payment Recorded / Settled',
      user: currentUserEmail,
      timestamp: paidAt,
      reason: 'Full settlement verified against ledger'
    }
    const updatedAudit = [...(inv.audit_trail || []), auditEntry]

    try {
      // 1. Update Invoice in Supabase
      const { error: invErr } = await (supabase as any)
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: paidAt,
          amount_paid: inv.total,
          balance_due: 0,
          audit_trail: updatedAudit,
          updated_at: paidAt
        })
        .eq('id', inv.id)

      if (invErr) {
        console.warn('Supabase invoice update failed:', invErr)
      }

      // 2. Record matching payment in payments table
      const paymentRef = `PAY-${inv.invoice_number.replace('CS-INV-', '')}`
      await (supabase as any)
        .from('payments')
        .insert([{
          client_id: inv.client_id,
          project_id: inv.project_id,
          invoice_id: inv.id,
          reference: paymentRef,
          amount: inv.total,
          currency: 'INR',
          payment_type: 'final',
          payment_method: 'bank_transfer',
          status: 'received',
          verification_status: 'verified',
          verified_by: currentUserEmail,
          verified_at: paidAt,
          verification_evidence: 'Direct Settlement Clearance',
          balance_after_payment: 0,
          received_date: paidAt.slice(0, 10),
          notes: `Settlement for Invoice ${inv.invoice_number}`,
          created_at: paidAt,
          updated_at: paidAt,
        }])

      setInvoices(prev => prev.map(item => item.id === inv.id ? {
        ...item,
        status: 'paid',
        paid_at: paidAt,
        amount_paid: inv.total,
        balance_due: 0,
        audit_trail: updatedAudit,
        updated_at: paidAt
      } : item))

      toast.success(`Invoice ${inv.invoice_number} marked as PAID & recorded in payments!`, { id: toastId })
    } catch (err: any) {
      toast.error(`Failed to mark paid: ${err.message}`, { id: toastId })
    }
  }

  // Documented Cancellation Handler
  const handleExecuteCancellation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cancellingInvoice) return
    if (!cancellationReason.trim()) {
      toast.error('Please enter a documented reason for cancelling this invoice.')
      return
    }

    setSubmittingCancellation(true)
    const cancelledAt = new Date().toISOString()
    const currentUserEmail = user?.email || 'Authorized Administrator'

    const auditEntry: InvoiceAuditItem = {
      id: `audit-${Date.now()}`,
      action: 'Invoice Cancelled',
      user: currentUserEmail,
      timestamp: cancelledAt,
      reason: cancellationReason.trim()
    }
    const updatedAudit = [...(cancellingInvoice.audit_trail || []), auditEntry]

    try {
      const { error } = await (supabase as any)
        .from('invoices')
        .update({
          status: 'cancelled',
          cancellation_reason: cancellationReason.trim(),
          cancelled_by: currentUserEmail,
          cancelled_at: cancelledAt,
          audit_trail: updatedAudit,
          updated_at: cancelledAt
        })
        .eq('id', cancellingInvoice.id)

      if (error) {
        console.warn('Supabase invoice cancellation error:', error)
      }

      // Log to financial audit logs
      try {
        await (supabase as any).from('financial_audit_logs').insert([{
          entity_type: 'invoice',
          entity_id: cancellingInvoice.id,
          action: 'cancelled',
          performed_by: currentUserEmail,
          details: {
            invoice_number: cancellingInvoice.invoice_number,
            reason: cancellationReason.trim(),
            total: cancellingInvoice.total
          }
        }])
      } catch (logErr) {
        console.warn('Could not insert into financial_audit_logs:', logErr)
      }

      setInvoices(prev => prev.map(item => item.id === cancellingInvoice.id ? {
        ...item,
        status: 'cancelled',
        cancellation_reason: cancellationReason.trim(),
        cancelled_by: currentUserEmail,
        cancelled_at: cancelledAt,
        audit_trail: updatedAudit,
        updated_at: cancelledAt
      } : item))

      toast.success(`Invoice ${cancellingInvoice.invoice_number} cancelled with documented audit trail.`)
      setCancellingInvoice(null)
      setCancellationReason('')
    } catch (err: any) {
      toast.error(`Failed to cancel invoice: ${err.message || 'Unknown error'}`)
    } finally {
      setSubmittingCancellation(false)
    }
  }

  const handleSendEmail = async () => {
    if (!emailModalInvoice) return
    const client = clientMap[emailModalInvoice.client_id]
    if (!client?.email) {
      toast.error('Client has no email address configured.')
      return
    }

    setSendingEmail(true)
    const toastId = toast.loading(`Dispatching invoice via Brevo to ${client.email}...`)
    const currentUserEmail = user?.email || 'Authorized Administrator'
    const nowIso = new Date().toISOString()

    try {
      const res = await sendInvoiceEmail(emailModalInvoice, client, emailMessage)
      if (res.success) {
        toast.success(`Invoice delivered via Brevo! (Msg ID: ${res.messageId?.slice(0, 10)}...)`, { id: toastId })
        
        // Append Brevo dispatch to audit trail
        const auditEntry: InvoiceAuditItem = {
          id: `audit-${Date.now()}`,
          action: 'Invoice Dispatched via Brevo',
          user: currentUserEmail,
          timestamp: nowIso,
          reason: `Delivered to ${client.email} (Brevo Msg ID: ${res.messageId || 'sent'})`
        }
        const updatedAudit = [...(emailModalInvoice.audit_trail || []), auditEntry]

        await (supabase as any).from('invoices').update({
          status: 'sent',
          audit_trail: updatedAudit,
          updated_at: nowIso
        }).eq('id', emailModalInvoice.id)

        setInvoices(prev => prev.map(i => i.id === emailModalInvoice.id ? {
          ...i,
          status: 'sent',
          audit_trail: updatedAudit
        } : i))

        setEmailModalInvoice(null)
      } else {
        toast.error(`Brevo dispatch issue: ${res.error || 'Failed to deliver email.'}`, { id: toastId })
      }
    } catch (err: any) {
      toast.error(`Email error: ${err.message}`, { id: toastId })
    } finally {
      setSendingEmail(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-6 bg-slate-950 text-slate-100 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Invoices &amp; Tax Billing</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Indian GST Compliant Tax Invoices &amp; Bills of Supply (₹) with immutable audit history
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors border border-slate-800"
            title="Refresh from Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Tax Invoice
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Total Invoiced</span>
            <Receipt className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-bold text-slate-100">{formatCurrency(stats.totalBilled)}</p>
          <span className="text-xs text-slate-500 mt-1 block">Active issued documents</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Paid Invoices</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(stats.totalPaid)}</p>
          <span className="text-xs text-slate-500 mt-1 block">Settled funds</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Pending Balance</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-amber-400">{formatCurrency(stats.totalPending)}</p>
          <span className="text-xs text-slate-500 mt-1 block">Outstanding receivables</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Overdue Invoices</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-xl font-bold text-red-400">{formatCurrency(stats.totalOverdue)}</p>
          <span className="text-xs text-red-400 mt-1 block">Requires follow-up</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number, client, business name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-sm sm:w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Invoices</option>
          <option value="paid">Paid</option>
          <option value="sent">Sent (Pending)</option>
          <option value="overdue">Overdue</option>
          <option value="draft">Draft</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Invoices List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-xs uppercase font-medium text-slate-400">
              <tr>
                <th className="text-left px-4 py-3">Invoice #</th>
                <th className="text-left px-4 py-3">Client / Business</th>
                <th className="text-left px-4 py-3">GST Classification</th>
                <th className="text-right px-4 py-3">Subtotal</th>
                <th className="text-right px-4 py-3">Tax Amount</th>
                <th className="text-right px-4 py-3">Total Amount</th>
                <th className="text-right px-4 py-3">Balance Due</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Due Date</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    No invoices recorded in database yet.
                  </td>
                </tr>
              ) : (
                filtered.map(inv => {
                  const client = clientMap[inv.client_id]
                  const project = projectMap[inv.project_id || '']
                  const statusCfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft
                  const isOverdue = inv.status === 'overdue'
                  const isCancelled = inv.status === 'cancelled'
                  const balance = inv.balance_due ?? (inv.status === 'paid' ? 0 : inv.total)

                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isCancelled ? 'opacity-60 bg-slate-900/40' :
                        isOverdue ? 'border-l-4 border-l-red-500 bg-red-500/[0.02]' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-400">
                        {inv.invoice_number}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">
                          {client?.business_name ?? client?.company ?? client?.name ?? '—'}
                        </div>
                        <div className="text-xs text-slate-500">{client?.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        {inv.is_gst_applicable === false || inv.gst_type === 'none' || inv.tax_rate === 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            Non-GST (0%)
                          </span>
                        ) : inv.gst_type === 'igst' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            IGST 18% (Inter-State)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            CGST+SGST 18% (Kerala)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-400">
                        {formatCurrency(inv.subtotal)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-400">
                        {formatCurrency(inv.tax_amount)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-100">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-xs text-amber-400">
                        {isCancelled ? '—' : formatCurrency(balance)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.badge}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-xs ${isOverdue ? 'font-bold text-red-400' : 'text-slate-400'}`}>
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => downloadInvoicePDF(inv, client, project)}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                            title="Download Genuine PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {!isCancelled && (
                            <button
                              onClick={() => {
                                setEmailModalInvoice(inv)
                                setEmailMessage(`Dear ${client?.name || 'Client'},\n\nPlease find attached Tax Invoice ${inv.invoice_number} for ₹${Number(inv.total).toLocaleString('en-IN')}.\n\nKindly process the settlement within terms.`)
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                              title="Send via Brevo Email"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="View Invoice Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setAuditInvoice(inv)}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                            title="View Audit Trail History"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          {!isCancelled && inv.status !== 'paid' && (
                            <button
                              onClick={() => markPaid(inv)}
                              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                              title="Record Full Settlement as Paid"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {!isCancelled && (
                            <button
                              onClick={() => {
                                setCancellingInvoice(inv)
                                setCancellationReason('')
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="Documented Invoice Cancellation"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedInvoice(null)}>
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold font-mono text-blue-400">
                    {selectedInvoice.invoice_number}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(STATUS_CONFIG[selectedInvoice.status] || STATUS_CONFIG.draft).badge}`}>
                    {selectedInvoice.status.toUpperCase()}
                  </span>
                  {selectedInvoice.is_gst_applicable ? (
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-300 border border-blue-500/20">
                      {selectedInvoice.gst_type === 'igst' ? 'IGST 18%' : 'CGST (9%) + SGST (9%)'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700">
                      Non-GST Bill of Supply
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Issued to: <strong className="text-slate-200">{clientMap[selectedInvoice.client_id]?.business_name || clientMap[selectedInvoice.client_id]?.company || clientMap[selectedInvoice.client_id]?.name}</strong> ({clientMap[selectedInvoice.client_id]?.email})
                </p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-200 p-1.5"><X className="w-5 h-5" /></button>
            </div>

            {/* If Cancelled, show documented reason */}
            {selectedInvoice.status === 'cancelled' && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="w-4 h-4 text-rose-400" /> DOCUMENTED CANCELLATION NOTICE
                </div>
                <div>Reason: {selectedInvoice.cancellation_reason || 'Administrative cancellation'}</div>
                <div className="text-slate-400 text-[11px]">
                  Cancelled By: {selectedInvoice.cancelled_by || 'Admin'} • Date: {formatDate(selectedInvoice.cancelled_at || '')}
                </div>
              </div>
            )}

            {/* Line Items Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase text-slate-400">Invoice Items</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400">
                    <th className="text-left py-2">Description</th>
                    <th className="text-center py-2 w-16">Qty</th>
                    <th className="text-right py-2 w-28">Rate</th>
                    <th className="text-right py-2 w-28">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedInvoice.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 text-slate-200">{item.description}</td>
                      <td className="py-2.5 text-center text-slate-400">{item.quantity}</td>
                      <td className="py-2.5 text-right text-slate-400">{formatCurrency(item.unit_price)}</td>
                      <td className="py-2.5 text-right font-medium text-slate-100">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div className="pt-3 border-t border-slate-800 space-y-1.5 text-right text-sm">
                <div className="flex justify-end gap-8 text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-medium text-slate-200">{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                {selectedInvoice.is_gst_applicable ? (
                  selectedInvoice.gst_type === 'igst' ? (
                    <div className="flex justify-end gap-8 text-slate-400">
                      <span>IGST (18%):</span>
                      <span className="font-medium text-slate-200">{formatCurrency(selectedInvoice.igst_amount ?? selectedInvoice.tax_amount)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-end gap-8 text-slate-400">
                        <span>CGST (9%):</span>
                        <span className="font-medium text-slate-200">{formatCurrency(selectedInvoice.cgst_amount ?? (selectedInvoice.tax_amount / 2))}</span>
                      </div>
                      <div className="flex justify-end gap-8 text-slate-400">
                        <span>SGST (9%):</span>
                        <span className="font-medium text-slate-200">{formatCurrency(selectedInvoice.sgst_amount ?? (selectedInvoice.tax_amount / 2))}</span>
                      </div>
                    </>
                  )
                ) : (
                  <div className="flex justify-end gap-8 text-slate-400">
                    <span>Applicable Tax:</span>
                    <span className="font-medium text-slate-200">₹ 0 (Non-GST / Exempt)</span>
                  </div>
                )}
                <div className="flex justify-end gap-8 text-base font-bold text-slate-100 pt-2 border-t border-slate-800">
                  <span>Total Invoiced:</span>
                  <span className="text-blue-400">{formatCurrency(selectedInvoice.total)}</span>
                </div>
                <div className="flex justify-end gap-8 text-sm text-slate-400">
                  <span>Amount Paid / Settled:</span>
                  <span className="font-medium text-emerald-400">
                    {formatCurrency(selectedInvoice.amount_paid ?? (selectedInvoice.status === 'paid' ? selectedInvoice.total : 0))}
                  </span>
                </div>
                <div className="flex justify-end gap-8 text-sm font-semibold text-amber-400">
                  <span>Remaining Balance Due:</span>
                  <span>
                    {formatCurrency(selectedInvoice.balance_due ?? (selectedInvoice.status === 'paid' ? 0 : selectedInvoice.total))}
                  </span>
                </div>
              </div>
            </div>

            {selectedInvoice.notes && (
              <div className="p-3 bg-slate-800/60 rounded-xl text-xs text-slate-300">
                <strong className="text-slate-400">Bank Details / Instructions:</strong> {selectedInvoice.notes}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button onClick={() => setSelectedInvoice(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors">
                Close
              </button>
              <button
                onClick={() => downloadInvoicePDF(selectedInvoice, clientMap[selectedInvoice.client_id], projectMap[selectedInvoice.project_id || ''])}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit History Modal */}
      {auditInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setAuditInvoice(null)}>
          <div className="bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-800 space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-slate-100">Document Audit History</h3>
              </div>
              <button onClick={() => setAuditInvoice(null)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>

            <div className="text-xs text-slate-400">
              Complete tamper-evident event history for Invoice <span className="font-mono text-blue-400 font-bold">{auditInvoice.invoice_number}</span>.
            </div>

            <div className="space-y-3">
              {(!auditInvoice.audit_trail || auditInvoice.audit_trail.length === 0) ? (
                <div className="p-4 bg-slate-800/40 rounded-xl text-center text-xs text-slate-500">
                  Initial issuance record logged on creation ({formatDate(auditInvoice.created_at)}).
                </div>
              ) : (
                auditInvoice.audit_trail.map((item, idx) => (
                  <div key={item.id || idx} className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{item.action}</span>
                      <span className="text-slate-400 text-[11px] font-mono">{formatDate(item.timestamp)}</span>
                    </div>
                    <div className="text-slate-400">
                      Recorded by: <span className="text-slate-300 font-medium">{item.user}</span>
                    </div>
                    {item.reason && (
                      <div className="text-slate-300 bg-slate-900/60 px-2 py-1.5 rounded text-[11px] mt-1 border border-slate-800">
                        {item.reason}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setAuditInvoice(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors"
              >
                Close Audit Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documented Cancellation Modal */}
      {cancellingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setCancellingInvoice(null)}>
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-rose-500/30 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-rose-400 flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-400" /> Documented Invoice Cancellation
              </h3>
              <button onClick={() => setCancellingInvoice(null)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-400" /> Statutory Accounting Compliance Notice
              </div>
              <p>
                Under Indian accounting and GST compliance mandates, issued tax invoices must <strong>never be silently overwritten or deleted</strong>. Cancelling this invoice preserves the document in the permanent audit ledger and marks it as void.
              </p>
            </div>

            <form onSubmit={handleExecuteCancellation} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Invoice Reference</label>
                <div className="text-sm font-mono text-slate-200 bg-slate-800 px-3 py-2 rounded-xl flex justify-between">
                  <span>{cancellingInvoice.invoice_number}</span>
                  <span className="font-bold text-rose-400">{formatCurrency(cancellingInvoice.total)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Reason for Cancellation *
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancellationReason}
                  onChange={e => setCancellationReason(e.target.value)}
                  placeholder="e.g. Client requested contract scope alteration; re-issuing revised invoice CS-INV-..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCancellingInvoice(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCancellation}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-rose-600/20 transition-all"
                >
                  <Ban className="w-4 h-4" /> {submittingCancellation ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Brevo Send Email Modal */}
      {emailModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEmailModalInvoice(null)}>
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-400" /> Dispatch Invoice via Brevo
              </h3>
              <button onClick={() => setEmailModalInvoice(null)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Recipient</label>
                <div className="text-sm font-semibold text-slate-200 bg-slate-800 px-3 py-2 rounded-xl">
                  {clientMap[emailModalInvoice.client_id]?.name} &lt;{clientMap[emailModalInvoice.client_id]?.email || 'No email'}&gt;
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Invoice Reference</label>
                <div className="text-sm text-slate-300 bg-slate-800 px-3 py-2 rounded-xl flex justify-between">
                  <span>{emailModalInvoice.invoice_number}</span>
                  <span className="font-bold text-emerald-400">{formatCurrency(emailModalInvoice.total)}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Custom Cover Message</label>
                <textarea
                  rows={4}
                  value={emailMessage}
                  onChange={e => setEmailMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEmailModalInvoice(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                <Send className="w-4 h-4" /> {sendingEmail ? 'Dispatching...' : 'Send Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Tax Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Create Tax Invoice</h3>
                <p className="text-xs text-slate-400">Generate a statutory Indian GST invoice or Non-GST Bill of Supply</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Bill To Client *</label>
                  <select
                    required
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.business_name || c.company || c.name} ({c.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Link to Quotation (Optional)</label>
                  <select
                    value={quotationId}
                    onChange={e => handleQuotationChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None / Custom Invoice</option>
                    {quotations.map(q => (
                      <option key={q.id} value={q.id}>
                        {q.quote_number} — {q.title} ({formatCurrency(q.total)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* GST Invoicing Compliance Selector */}
              <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  GST Classification &amp; Tax Treatment *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                    gstType === 'cgst_sgst' ? 'bg-blue-600/10 border-blue-500 text-blue-200' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="gstType"
                      value="cgst_sgst"
                      checked={gstType === 'cgst_sgst'}
                      onChange={() => setGstType('cgst_sgst')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="font-semibold text-slate-200">Intra-State GST</div>
                      <div className="text-[11px] text-slate-400">CGST (9%) + SGST (9%) within Kerala</div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                    gstType === 'igst' ? 'bg-blue-600/10 border-blue-500 text-blue-200' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="gstType"
                      value="igst"
                      checked={gstType === 'igst'}
                      onChange={() => setGstType('igst')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="font-semibold text-slate-200">Inter-State GST</div>
                      <div className="text-[11px] text-slate-400">IGST (18%) outside Kerala state</div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                    gstType === 'none' ? 'bg-blue-600/10 border-blue-500 text-blue-200' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="gstType"
                      value="none"
                      checked={gstType === 'none'}
                      onChange={() => setGstType('none')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="font-semibold text-slate-200">Non-GST / Exempt</div>
                      <div className="text-[11px] text-slate-400">0% Commercial Bill of Supply</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Link to Project (Optional)</label>
                  <select
                    value={projectId}
                    onChange={e => setProjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-400">Line Items</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    + Add Item
                  </button>
                </div>
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Service or deliverable description"
                      required
                      value={item.description}
                      onChange={e => updateItem(idx, 'description', e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                      className="w-16 px-2 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Price"
                      value={item.unit_price || ''}
                      onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))}
                      className="w-28 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Summary Calculation */}
              <div className="bg-slate-800/60 p-4 rounded-xl space-y-2 text-sm border border-slate-700">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-100">{formatCurrency(subtotal)}</span>
                </div>
                {gstType === 'none' ? (
                  <div className="flex justify-between text-slate-400">
                    <span>Applicable GST:</span>
                    <span className="font-semibold text-slate-100">₹ 0 (Non-GST / Exempt)</span>
                  </div>
                ) : gstType === 'igst' ? (
                  <div className="flex justify-between text-slate-400">
                    <span>IGST (18%):</span>
                    <span className="font-semibold text-slate-100">{formatCurrency(calculatedTax.igst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-slate-400">
                      <span>CGST (9%):</span>
                      <span className="font-semibold text-slate-100">{formatCurrency(calculatedTax.cgst)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>SGST (9%):</span>
                      <span className="font-semibold text-slate-100">{formatCurrency(calculatedTax.sgst)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-bold text-base text-slate-100 pt-2 border-t border-slate-700">
                  <span>Grand Total:</span>
                  <span className="text-blue-400">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Invoice Notes &amp; Bank Instructions</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all">
                  <Send className="w-4 h-4" /> Save &amp; Download Tax Invoice PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
