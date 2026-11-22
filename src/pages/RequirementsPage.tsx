import { useState, useMemo, useEffect } from 'react'
import {
  Plus, Search, Edit2, Trash2, X,
  FileText, Download, Printer, Eye, Globe,
  Layers, Calendar, DollarSign,
  Building2, CheckCircle2,
  Paperclip, Tag, ArrowRight,
  RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { getClients } from '../lib/clientStore'
import { openPrintableRequirementSummary, downloadRequirementPDF, downloadRequirementHTML } from '../lib/pdfGenerator'
import type { Requirement, Client, Lead, RequirementReference, RequirementAttachment } from '../types/database'

// ─── Constants & Options ──────────────────────────────────────────────────────

const WEBSITE_TYPES = [
  { key: 'e-commerce', label: 'E-Commerce Store' },
  { key: 'corporate', label: 'Corporate / Business' },
  { key: 'portal_saas', label: 'Web Portal / SaaS App' },
  { key: 'portfolio', label: 'Portfolio / Creative' },
  { key: 'landing_page', label: 'High-Converting Landing Page' },
  { key: 'blog_media', label: 'Blog / Media Publication' },
  { key: 'custom', label: 'Custom Web Application' },
]

const DEFAULT_PAGES = [
  'Home',
  'About Us',
  'Services',
  'Products / Shop',
  'Pricing',
  'Portfolio / Case Studies',
  'Blog / News',
  'Contact Us',
  'FAQ',
  'User Dashboard',
  'Terms & Privacy',
]

const DEFAULT_FEATURES = [
  'User Authentication & Roles',
  'CMS / Blog Engine',
  'Contact Form & Lead Capture',
  'Online Payment Gateway',
  'Shipping & Courier Integration',
  'Appointment / Booking Engine',
  'Live Chat / WhatsApp Widget',
  'SEO Optimization & Meta tags',
  'Analytics & Conversion Tracking',
  'Dark / Light Theme Toggle',
  'Multi-language Support',
]

const INITIAL_REQUIREMENTS: Requirement[] = []

export default function RequirementsPage() {
  const [requirements, setRequirements] = useState<Requirement[]>(INITIAL_REQUIREMENTS)
  const [clients, setClients] = useState<Client[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)

  // Filters & State
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const pageSize = 6

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editReq, setEditReq] = useState<Requirement | null>(null)
  const [deleteConfirmReq, setDeleteConfirmReq] = useState<Requirement | null>(null)
  const [previewReq, setPreviewReq] = useState<Requirement | null>(null)

  // Load from Supabase
  const loadRequirements = async () => {
    setLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from('requirements')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setRequirements(data as Requirement[])
      }
    } catch (_) {}

    try {
      const clientData = await getClients()
      if (clientData) setClients(clientData)
      const { data: leadData } = await (supabase as any).from('leads').select('*')
      if (leadData) setLeads(leadData as Lead[])
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => {
    loadRequirements()
  }, [])

  // Filtered Requirements
  const filtered = useMemo(() => {
    return requirements.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (typeFilter !== 'all' && r.website_type !== typeFilter) return false
      if (clientFilter !== 'all' && r.client_id !== clientFilter) return false

      if (search.trim()) {
        const q = search.toLowerCase()
        const client = clients.find(c => c.id === r.client_id)
        const matchTitle = r.title.toLowerCase().includes(q)
        const matchClient = (client?.name || '').toLowerCase().includes(q)
        const matchCompany = (client?.business_name || client?.company || '').toLowerCase().includes(q)
        const matchPurpose = (r.business_purpose || '').toLowerCase().includes(q)
        if (!matchTitle && !matchClient && !matchCompany && !matchPurpose) return false
      }
      return true
    })
  }, [requirements, search, statusFilter, typeFilter, clientFilter, clients])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleSaveRequirement = async (formData: Partial<Requirement>, isEdit: boolean) => {
    if (!formData.title?.trim() || !formData.client_id) {
      toast.error('Requirement title and associated client are required.')
      return
    }

    try {
      if (isEdit && editReq) {
        const updated: Requirement = {
          ...editReq,
          ...formData,
          updated_at: new Date().toISOString(),
        }

        await (supabase as any)
          .from('requirements')
          .update(formData)
          .eq('id', editReq.id)

        setRequirements(prev => prev.map(r => r.id === editReq.id ? updated : r))
        if (previewReq?.id === editReq.id) setPreviewReq(updated)
        toast.success('Requirement specification updated')
        setEditReq(null)
      } else {
        const newReq: Requirement = {
          id: `req-${Date.now()}`,
          client_id: formData.client_id,
          lead_id: formData.lead_id || null,
          project_id: null,
          title: formData.title.trim(),
          website_type: formData.website_type || 'corporate',
          business_purpose: formData.business_purpose || null,
          pages: formData.pages || [],
          features: formData.features || [],
          frontend_tech: formData.frontend_tech || null,
          backend_tech: formData.backend_tech || null,
          database_tech: formData.database_tech || null,
          payment_gateway: formData.payment_gateway || null,
          shipping_integration: formData.shipping_integration || null,
          domain_requirements: formData.domain_requirements || null,
          hosting_requirements: formData.hosting_requirements || null,
          design_preferences: formData.design_preferences || null,
          reference_urls: (formData.reference_websites || []).map(r => r.url),
          reference_websites: formData.reference_websites || [],
          timeline: formData.timeline || null,
          budget_min: formData.budget_min ? Number(formData.budget_min) : null,
          budget_max: formData.budget_max ? Number(formData.budget_max) : null,
          budget_range: formData.budget_min && formData.budget_max
            ? `${formatCurrency(formData.budget_min)} – ${formatCurrency(formData.budget_max)}`
            : null,
          estimated_delivery_date: formData.estimated_delivery_date || null,
          additional_notes: formData.additional_notes || null,
          attachments: formData.attachments || [],
          status: (formData.status as any) || 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        try {
          const { data } = await (supabase as any)
            .from('requirements')
            .insert({
              client_id: newReq.client_id,
              lead_id: newReq.lead_id,
              title: newReq.title,
              website_type: newReq.website_type,
              business_purpose: newReq.business_purpose,
              pages: newReq.pages,
              features: newReq.features,
              frontend_tech: newReq.frontend_tech,
              backend_tech: newReq.backend_tech,
              database_tech: newReq.database_tech,
              payment_gateway: newReq.payment_gateway,
              shipping_integration: newReq.shipping_integration,
              domain_requirements: newReq.domain_requirements,
              hosting_requirements: newReq.hosting_requirements,
              design_preferences: newReq.design_preferences,
              reference_urls: newReq.reference_urls,
              reference_websites: newReq.reference_websites,
              timeline: newReq.timeline,
              budget_min: newReq.budget_min,
              budget_max: newReq.budget_max,
              budget_range: newReq.budget_range,
              estimated_delivery_date: newReq.estimated_delivery_date,
              additional_notes: newReq.additional_notes,
              attachments: newReq.attachments,
              status: newReq.status,
            })
            .select()
            .single()

          if (data) newReq.id = data.id
        } catch (_) {}

        setRequirements(prev => [newReq, ...prev])
        toast.success('Requirement specification created!')
        setCreateModalOpen(false)
      }
    } catch (err: any) {
      toast.error('Save failed: ' + err.message)
    }
  }

  const handleDeleteReq = async (id: string) => {
    try {
      await (supabase as any).from('requirements').delete().eq('id', id)
      setRequirements(prev => prev.filter(r => r.id !== id))
      if (previewReq?.id === id) setPreviewReq(null)
      toast.success('Requirement removed')
      setDeleteConfirmReq(null)
    } catch (_) {
      toast.error('Could not delete requirement')
    }
  }

  const handleStatusChange = async (id: string, newStatus: Requirement['status']) => {
    try {
      await (supabase as any)
        .from('requirements')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)

      setRequirements(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
      if (previewReq?.id === id) setPreviewReq(prev => prev ? { ...prev, status: newStatus } : null)
      toast.success(`Requirement marked as ${newStatus.toUpperCase()}`)
    } catch (_) {
      toast.error('Status update failed')
    }
  }

  const handlePrintPDF = (req: Requirement) => {
    const client = clients.find(c => c.id === req.client_id)
    const lead = leads.find(l => l.id === req.lead_id)
    openPrintableRequirementSummary({ requirement: req, client, lead })
  }

  const handleDownloadDoc = (req: Requirement) => {
    const client = clients.find(c => c.id === req.client_id)
    const lead = leads.find(l => l.id === req.lead_id)
    downloadRequirementPDF({ requirement: req, client, lead })
    toast.success('Downloaded requirement specification PDF!')
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Client Requirement Collection</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Capture detailed website scope, frontend/backend architecture, page hierarchy, features, and generate printable summary PDFs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadRequirements}
            className="p-1.5 rounded-lg border border-[#E5E5E5] dark:border-[#383838] bg-white dark:bg-[#1E1E1E] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            title="Refresh requirements"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3 py-1.5 bg-[#0D99FF] hover:bg-[#0D99FF]/90 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Requirement Brief
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#2D2D2D] rounded-xl space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by requirement title, client name, purpose..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-9 pr-3 py-1.5 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0D99FF]"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Website Type Filter */}
            <select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
              className="px-2.5 py-1.5 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">All Website Types</option>
              {WEBSITE_TYPES.map(t => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>

            {/* Client Filter */}
            <select
              value={clientFilter}
              onChange={e => { setClientFilter(e.target.value); setPage(1) }}
              className="px-2.5 py-1.5 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none max-w-[160px] truncate"
            >
              <option value="all">All Clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.client_code})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-t border-[#E5E5E5] dark:border-[#2D2D2D] pt-2">
          {['all', 'draft', 'submitted', 'reviewed', 'approved'].map(st => {
            const count = st === 'all' ? requirements.length : requirements.filter(r => r.status === st).length
            return (
              <button
                key={st}
                onClick={() => { setStatusFilter(st); setPage(1) }}
                className={`px-2.5 py-1 rounded-md font-semibold capitalize transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#282828]'
                }`}
              >
                {st} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Requirements Cards Grid */}
      {paginated.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#2D2D2D] rounded-xl">
          <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">No requirement documents found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Create a detailed website specification brief for one of your clients to get started.
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="mt-4 px-3 py-1.5 bg-[#0D99FF] text-white text-xs font-medium rounded-lg inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Create Requirement Brief
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paginated.map(req => {
            const client = clients.find(c => c.id === req.client_id)
            const typeObj = WEBSITE_TYPES.find(t => t.key === req.website_type)

            return (
              <div
                key={req.id}
                className="p-5 bg-white dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#2D2D2D] rounded-xl space-y-4 hover:border-[#0D99FF]/40 transition-colors shadow-xs flex flex-col justify-between"
              >
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#282828] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#383838]">
                          {client?.client_code || 'CS-CLIENT-XXXX'}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{req.title}</h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {client?.business_name || client?.name || 'Client Account'} • {typeObj?.label || req.website_type}
                      </p>
                    </div>

                    {/* Status Selector */}
                    <select
                      value={req.status}
                      onChange={e => handleStatusChange(req.id, e.target.value as any)}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border uppercase cursor-pointer focus:outline-none ${
                        req.status === 'approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                        req.status === 'reviewed' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        req.status === 'submitted' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                        'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}
                    >
                      <option value="draft">Draft</option>
                      <option value="submitted">Submitted</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="approved">Approved</option>
                    </select>
                  </div>

                  {/* Business Purpose */}
                  {req.business_purpose && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 line-clamp-2 bg-[#F9FAFB] dark:bg-[#252525] p-2.5 rounded-lg border border-[#E5E5E5] dark:border-[#383838]">
                      {req.business_purpose}
                    </p>
                  )}

                  {/* Spec Highlights Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
                    <div className="p-2 rounded bg-slate-50 dark:bg-[#252525] border border-slate-100 dark:border-[#333333]">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Pages Required</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {req.pages?.length || 0} Pages ({req.pages?.slice(0, 2).join(', ')}...)
                      </span>
                    </div>

                    <div className="p-2 rounded bg-slate-50 dark:bg-[#252525] border border-slate-100 dark:border-[#333333]">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Budget & Timeline</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {req.budget_range || (req.budget_min ? formatCurrency(req.budget_min) : 'TBD')}
                      </span>
                    </div>

                    <div className="p-2 rounded bg-slate-50 dark:bg-[#252525] border border-slate-100 dark:border-[#333333]">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Payment / Shipping</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {req.payment_gateway || 'None'} • {req.shipping_integration || 'None'}
                      </span>
                    </div>

                    <div className="p-2 rounded bg-slate-50 dark:bg-[#252525] border border-slate-100 dark:border-[#333333]">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Delivery Target</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {req.estimated_delivery_date ? formatDate(req.estimated_delivery_date) : (req.timeline || '4–6 wks')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-[#E5E5E5] dark:border-[#2D2D2D] gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handlePrintPDF(req)}
                      title="Print or Save as PDF"
                      className="px-2.5 py-1 bg-[#0D99FF] hover:bg-[#0D99FF]/90 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print Summary PDF
                    </button>

                    <button
                      onClick={() => handleDownloadDoc(req)}
                      title="Download Specification Document"
                      className="p-1.5 border border-[#E5E5E5] dark:border-[#383838] bg-[#F9FAFB] dark:bg-[#252525] text-slate-600 dark:text-slate-300 rounded hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewReq(req)}
                      title="View Full Specification"
                      className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditReq(req)}
                      title="Edit Specification"
                      className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmReq(req)}
                      title="Delete Specification"
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination Footer */}
      <div className="py-2.5 px-4 border border-[#E5E5E5] dark:border-[#2D2D2D] rounded-xl bg-white dark:bg-[#1E1E1E] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div>
          Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} briefs
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

      {/* ─── CREATE / EDIT REQUIREMENT FORM MODAL ────────────────────────────── */}
      {(createModalOpen || editReq) && (
        <RequirementFormModal
          open={createModalOpen || !!editReq}
          initial={editReq || undefined}
          clients={clients}
          leads={leads}
          onClose={() => { setCreateModalOpen(false); setEditReq(null) }}
          onSave={data => handleSaveRequirement(data, !!editReq)}
        />
      )}

      {/* ─── REQUIREMENT DETAIL DRAWER ────────────────────────────────────────── */}
      {previewReq && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs" onClick={() => setPreviewReq(null)}>
          <div
            className="w-full max-w-xl h-full bg-white dark:bg-[#1E1E1E] border-l border-[#E5E5E5] dark:border-[#2D2D2D] shadow-2xl p-6 overflow-y-auto space-y-5 text-xs"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-[#E5E5E5] dark:border-[#2D2D2D] pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-500 uppercase">
                  {previewReq.status}
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">{previewReq.title}</h2>
              </div>
              <button onClick={() => setPreviewReq(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handlePrintPDF(previewReq)}
                className="flex-1 py-2 px-3 bg-[#0D99FF] text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> Print Summary PDF
              </button>
              <button
                onClick={() => handleDownloadDoc(previewReq)}
                className="py-2 px-3 border border-[#E5E5E5] dark:border-[#383838] bg-[#F9FAFB] dark:bg-[#252525] rounded-lg font-medium flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            </div>

            <div className="p-3 bg-[#F9FAFB] dark:bg-[#252525] rounded-lg border border-[#E5E5E5] dark:border-[#383838] space-y-1">
              <div><strong>Business Purpose:</strong> {previewReq.business_purpose || 'N/A'}</div>
              <div><strong>Website Type:</strong> {previewReq.website_type}</div>
              <div><strong>Budget:</strong> {previewReq.budget_range || (previewReq.budget_min ? formatCurrency(previewReq.budget_min) : 'TBD')}</div>
              <div><strong>Estimated Delivery:</strong> {previewReq.estimated_delivery_date || previewReq.timeline || 'TBD'}</div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2 uppercase text-[11px]">Pages Requested</h4>
              <div className="flex flex-wrap gap-1.5">
                {(previewReq.pages || []).map(p => (
                  <span key={p} className="px-2 py-0.5 bg-slate-100 dark:bg-[#282828] rounded border border-slate-200 dark:border-[#383838]">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2 uppercase text-[11px]">Key Features</h4>
              <div className="flex flex-wrap gap-1.5">
                {(previewReq.features || []).map(f => (
                  <span key={f} className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded border border-blue-500/20">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase text-[11px]">Technical Architecture</h4>
              <div><strong>Frontend:</strong> {previewReq.frontend_tech || 'React / Vite / Tailwind'}</div>
              <div><strong>Backend:</strong> {previewReq.backend_tech || 'Node.js / Supabase'}</div>
              <div><strong>Database:</strong> {previewReq.database_tech || 'Supabase PostgreSQL'}</div>
              <div><strong>Payment:</strong> {previewReq.payment_gateway || 'None'}</div>
              <div><strong>Shipping:</strong> {previewReq.shipping_integration || 'None'}</div>
              <div><strong>Domain:</strong> {previewReq.domain_requirements || 'Standard'}</div>
              <div><strong>Hosting:</strong> {previewReq.hosting_requirements || 'Vercel / Cloudflare'}</div>
            </div>

            {previewReq.reference_websites && previewReq.reference_websites.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase text-[11px]">Reference Sites</h4>
                <ul className="list-disc pl-4 space-y-1">
                  {previewReq.reference_websites.map((rw, i) => (
                    <li key={i}>
                      <a href={rw.url} target="_blank" rel="noreferrer" className="text-blue-500 underline">{rw.url}</a>
                      {rw.notes && <span className="text-slate-400 ml-1">({rw.notes})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRM MODAL ────────────────────────────────────────────── */}
      {deleteConfirmReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#1E1E1E] rounded-xl border border-[#E5E5E5] dark:border-[#383838] p-5 space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-red-500">Delete Requirement Specification?</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to remove <strong>"{deleteConfirmReq.title}"</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmReq(null)}
                className="px-3 py-1.5 rounded-lg border border-[#E5E5E5] dark:border-[#383838] text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteReq(deleteConfirmReq.id)}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── REQUIREMENT FORM MODAL (COMPREHENSIVE SPECS) ─────────────────────────────

function RequirementFormModal({
  open,
  initial,
  clients,
  leads,
  onClose,
  onSave,
}: {
  open: boolean
  initial?: Requirement
  clients: Client[]
  leads: Lead[]
  onClose: () => void
  onSave: (data: Partial<Requirement>) => void
}) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    client_id: initial?.client_id || (clients[0]?.id || ''),
    lead_id: initial?.lead_id || '',
    website_type: initial?.website_type || 'corporate',
    business_purpose: initial?.business_purpose || '',
    pages: initial?.pages || ['Home', 'About Us', 'Services', 'Contact Us'],
    features: initial?.features || ['Contact Form & Lead Capture', 'SEO Optimization & Meta tags'],
    frontend_tech: initial?.frontend_tech || 'React, TypeScript, Tailwind CSS',
    backend_tech: initial?.backend_tech || 'Supabase Edge Functions / Node.js',
    database_tech: initial?.database_tech || 'Supabase PostgreSQL',
    payment_gateway: initial?.payment_gateway || 'None',
    shipping_integration: initial?.shipping_integration || 'None',
    domain_requirements: initial?.domain_requirements || 'Client has existing domain',
    hosting_requirements: initial?.hosting_requirements || 'Vercel Edge Global Network',
    reference_websites: initial?.reference_websites || [{ url: '', notes: '' }],
    design_preferences: initial?.design_preferences || '',
    timeline: initial?.timeline || '4–6 Weeks',
    budget_min: initial?.budget_min ? String(initial.budget_min) : '',
    budget_max: initial?.budget_max ? String(initial.budget_max) : '',
    estimated_delivery_date: initial?.estimated_delivery_date || '',
    additional_notes: initial?.additional_notes || '',
    status: (initial?.status || 'draft') as Requirement['status'],
  })

  const [customPage, setCustomPage] = useState('')
  const [customFeature, setCustomFeature] = useState('')
  const [newRefUrl, setNewRefUrl] = useState('')
  const [newRefNote, setNewRefNote] = useState('')

  if (!open) return null

  const togglePage = (pageName: string) => {
    if (form.pages.includes(pageName)) {
      setForm({ ...form, pages: form.pages.filter(p => p !== pageName) })
    } else {
      setForm({ ...form, pages: [...form.pages, pageName] })
    }
  }

  const addCustomPage = () => {
    if (!customPage.trim()) return
    if (!form.pages.includes(customPage.trim())) {
      setForm({ ...form, pages: [...form.pages, customPage.trim()] })
    }
    setCustomPage('')
  }

  const toggleFeature = (featName: string) => {
    if (form.features.includes(featName)) {
      setForm({ ...form, features: form.features.filter(f => f !== featName) })
    } else {
      setForm({ ...form, features: [...form.features, featName] })
    }
  }

  const addCustomFeature = () => {
    if (!customFeature.trim()) return
    if (!form.features.includes(customFeature.trim())) {
      setForm({ ...form, features: [...form.features, customFeature.trim()] })
    }
    setCustomFeature('')
  }

  const addReferenceWebsite = () => {
    if (!newRefUrl.trim()) return
    setForm({
      ...form,
      reference_websites: [...form.reference_websites.filter(r => r.url), { url: newRefUrl.trim(), notes: newRefNote.trim() }],
    })
    setNewRefUrl('')
    setNewRefNote('')
  }

  const removeReferenceWebsite = (index: number) => {
    setForm({
      ...form,
      reference_websites: form.reference_websites.filter((_, i) => i !== index),
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...form,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      reference_websites: form.reference_websites.filter(r => r.url.trim()),
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
              {initial ? 'Edit Requirement Specification' : 'New Client Requirement Brief'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Comprehensive scope document for frontend, backend, payment gateway, domain, and page structure.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Section 1: Overview */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-slate-500 mb-1">Requirement Title *</label>
              <input
                required
                type="text"
                placeholder="e.g. Modern E-Commerce Platform with WhatsApp Ordering"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Associated Client *</label>
              <select
                required
                value={form.client_id}
                onChange={e => setForm({ ...form, client_id: e.target.value })}
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
              <label className="block text-slate-500 mb-1">Website Type *</label>
              <select
                value={form.website_type}
                onChange={e => setForm({ ...form, website_type: e.target.value })}
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              >
                {WEBSITE_TYPES.map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Specification Status</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="reviewed">Reviewed</option>
                <option value="approved">Approved</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Business Purpose & Objective</label>
            <textarea
              rows={2}
              placeholder="What core business problem does this website solve for the client?"
              value={form.business_purpose}
              onChange={e => setForm({ ...form, business_purpose: e.target.value })}
              className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Section 2: Pages Checklist */}
          <div>
            <label className="block text-slate-500 mb-1.5 font-semibold uppercase text-[11px]">
              Required Website Pages ({form.pages.length} selected)
            </label>
            <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838]">
              {DEFAULT_PAGES.map(page => {
                const active = form.pages.includes(page)
                return (
                  <button
                    type="button"
                    key={page}
                    onClick={() => togglePage(page)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-[#1E1E1E] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#383838]'
                    }`}
                  >
                    {active ? '✓ ' : '+ '}{page}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                placeholder="Add custom page..."
                value={customPage}
                onChange={e => setCustomPage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomPage() } }}
                className="flex-1 px-3 py-1.5 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={addCustomPage}
                className="px-3 py-1.5 bg-slate-200 dark:bg-[#383838] text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold"
              >
                Add Page
              </button>
            </div>
          </div>

          {/* Section 3: Features Checklist */}
          <div>
            <label className="block text-slate-500 mb-1.5 font-semibold uppercase text-[11px]">
              Required Features ({form.features.length} selected)
            </label>
            <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838]">
              {DEFAULT_FEATURES.map(feat => {
                const active = form.features.includes(feat)
                return (
                  <button
                    type="button"
                    key={feat}
                    onClick={() => toggleFeature(feat)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white dark:bg-[#1E1E1E] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#383838]'
                    }`}
                  >
                    {active ? '✓ ' : '+ '}{feat}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                placeholder="Add custom feature requirement..."
                value={customFeature}
                onChange={e => setCustomFeature(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomFeature() } }}
                className="flex-1 px-3 py-1.5 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={addCustomFeature}
                className="px-3 py-1.5 bg-slate-200 dark:bg-[#383838] text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold"
              >
                Add Feature
              </button>
            </div>
          </div>

          {/* Section 4: Technical Specs */}
          <div className="p-3 bg-slate-50 dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-[#383838] space-y-3">
            <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Technical Architecture & Integrations
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 mb-1">Frontend Framework / Styling</label>
                <input
                  type="text"
                  value={form.frontend_tech}
                  onChange={e => setForm({ ...form, frontend_tech: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#1E1E1E] border border-slate-200 dark:border-[#383838] rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Backend / Server-Side APIs</label>
                <input
                  type="text"
                  value={form.backend_tech}
                  onChange={e => setForm({ ...form, backend_tech: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#1E1E1E] border border-slate-200 dark:border-[#383838] rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Database Solution</label>
                <input
                  type="text"
                  value={form.database_tech}
                  onChange={e => setForm({ ...form, database_tech: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#1E1E1E] border border-slate-200 dark:border-[#383838] rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Payment Gateway</label>
                <input
                  type="text"
                  placeholder="Stripe, Razorpay, PayFast, None..."
                  value={form.payment_gateway}
                  onChange={e => setForm({ ...form, payment_gateway: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#1E1E1E] border border-slate-200 dark:border-[#383838] rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Shipping Integration</label>
                <input
                  type="text"
                  placeholder="Shiprocket, Courier Guy, None..."
                  value={form.shipping_integration}
                  onChange={e => setForm({ ...form, shipping_integration: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#1E1E1E] border border-slate-200 dark:border-[#383838] rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Domain Requirements</label>
                <input
                  type="text"
                  placeholder="e.g. CapeSecure to purchase or Client provides"
                  value={form.domain_requirements}
                  onChange={e => setForm({ ...form, domain_requirements: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#1E1E1E] border border-slate-200 dark:border-[#383838] rounded-lg"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-500 mb-1">Hosting & Deployment Target</label>
                <input
                  type="text"
                  placeholder="Vercel Edge, AWS, Cloudflare, CapeSecure Managed..."
                  value={form.hosting_requirements}
                  onChange={e => setForm({ ...form, hosting_requirements: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#1E1E1E] border border-slate-200 dark:border-[#383838] rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Commercials & Dates */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Budget Min (₹)</label>
              <input
                type="number"
                placeholder="25000"
                value={form.budget_min}
                onChange={e => setForm({ ...form, budget_min: e.target.value })}
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Budget Max (₹)</label>
              <input
                type="number"
                placeholder="40000"
                value={form.budget_max}
                onChange={e => setForm({ ...form, budget_max: e.target.value })}
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Estimated Delivery Date</label>
              <input
                type="date"
                value={form.estimated_delivery_date}
                onChange={e => setForm({ ...form, estimated_delivery_date: e.target.value })}
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg"
              />
            </div>
          </div>

          {/* Section 6: Reference Websites */}
          <div>
            <label className="block text-slate-500 mb-1.5 font-semibold uppercase text-[11px]">
              Reference Websites & Benchmarks
            </label>
            <div className="space-y-1.5 mb-2">
              {form.reference_websites.filter(r => r.url).map((ref, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-[#252525] border border-slate-200 dark:border-[#383838]">
                  <div>
                    <span className="font-semibold text-blue-500">{ref.url}</span>
                    {ref.notes && <span className="text-slate-400 ml-2">— {ref.notes}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeReferenceWebsite(idx)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://example.com"
                value={newRefUrl}
                onChange={e => setNewRefUrl(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg"
              />
              <input
                type="text"
                placeholder="What client likes about it..."
                value={newRefNote}
                onChange={e => setNewRefNote(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg"
              />
              <button
                type="button"
                onClick={addReferenceWebsite}
                className="px-3 py-1.5 bg-slate-200 dark:bg-[#383838] rounded-lg font-semibold"
              >
                Add Ref
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Additional Constraints & Notes</label>
            <textarea
              rows={2}
              placeholder="Any specific third-party APIs, legacy integrations, compliance requirements..."
              value={form.additional_notes}
              onChange={e => setForm({ ...form, additional_notes: e.target.value })}
              className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
            />
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
              {initial ? 'Save Specification Changes' : 'Create Requirement Specification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
