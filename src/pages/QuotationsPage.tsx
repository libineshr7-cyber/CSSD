import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Plus, Eye, Edit2, Download, Trash2, X, Search,
  CheckCircle, Clock, Send, XCircle, Copy, Printer,
  RefreshCw, Check, ArrowRight, ShieldCheck, Mail, Link as LinkIcon
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { getClients } from '../lib/clientStore'
import { openPrintableQuotation, downloadQuotationPDF, downloadQuotationHTML } from '../lib/pdfGenerator'
import { sendQuotationEmail } from '../lib/emailService'
import type { Quotation, QuotationItem, QuotationStatus, Client, PaymentMilestone } from '../types/database'

// ─── Status Configuration ─────────────────────────────────────────────────────

export const QUOTE_STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  draft:              { label: 'Draft',              badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',     dot: 'bg-slate-400' },
  sent:               { label: 'Sent',               badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',         dot: 'bg-blue-500' },
  viewed:             { label: 'Viewed by Client',   badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20', dot: 'bg-indigo-500' },
  under_discussion:   { label: 'Under Discussion',   badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',     dot: 'bg-amber-500' },
  revision_requested: { label: 'Revision Requested', badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',       dot: 'bg-rose-500' },
  approved:           { label: 'Approved',           badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
  accepted:           { label: 'Approved',           badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
  rejected:           { label: 'Rejected',           badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',         dot: 'bg-rose-500' },
  expired:            { label: 'Expired',            badge: 'bg-slate-600/10 text-slate-500 border-slate-600/20',                         dot: 'bg-slate-500' },
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function QuotationsPage() {
  const navigate = useNavigate()

  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)

  // Filters & Sorting
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [page, setPage] = useState(1)
  const pageSize = 8

  // Modals & Drawers
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editQuote, setEditQuote] = useState<Quotation | null>(null)
  const [viewQuote, setViewQuote] = useState<Quotation | null>(null)
  const [deleteConfirmQuote, setDeleteConfirmQuote] = useState<Quotation | null>(null)
  const [emailModalQuote, setEmailModalQuote] = useState<Quotation | null>(null)
  const [approvalModalQuote, setApprovalModalQuote] = useState<Quotation | null>(null)
  const [copiedQuoteId, setCopiedQuoteId] = useState<string | null>(null)

  // Load from Supabase
  const loadQuotations = async () => {
    setLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from('quotations')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setQuotations(data as Quotation[])
      }
    } catch (_) {}

    try {
      const clientData = await getClients()
      if (clientData) setClients(clientData)
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => {
    loadQuotations()
  }, [])

  // Derived Metrics
  const stats = useMemo(() => {
    const totalQuotes = quotations.length
    const approvedQuotes = quotations.filter(q => q.status === 'approved' || q.status === 'accepted')
    const activeDiscussion = quotations.filter(q => q.status === 'sent' || q.status === 'viewed' || q.status === 'under_discussion')
    const totalValue = quotations.reduce((sum, q) => sum + (Number(q.total) || 0), 0)
    const approvedValue = approvedQuotes.reduce((sum, q) => sum + (Number(q.total) || 0), 0)

    return { totalQuotes, approvedQuotes: approvedQuotes.length, activeDiscussion: activeDiscussion.length, totalValue, approvedValue }
  }, [quotations])

  // Filtered List
  const filtered = useMemo(() => {
    return quotations.filter(q => {
      const normStatus = q.status === 'accepted' ? 'approved' : q.status
      if (statusFilter !== 'all' && normStatus !== statusFilter) return false
      if (clientFilter !== 'all' && q.client_id !== clientFilter) return false

      if (search.trim()) {
        const query = search.toLowerCase()
        const client = clients.find(c => c.id === q.client_id)
        const matchNumber = q.quote_number.toLowerCase().includes(query)
        const matchTitle = q.title.toLowerCase().includes(query)
        const matchClient = (client?.name || '').toLowerCase().includes(query)
        const matchCompany = (client?.business_name || client?.company || '').toLowerCase().includes(query)
        if (!matchNumber && !matchTitle && !matchClient && !matchCompany) return false
      }
      return true
    })
  }, [quotations, search, statusFilter, clientFilter, clients])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  // ─── Actions ────────────────────────────────────────────────────────────────

  // Helper to generate next sequential number: CS-QTN-YYYY-001
  const generateNextQuoteNumber = () => {
    const year = new Date().getFullYear()
    const nextSeq = quotations.length + 1
    return `CS-QTN-${year}-${String(nextSeq).padStart(3, '0')}`
  }

  const handleSaveQuotation = async (formData: Partial<Quotation>, isEdit: boolean) => {
    if (!formData.title?.trim() || !formData.client_id) {
      toast.error('Quotation title and client selection are required.')
      return
    }

    try {
      if (isEdit && editQuote) {
        const updated: Quotation = {
          ...editQuote,
          ...formData,
          updated_at: new Date().toISOString(),
        }

        await (supabase as any)
          .from('quotations')
          .update(formData)
          .eq('id', editQuote.id)

        setQuotations(prev => prev.map(q => q.id === editQuote.id ? updated : q))
        if (viewQuote?.id === editQuote.id) setViewQuote(updated)
        toast.success(`Quotation ${updated.quote_number} updated`)
        setEditQuote(null)
      } else {
        const quoteNum = generateNextQuoteNumber()
        const subtotal = (formData.items || []).reduce((sum, it) => sum + it.total, 0)
        const discount = Number(formData.discount) || 0
        const taxRate = Number(formData.tax_rate) || 15
        const taxable = Math.max(0, subtotal - discount)
        const taxAmount = taxable * (taxRate / 100)
        const total = taxable + taxAmount
        const advancePct = formData.advance_percentage ?? 50
        const advanceAmt = total * (advancePct / 100)
        const balanceAmt = total - advanceAmt

        const newQuote: Quotation = {
          id: `quot-${Date.now()}`,
          client_id: formData.client_id,
          requirement_id: formData.requirement_id || null,
          parent_quotation_id: null,
          version: 1,
          quote_number: quoteNum,
          title: formData.title.trim(),
          description: formData.description || null,
          items: formData.items || [],
          subtotal,
          discount,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
          advance_percentage: advancePct,
          advance_amount: advanceAmt,
          balance_amount: balanceAmt,
          delivery_timeline: formData.delivery_timeline || '4–6 Weeks',
          terms_conditions: formData.terms_conditions || null,
          valid_until: formData.valid_until || null,
          notes: formData.notes || null,
          status: 'draft',
          sent_at: null,
          accepted_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        try {
          const { data } = await (supabase as any)
            .from('quotations')
            .insert({
              client_id: newQuote.client_id,
              requirement_id: newQuote.requirement_id,
              quote_number: newQuote.quote_number,
              title: newQuote.title,
              description: newQuote.description,
              items: newQuote.items,
              subtotal: newQuote.subtotal,
              discount: newQuote.discount,
              tax_rate: newQuote.tax_rate,
              tax_amount: newQuote.tax_amount,
              total: newQuote.total,
              advance_percentage: newQuote.advance_percentage,
              advance_amount: newQuote.advance_amount,
              balance_amount: newQuote.balance_amount,
              delivery_timeline: newQuote.delivery_timeline,
              terms_conditions: newQuote.terms_conditions,
              valid_until: newQuote.valid_until,
              notes: newQuote.notes,
              status: 'draft',
            })
            .select()
            .single()

          if (data) newQuote.id = data.id
        } catch (_) {}

        setQuotations(prev => [newQuote, ...prev])
        toast.success(`Quotation ${newQuote.quote_number} created!`)
        setCreateModalOpen(false)
      }
    } catch (err: any) {
      toast.error('Failed to save quotation: ' + err.message)
    }
  }

  // 1-Click Duplicate Quotation
  const handleDuplicate = async (quote: Quotation) => {
    const newNumber = generateNextQuoteNumber()
    const duplicate: Quotation = {
      ...quote,
      id: `quot-${Date.now()}`,
      quote_number: newNumber,
      title: `${quote.title} (Copy)`,
      version: 1,
      parent_quotation_id: null,
      status: 'draft',
      sent_at: null,
      accepted_at: null,
      approval_details: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      await (supabase as any).from('quotations').insert({
        ...duplicate,
        id: undefined,
      })
    } catch (_) {}

    setQuotations(prev => [duplicate, ...prev])
    toast.success(`Duplicated to fresh quotation ${newNumber}`)
  }

  // Generate Revised Version e.g. CS-QTN-2026-001-v2
  const handleCreateRevision = async (quote: Quotation) => {
    const nextVer = (quote.version || 1) + 1
    const baseNum = quote.quote_number.split('-v')[0]
    const revisionNumber = `${baseNum}-v${nextVer}`

    const revision: Quotation = {
      ...quote,
      id: `quot-${Date.now()}`,
      parent_quotation_id: quote.id,
      version: nextVer,
      quote_number: revisionNumber,
      title: quote.title,
      status: 'revision_requested',
      approval_details: null,
      sent_at: null,
      accepted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      await (supabase as any).from('quotations').insert({
        ...revision,
        id: undefined,
      })
    } catch (_) {}

    setQuotations(prev => [revision, ...prev])
    toast.success(`Revision ${revisionNumber} generated!`)
    setEditQuote(revision)
  }

  // Status Change
  const handleStatusChange = async (id: string, newStatus: QuotationStatus) => {
    try {
      await (supabase as any)
        .from('quotations')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)

      setQuotations(prev => prev.map(q => q.id === id ? { ...q, status: newStatus } : q))
      if (viewQuote?.id === id) setViewQuote(prev => prev ? { ...prev, status: newStatus } : null)
      toast.success(`Quotation marked as ${QUOTE_STATUS_CONFIG[newStatus]?.label || newStatus}`)
    } catch (_) {
      toast.error('Failed to change status')
    }
  }

  // Convert Approved Quotation into Project
  const handleConvertToProject = async (quote: Quotation) => {
    if (quote.status !== 'approved' && quote.status !== 'accepted') {
      toast.error('Only approved quotations can be converted into active projects.')
      return
    }

    const newProject = {
      id: `proj-${Date.now()}`,
      client_id: quote.client_id,
      name: quote.title,
      description: quote.description || `Delivered under Quotation ${quote.quote_number}`,
      status: 'development',
      priority: 'high',
      budget: quote.total,
      deadline: quote.delivery_timeline,
      progress: 0,
      quotation_id: quote.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      await (supabase as any).from('projects').insert(newProject)
      await (supabase as any).from('quotations').update({ converted_project_id: newProject.id }).eq('id', quote.id)

      setQuotations(prev => prev.map(q => q.id === quote.id ? { ...q, converted_project_id: newProject.id } : q))
      toast.success(`Project "${newProject.name}" created from quotation!`)
      navigate('/admin/projects')
    } catch (_) {
      toast.success(`Project created from quotation ${quote.quote_number}!`)
      navigate('/admin/projects')
    }
  }

  // Print PDF
  const handlePrint = (quote: Quotation) => {
    const client = clients.find(c => c.id === quote.client_id)
    openPrintableQuotation(quote, client)

    // Mark as viewed if it was sent and not yet viewed
    if (quote.status === 'sent') {
      handleStatusChange(quote.id, 'viewed')
    }
  }

  // Download genuine binary PDF
  const handleDownload = (quote: Quotation) => {
    const client = clients.find(c => c.id === quote.client_id)
    downloadQuotationPDF(quote, client)
    toast.success(`Downloaded PDF for Quotation ${quote.quote_number}`)
  }

  // Copy Quotation Link
  const handleCopyLink = (quote: Quotation) => {
    const url = `${window.location.origin}/quote/${quote.id}`
    navigator.clipboard.writeText(url)
    setCopiedQuoteId(quote.id)
    toast.success('Quotation client link copied!')
    setTimeout(() => setCopiedQuoteId(null), 2000)
  }

  // Delete
  const handleDelete = async (id: string) => {
    try {
      await (supabase as any).from('quotations').delete().eq('id', id)
      setQuotations(prev => prev.filter(q => q.id !== id))
      if (viewQuote?.id === id) setViewQuote(null)
      toast.success('Quotation deleted')
      setDeleteConfirmQuote(null)
    } catch (_) {
      toast.error('Could not delete quotation')
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Professional Quotation Management</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Sequential quotations, client approval tracking, revisions, and GST-compliant commercial proposals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadQuotations}
            className="btn-secondary"
            title="Refresh quotations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Quotation</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 rounded-xl shadow-xs">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">Total Quotations</div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">{stats.totalQuotes}</div>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 rounded-xl shadow-xs">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">In Discussion / Sent</div>
          <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">{stats.activeDiscussion}</div>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 rounded-xl shadow-xs">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">Approved Proposals</div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{stats.approvedQuotes}</div>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 rounded-xl shadow-xs">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">Approved Pipeline Value</div>
          <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">{formatCurrency(stats.approvedValue)}</div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-3 bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 rounded-xl space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by quote number (CS-QTN-2026-001), project title, client..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-[#0b101d] border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1.5 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={clientFilter}
              onChange={e => { setClientFilter(e.target.value); setPage(1) }}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-[#0b101d] border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none max-w-[180px] truncate"
            >
              <option value="all">All Clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.client_code})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-t border-slate-200/80 dark:border-slate-800/80 pt-2">
          {['all', 'draft', 'sent', 'viewed', 'under_discussion', 'revision_requested', 'approved', 'rejected'].map(st => {
            const count = st === 'all'
              ? quotations.length
              : quotations.filter(q => (q.status === 'accepted' ? 'approved' : q.status) === st).length
            const cfg = QUOTE_STATUS_CONFIG[st]

            return (
              <button
                key={st}
                onClick={() => { setStatusFilter(st); setPage(1) }}
                className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors whitespace-nowrap flex items-center gap-1.5 text-xs ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cfg && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
                {st === 'all' ? 'All' : cfg?.label || st} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Quotations Table */}
      <div className="table-wrapper">
        {paginated.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">No quotations found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              No proposal matching your search criteria. Create a new quotation to get started.
            </p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="mt-4 btn-primary"
            >
              <Plus className="w-3.5 h-3.5" /> <span>Create Quotation</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Quote Number</th>
                  <th>Project Title & Client</th>
                  <th>Status</th>
                  <th>Total Amount</th>
                  <th>Advance Term</th>
                  <th>Valid Until</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(quote => {
                  const client = clients.find(c => c.id === quote.client_id)
                  const cfg = QUOTE_STATUS_CONFIG[quote.status] || QUOTE_STATUS_CONFIG.draft
                  const isApproved = quote.status === 'approved' || quote.status === 'accepted'
                  const advancePct = quote.advance_percentage ?? 50
                  const advanceAmt = quote.advance_amount ?? (quote.total * (advancePct / 100))

                  return (
                    <tr
                      key={quote.id}
                      className="cursor-pointer"
                      onClick={() => setViewQuote(quote)}
                    >
                      {/* Quote Number */}
                      <td>
                        <div className="font-mono font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          {quote.quote_number}
                          {quote.version && quote.version > 1 && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono">
                              v{quote.version}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Issued {formatDate(quote.created_at)}
                        </div>
                      </td>

                      {/* Project & Client */}
                      <td>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{quote.title}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {client?.business_name || client?.name || 'Client'} ({client?.client_code || 'CS-CLIENT'})
                        </div>
                      </td>

                      {/* Status Selector */}
                      <td onClick={e => e.stopPropagation()}>
                        <select
                          value={quote.status === 'accepted' ? 'approved' : quote.status}
                          onChange={e => handleStatusChange(quote.id, e.target.value as QuotationStatus)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-md border cursor-pointer focus:outline-none ${cfg.badge}`}
                        >
                          <option value="draft">Draft</option>
                          <option value="sent">Sent</option>
                          <option value="viewed">Viewed by Client</option>
                          <option value="under_discussion">Under Discussion</option>
                          <option value="revision_requested">Revision Requested</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="expired">Expired</option>
                        </select>
                      </td>

                      {/* Total */}
                      <td className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(quote.total)}
                      </td>

                      {/* Advance Breakdown */}
                      <td>
                        <div className="font-mono font-medium text-slate-700 dark:text-slate-300">
                          {advancePct}% ({formatCurrency(advanceAmt)})
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Bal: {formatCurrency(quote.total - advanceAmt)}
                        </div>
                      </td>

                      {/* Valid Until */}
                      <td className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {quote.valid_until ? formatDate(quote.valid_until) : '30 Days'}
                      </td>

                      {/* Actions */}
                      <td className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Approve Action */}
                          {!isApproved && (
                            <button
                              onClick={() => setApprovalModalQuote(quote)}
                              title="Record Client Approval"
                              className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-medium flex items-center gap-1 border border-emerald-500/20"
                            >
                              <ShieldCheck className="w-3 h-3" /> Approve
                            </button>
                          )}

                          {/* Convert to Project if Approved */}
                          {isApproved && (
                            <button
                              onClick={() => handleConvertToProject(quote)}
                              title="Convert to Project"
                              className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-[11px] font-medium flex items-center gap-1 border border-blue-500/20"
                            >
                              <ArrowRight className="w-3 h-3" /> Project
                            </button>
                          )}

                          {/* Print PDF */}
                          <button
                            onClick={() => handlePrint(quote)}
                            title="Print / Save PDF"
                            className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Download */}
                          <button
                            onClick={() => handleDownload(quote)}
                            title="Download HTML Document"
                            className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Send Email */}
                          <button
                            onClick={() => setEmailModalQuote(quote)}
                            title="Send via Email"
                            className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>

                          {/* Generate Revision */}
                          <button
                            onClick={() => handleCreateRevision(quote)}
                            title="Create Revision Version"
                            className="p-1 text-slate-400 hover:text-purple-400 transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicate(quote)}
                            title="Duplicate Quotation"
                            className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => setEditQuote(quote)}
                            title="Edit Quotation"
                            className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteConfirmQuote(quote)}
                            title="Delete Quotation"
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="py-2.5 px-4 border-t border-[#E5E5E5] dark:border-[#2D2D2D] bg-[#F9FAFB] dark:bg-[#252525] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} quotations
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border border-[#E5E5E5] dark:border-[#383838] bg-white dark:bg-[#1E1E1E] disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-semibold px-2">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded border border-[#E5E5E5] dark:border-[#383838] bg-white dark:bg-[#1E1E1E] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ─── PREVIEW / QUOTATION DETAIL DRAWER ─────────────────────────────────── */}
      {viewQuote && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs" onClick={() => setViewQuote(null)}>
          <div
            className="w-full max-w-xl h-full bg-white dark:bg-[#1E1E1E] border-l border-[#E5E5E5] dark:border-[#2D2D2D] shadow-2xl p-6 overflow-y-auto space-y-5 text-xs"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start border-b border-[#E5E5E5] dark:border-[#2D2D2D] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-[#0D99FF]">
                    {viewQuote.quote_number}
                  </span>
                  {viewQuote.version && viewQuote.version > 1 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      Version {viewQuote.version}
                    </span>
                  )}
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">{viewQuote.title}</h2>
              </div>
              <button onClick={() => setViewQuote(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Top Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handlePrint(viewQuote)}
                className="py-2 px-3 bg-[#0D99FF] text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> Print / Save PDF
              </button>
              <button
                onClick={() => setEmailModalQuote(viewQuote)}
                className="py-2 px-3 border border-[#E5E5E5] dark:border-[#383838] bg-[#F9FAFB] dark:bg-[#252525] rounded-lg font-medium flex items-center justify-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 text-blue-500" /> Email to Client
              </button>
            </div>

            {/* Approval Info Banner if approved */}
            {viewQuote.approval_details ? (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl space-y-1 text-green-700 dark:text-green-300">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Client Approval Recorded
                </div>
                <div>Approver: <strong>{viewQuote.approval_details.approved_by}</strong> ({viewQuote.approval_details.approver_email})</div>
                <div>Role: {viewQuote.approval_details.approver_role || 'Authorized Signatory'}</div>
                <div>Timestamp: {formatDate(viewQuote.approval_details.approved_at)} (Version {viewQuote.approval_details.version})</div>
                {viewQuote.approval_details.confirmation_statement && (
                  <div className="italic text-[11px] mt-1">"{viewQuote.approval_details.confirmation_statement}"</div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-[#383838] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Awaiting Client Approval</div>
                  <div className="text-[11px] text-slate-400">Formal authorization required before project kickoff.</div>
                </div>
                <button
                  onClick={() => setApprovalModalQuote(viewQuote)}
                  className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold"
                >
                  Approve Now
                </button>
              </div>
            )}

            {/* Items Table */}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase text-[11px] mb-2">Itemized Services</h4>
              <div className="border border-[#E5E5E5] dark:border-[#2D2D2D] rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#F9FAFB] dark:bg-[#252525] border-b border-[#E5E5E5] dark:border-[#2D2D2D] text-slate-500">
                    <tr>
                      <th className="py-2 px-3">Service</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Price</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#2D2D2D]">
                    {viewQuote.items.map((it, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">{it.description}</td>
                        <td className="py-2 px-3 text-center text-slate-500">{it.quantity}</td>
                        <td className="py-2 px-3 text-right text-slate-500">{formatCurrency(it.unit_price)}</td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals & Milestones Grid */}
            <div className="p-3 bg-[#F9FAFB] dark:bg-[#252525] rounded-xl border border-[#E5E5E5] dark:border-[#383838] space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(viewQuote.subtotal)}</span>
              </div>
              {viewQuote.discount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Discount:</span>
                  <span>-{formatCurrency(viewQuote.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Tax ({viewQuote.tax_rate}%):</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(viewQuote.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-[#E5E5E5] dark:border-[#383838] pt-2 text-[#0D99FF]">
                <span>Grand Total:</span>
                <span>{formatCurrency(viewQuote.total)}</span>
              </div>
              <div className="pt-2 border-t border-dashed border-[#E5E5E5] dark:border-[#383838] flex justify-between text-slate-600 dark:text-slate-300">
                <span>Advance Required ({viewQuote.advance_percentage ?? 50}%):</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(viewQuote.advance_amount ?? (viewQuote.total * ((viewQuote.advance_percentage ?? 50) / 100)))}
                </span>
              </div>
            </div>

            {/* Terms and Scope */}
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase text-[11px]">Timeline & Scope</h4>
              <div><strong>Timeline:</strong> {viewQuote.delivery_timeline || '4–6 Weeks'}</div>
              {viewQuote.description && (
                <div className="text-slate-600 dark:text-slate-300 mt-1">{viewQuote.description}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── CREATE / EDIT QUOTATION MODAL ────────────────────────────────────── */}
      {(createModalOpen || editQuote) && (
        <QuotationFormModal
          open={createModalOpen || !!editQuote}
          initial={editQuote || undefined}
          clients={clients}
          onClose={() => { setCreateModalOpen(false); setEditQuote(null) }}
          onSave={data => handleSaveQuotation(data, !!editQuote)}
        />
      )}

      {/* ─── CLIENT APPROVAL MODAL ────────────────────────────────────────────── */}
      {approvalModalQuote && (
        <ClientApprovalModal
          quote={approvalModalQuote}
          client={clients.find(c => c.id === approvalModalQuote.client_id)}
          onClose={() => setApprovalModalQuote(null)}
          onApprove={async details => {
            const updated = {
              status: 'approved' as const,
              accepted_at: details.approved_at,
              approval_details: details,
            }
            await (supabase as any).from('quotations').update(updated).eq('id', approvalModalQuote.id)
            setQuotations(prev => prev.map(q => q.id === approvalModalQuote.id ? { ...q, ...updated } : q))
            if (viewQuote?.id === approvalModalQuote.id) {
              setViewQuote(prev => prev ? { ...prev, ...updated } : null)
            }
            toast.success(`Quotation ${approvalModalQuote.quote_number} officially approved!`)
            setApprovalModalQuote(null)
          }}
        />
      )}

      {/* ─── SEND EMAIL MODAL ─────────────────────────────────────────────────── */}
      {emailModalQuote && (
        <SendQuotationEmailModal
          quote={emailModalQuote}
          client={clients.find(c => c.id === emailModalQuote.client_id)}
          onClose={() => setEmailModalQuote(null)}
          onSend={async (toEmail, subject, messageText) => {
            const client = clients.find(c => c.id === emailModalQuote.client_id)
            const result = await sendQuotationEmail(emailModalQuote, client, messageText)

            if (!result.success) {
              toast.error(`Email dispatch notice: ${result.error || 'Failed to dispatch via Brevo.'}`)
            } else {
              toast.success(`Quotation sent via Brevo to ${toEmail} (ID: ${result.messageId?.slice(0, 12)}...)`)
            }

            await (supabase as any).from('quotations').update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              email_sent_to: toEmail,
              email_sent_at: new Date().toISOString(),
              email_subject: subject,
            }).eq('id', emailModalQuote.id)

            setQuotations(prev => prev.map(q => q.id === emailModalQuote.id ? {
              ...q,
              status: 'sent',
              sent_at: new Date().toISOString(),
              email_sent_to: toEmail,
            } : q))

            setEmailModalQuote(null)
          }}
        />
      )}

      {/* ─── DELETE CONFIRM MODAL ─────────────────────────────────────────────── */}
      {deleteConfirmQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#1E1E1E] rounded-xl border border-[#E5E5E5] dark:border-[#383838] p-5 space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-red-500">Delete Quotation?</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to delete quotation <strong>{deleteConfirmQuote.quote_number}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmQuote(null)}
                className="px-3 py-1.5 rounded-lg border border-[#E5E5E5] dark:border-[#383838] text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmQuote.id)}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── QUOTATION FORM MODAL (COMPREHENSIVE PRICING & MILESTONES) ────────────────

function QuotationFormModal({
  open,
  initial,
  clients,
  onClose,
  onSave,
}: {
  open: boolean
  initial?: Quotation
  clients: Client[]
  onClose: () => void
  onSave: (data: Partial<Quotation>) => void
}) {
  const [clientId, setClientId] = useState(initial?.client_id || (clients[0]?.id || ''))
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [deliveryTimeline, setDeliveryTimeline] = useState(initial?.delivery_timeline || '4–6 Weeks')
  const [validUntil, setValidUntil] = useState(initial?.valid_until ? initial.valid_until.split('T')[0] : '')
  const [discount, setDiscount] = useState(initial?.discount ? String(initial.discount) : '0')
  const [taxRate, setTaxRate] = useState(initial?.tax_rate ? String(initial.tax_rate) : '15')
  const [advancePercentage, setAdvancePercentage] = useState(initial?.advance_percentage ?? 50)
  const [terms, setTerms] = useState(initial?.terms_conditions || '')
  const [notes, setNotes] = useState(initial?.notes || '')

  const [items, setItems] = useState<QuotationItem[]>(
    initial?.items && initial.items.length > 0
      ? initial.items
      : [{ description: 'Modern Responsive Website Development & Architecture', quantity: 1, unit_price: 25000, total: 25000 }]
  )

  if (!open) return null

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, total: 0 }])
  }

  const updateItem = (index: number, field: keyof QuotationItem, value: any) => {
    setItems(prev => {
      const next = [...prev]
      const current = { ...next[index], [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        current.total = (Number(current.quantity) || 0) * (Number(current.unit_price) || 0)
      }
      next[index] = current
      return next
    })
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  // Live Calculations
  const subtotal = items.reduce((sum, it) => sum + (Number(it.total) || 0), 0)
  const discountVal = Number(discount) || 0
  const taxable = Math.max(0, subtotal - discountVal)
  const taxVal = taxable * ((Number(taxRate) || 0) / 100)
  const grandTotal = taxable + taxVal
  const advanceAmount = grandTotal * (advancePercentage / 100)
  const balanceAmount = grandTotal - advanceAmount

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      client_id: clientId,
      title,
      description,
      delivery_timeline: deliveryTimeline,
      valid_until: validUntil || null,
      items,
      subtotal,
      discount: discountVal,
      tax_rate: Number(taxRate) || 0,
      tax_amount: taxVal,
      total: grandTotal,
      advance_percentage: advancePercentage,
      advance_amount: advanceAmount,
      balance_amount: balanceAmount,
      terms_conditions: terms,
      notes,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div
        className="w-full max-w-3xl bg-white dark:bg-[#1E1E1E] rounded-xl border border-[#E5E5E5] dark:border-[#383838] p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#2D2D2D] pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {initial ? `Edit Quotation: ${initial.quote_number}` : 'Create Commercial Quotation'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Unique sequential numbering with itemized deliverables and configurable advance payment.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Header Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-slate-500 mb-1">Project Proposal Title *</label>
              <input
                required
                type="text"
                placeholder="e.g. Apex Financial Dashboard Web Architecture"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Target Client *</label>
              <select
                required
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.client_code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Estimated Delivery Timeline</label>
              <input
                type="text"
                placeholder="e.g. 6–8 Weeks from advance receipt"
                value={deliveryTimeline}
                onChange={e => setDeliveryTimeline(e.target.value)}
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Valid Until / Expiry Date</label>
              <input
                type="date"
                value={validUntil}
                onChange={e => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Project Scope & Deliverables Summary</label>
            <textarea
              rows={2}
              placeholder="High-level summary of deliverables included in this quote..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Line Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Itemized Service Deliverables
              </label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs font-semibold text-[#0D99FF] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Service Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    required
                    type="text"
                    placeholder="Description (e.g. Backend API & PostgreSQL Database Setup)"
                    value={it.description}
                    onChange={e => updateItem(idx, 'description', e.target.value)}
                    className="flex-3 px-3 py-1.5 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs"
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="Qty"
                    value={it.quantity}
                    onChange={e => updateItem(idx, 'quantity', e.target.value)}
                    className="w-16 px-2 py-1.5 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-center"
                  />
                  <input
                    type="number"
                    placeholder="Unit Price"
                    value={it.unit_price}
                    onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                    className="w-28 px-3 py-1.5 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-right"
                  />
                  <div className="w-24 text-right font-bold text-slate-900 dark:text-slate-100 text-xs">
                    {formatCurrency(it.total)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={items.length <= 1}
                    className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Adjustments & Milestones */}
          <div className="p-4 bg-slate-50 dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-[#383838] grid grid-cols-2 gap-4">
            {/* Advance Percentage Selector */}
            <div className="space-y-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Payment Milestone Configuration
              </label>
              <div>
                <span className="text-slate-500">Advance Payment Percentage:</span>
                <div className="flex items-center gap-2 mt-1">
                  {[25, 40, 50, 60, 100].map(pct => (
                    <button
                      type="button"
                      key={pct}
                      onClick={() => setAdvancePercentage(pct)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                        advancePercentage === pct
                          ? 'bg-[#0D99FF] text-white border-[#0D99FF]'
                          : 'bg-white dark:bg-[#1E1E1E] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#383838]'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs space-y-1 bg-white dark:bg-[#1E1E1E] p-2.5 rounded-lg border border-slate-200 dark:border-[#383838]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Advance Deposit ({advancePercentage}%):</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(advanceAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Final Handover Balance ({100 - advancePercentage}%):</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(balanceAmount)}</span>
                </div>
              </div>
            </div>

            {/* Calculations Table */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Discount Amount (₹):</span>
                <input
                  type="number"
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  className="w-24 px-2 py-1 bg-white dark:bg-[#1E1E1E] border border-slate-200 dark:border-[#383838] rounded text-right text-xs"
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Tax / VAT Rate (%):</span>
                <input
                  type="number"
                  value={taxRate}
                  onChange={e => setTaxRate(e.target.value)}
                  className="w-24 px-2 py-1 bg-white dark:bg-[#1E1E1E] border border-slate-200 dark:border-[#383838] rounded text-right text-xs"
                />
              </div>

              <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-slate-200 dark:border-[#383838] text-[#0D99FF]">
                <span>Grand Total:</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E5E5] dark:border-[#2D2D2D]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[#E5E5E5] dark:border-[#383838] text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-[#0D99FF] hover:bg-[#0D99FF]/90 text-white text-xs font-semibold shadow-sm"
            >
              {initial ? 'Save Quotation Changes' : 'Generate Quotation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── CLIENT FORMAL APPROVAL MODAL ─────────────────────────────────────────────

function ClientApprovalModal({
  quote,
  client,
  onClose,
  onApprove,
}: {
  quote: Quotation
  client?: Client
  onClose: () => void
  onApprove: (details: any) => void
}) {
  const [approvedBy, setApprovedBy] = useState(client?.name || '')
  const [approverEmail, setApproverEmail] = useState(client?.email || '')
  const [approverRole, setApproverRole] = useState('Director / Client Signatory')
  const [statement, setStatement] = useState(
    `I hereby approve Quotation ${quote.quote_number} (Total: ${formatCurrency(quote.total)}) on behalf of ${client?.business_name || client?.name || 'the client'}.`
  )
  const [confirmed, setConfirmed] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirmed) {
      toast.error('Please check the confirmation declaration box.')
      return
    }

    onApprove({
      approved_by: approvedBy.trim(),
      approver_email: approverEmail.trim(),
      approver_role: approverRole.trim(),
      approved_at: new Date().toISOString(),
      version: quote.version || 1,
      confirmation_statement: statement.trim(),
      ip_address: 'client_session',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-[#1E1E1E] rounded-xl border border-[#E5E5E5] dark:border-[#383838] p-6 space-y-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#2D2D2D] pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              Record Client Formal Approval
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Official approval records approver identity, timestamp, and quotation version.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="p-3 bg-[#F9FAFB] dark:bg-[#252525] rounded-lg border border-[#E5E5E5] dark:border-[#383838] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Quotation Ref:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{quote.quote_number} (v{quote.version || 1})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Approved Value:</span>
              <span className="font-bold text-[#0D99FF]">{formatCurrency(quote.total)}</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Approver Full Name *</label>
            <input
              required
              type="text"
              value={approvedBy}
              onChange={e => setApprovedBy(e.target.value)}
              className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Approver Official Email *</label>
            <input
              required
              type="email"
              value={approverEmail}
              onChange={e => setApproverEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Signatory Role / Designation</label>
            <input
              type="text"
              value={approverRole}
              onChange={e => setApproverRole(e.target.value)}
              className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Approval Confirmation Statement</label>
            <textarea
              rows={2}
              value={statement}
              onChange={e => setStatement(e.target.value)}
              className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100 text-[11px]"
            />
          </div>

          <label className="flex items-start gap-2 pt-1 text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-green-600 focus:ring-green-500"
            />
            <span>I confirm this proposal is officially accepted and authorized for agreement execution.</span>
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E5E5] dark:border-[#2D2D2D]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[#E5E5E5] dark:border-[#383838] text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Confirm Formal Approval
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── SEND EMAIL MODAL ─────────────────────────────────────────────────────────

function SendQuotationEmailModal({
  quote,
  client,
  onClose,
  onSend,
}: {
  quote: Quotation
  client?: Client
  onClose: () => void
  onSend: (toEmail: string, subject: string, messageText: string) => Promise<void>
}) {
  const [toEmail, setToEmail] = useState(client?.email || '')
  const [subject, setSubject] = useState(`Quotation ${quote.quote_number}: ${quote.title} — CapeSecure Solutions`)
  const [message, setMessage] = useState(
    `Dear ${client?.name || 'Client'},\n\nPlease find attached the official commercial quotation for "${quote.title}".\n\nTotal Value: ${formatCurrency(quote.total)}\nAdvance Deposit (50%): ${formatCurrency(quote.total * 0.5)}\nValid Until: ${quote.valid_until ? formatDate(quote.valid_until) : '30 days'}\n\nPlease review the terms and click to approve or request revisions.\n\nBest regards,\nCapeSecure Solutions Team`
  )
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!toEmail.trim()) {
      toast.error('Recipient email is required.')
      return
    }
    setSending(true)
    try {
      await onSend(toEmail.trim(), subject.trim(), message.trim())
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-[#1E1E1E] rounded-xl border border-[#E5E5E5] dark:border-[#383838] p-6 space-y-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#2D2D2D] pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-500" />
            Send Quotation via Email
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-500 mb-1">To Email *</label>
            <input
              required
              type="email"
              value={toEmail}
              onChange={e => setToEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Subject</label>
            <input
              required
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100 font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Email Message Body</label>
            <textarea
              rows={6}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100 text-[11px]"
            />
          </div>

          <div className="p-2.5 rounded bg-blue-500/5 border border-blue-500/20 text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-2">
            <FileText className="w-4 h-4 shrink-0" />
            <span>Attachment: <strong>{quote.quote_number}.pdf</strong> (CapeSecure Executive PDF Layout)</span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E5E5] dark:border-[#2D2D2D]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[#E5E5E5] dark:border-[#383838] text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className={`w-3.5 h-3.5 ${sending ? 'animate-spin' : ''}`} />
              {sending ? 'Sending via Brevo...' : 'Send Quotation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
