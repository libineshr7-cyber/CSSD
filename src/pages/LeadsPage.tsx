import { useState, useMemo } from 'react'
import {
  Plus, Search, Edit2, Trash2, X, ChevronDown,
  User, Building2, Mail, Phone, DollarSign, Calendar, FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate } from '../lib/utils'
import { demoLeads } from '../data/demoData'
import type { Lead, LeadStatus, LeadSource } from '../types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  name: string
  email: string
  phone: string
  company: string
  status: LeadStatus
  source: LeadSource
  budget: string
  notes: string
  next_follow_up: string
}

const EMPTY_FORM: FormData = {
  name: '', email: '', phone: '', company: '',
  status: 'new', source: 'website', budget: '', notes: '', next_follow_up: '',
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<LeadStatus, { dot: string; badge: string; label: string }> = {
  new:        { dot: 'bg-blue-500',   badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',    label: 'New' },
  contacted:  { dot: 'bg-yellow-500', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: 'Contacted' },
  qualified:  { dot: 'bg-purple-500', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20', label: 'Qualified' },
  proposal:   { dot: 'bg-orange-500', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20', label: 'Proposal' },
  negotiation:{ dot: 'bg-pink-500',   badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20',     label: 'Negotiation' },
  won:        { dot: 'bg-green-500',  badge: 'bg-green-500/10 text-green-400 border-green-500/20',   label: 'Won' },
  lost:       { dot: 'bg-slate-500',  badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',   label: 'Lost' },
}

const SOURCE_STYLES: Record<LeadSource, { badge: string; label: string }> = {
  website:   { badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',       label: 'Website' },
  referral:  { badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Referral' },
  social:    { badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', label: 'Social' },
  cold_call: { badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',       label: 'Cold Call' },
  email:     { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',    label: 'Email' },
  event:     { badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20', label: 'Event' },
  other:     { badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',    label: 'Other' },
  instagram: { badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20',       label: 'Instagram' },
} as Record<string, { badge: string; label: string }>

function StatusBadge({ status }: { status: LeadStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.new
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function SourceBadge({ source }: { source: string }) {
  const s = SOURCE_STYLES[source as LeadSource] ?? SOURCE_STYLES.other
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${s.badge}`}>
      {s.label}
    </span>
  )
}

// ─── Input component ──────────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
const selectCls = `${inputCls} cursor-pointer`

// ─── Modal ────────────────────────────────────────────────────────────────────

function LeadModal({
  open,
  onClose,
  onSave,
  initial,
  title,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: FormData) => void
  initial: FormData
  title: string
}) {
  const [form, setForm] = useState<FormData>(initial)

  if (!open) return null

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required')
      return
    }
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Full Name *">
              <input className={inputCls} value={form.name} onChange={set('name')} placeholder="Jane Smith" required />
            </FormField>
            <FormField label="Email *">
              <input type="email" className={inputCls} value={form.email} onChange={set('email')} placeholder="jane@company.co.za" required />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Phone">
              <input className={inputCls} value={form.phone} onChange={set('phone')} placeholder="+27 82 000 0000" />
            </FormField>
            <FormField label="Company">
              <input className={inputCls} value={form.company} onChange={set('company')} placeholder="Acme Pty Ltd" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Status">
              <select className={selectCls} value={form.status} onChange={set('status')}>
                {Object.entries(STATUS_STYLES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Source">
              <select className={selectCls} value={form.source} onChange={set('source')}>
                {Object.entries(SOURCE_STYLES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Budget (ZAR)">
              <input type="number" className={inputCls} value={form.budget} onChange={set('budget')} placeholder="25000" min="0" />
            </FormField>
            <FormField label="Next Follow-up">
              <input type="datetime-local" className={inputCls} value={form.next_follow_up} onChange={set('next_follow_up')} />
            </FormField>
          </div>

          <FormField label="Notes">
            <textarea className={`${inputCls} resize-none`} rows={3} value={form.notes} onChange={set('notes')} placeholder="Additional notes..." />
          </FormField>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 rounded-lg text-sm font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
              Save Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(demoLeads)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [formInitial, setFormInitial] = useState<FormData>(EMPTY_FORM)

  // Stats
  const stats = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const lead of leads) counts[lead.status] = (counts[lead.status] ?? 0) + 1
    return counts
  }, [leads])

  // Filtered
  const filtered = useMemo(() => leads.filter(l => {
    const q = search.toLowerCase()
    const matchSearch = !q || l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || (l.company ?? '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    const matchSource = sourceFilter === 'all' || l.source === sourceFilter
    return matchSearch && matchStatus && matchSource
  }), [leads, search, statusFilter, sourceFilter])

  const openAdd = () => {
    setEditLead(null)
    setFormInitial(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (lead: Lead) => {
    setEditLead(lead)
    setFormInitial({
      name: lead.name,
      email: lead.email,
      phone: lead.phone ?? '',
      company: lead.company ?? '',
      status: lead.status,
      source: lead.source,
      budget: lead.budget?.toString() ?? '',
      notes: lead.notes ?? '',
      next_follow_up: lead.next_follow_up?.slice(0, 16) ?? '',
    })
    setModalOpen(true)
  }

  const handleSave = (data: FormData) => {
    if (editLead) {
      setLeads(ls => ls.map(l => l.id === editLead.id
        ? { ...l, ...data, budget: data.budget ? Number(data.budget) : null, phone: data.phone || null, company: data.company || null, notes: data.notes || null, next_follow_up: data.next_follow_up ? new Date(data.next_follow_up).toISOString() : null, updated_at: new Date().toISOString() }
        : l
      ))
      toast.success('Lead updated')
    } else {
      const newLead: Lead = {
        id: `lead-${Date.now()}`,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        company: data.company || null,
        status: data.status,
        source: data.source,
        budget: data.budget ? Number(data.budget) : null,
        notes: data.notes || null,
        assigned_to: null,
        next_follow_up: data.next_follow_up ? new Date(data.next_follow_up).toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setLeads(ls => [newLead, ...ls])
      toast.success('Lead added')
    }
    setModalOpen(false)
  }

  const handleDelete = (id: string) => {
    setLeads(ls => ls.filter(l => l.id !== id))
    toast.success('Lead deleted')
  }

  const STAT_CARDS = [
    { label: 'New',        key: 'new',        dot: 'bg-blue-500' },
    { label: 'Contacted',  key: 'contacted',  dot: 'bg-yellow-500' },
    { label: 'Qualified',  key: 'qualified',  dot: 'bg-purple-500' },
    { label: 'Proposal',   key: 'proposal',   dot: 'bg-orange-500' },
    { label: 'Won',        key: 'won',        dot: 'bg-green-500' },
    { label: 'Lost',       key: 'lost',       dot: 'bg-slate-500' },
  ]

  const uniqueSources = Array.from(new Set(leads.map(l => l.source)))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Leads Pipeline</h1>
          <p className="text-slate-400 text-sm mt-0.5">{leads.length} leads total</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          Add Lead
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {STAT_CARDS.map(({ label, key, dot }) => (
          <div key={key} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              <span className="text-xs text-slate-400 font-medium">{label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-100">{stats[key] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="relative">
          <select
            className="appearance-none pl-3 pr-8 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_STYLES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            className="appearance-none pl-3 pr-8 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
          >
            <option value="all">All Sources</option>
            {uniqueSources.map(s => (
              <option key={s} value={s}>{SOURCE_STYLES[s as LeadSource]?.label ?? s}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {['Name / Email', 'Company', 'Status', 'Source', 'Budget', 'Next Follow-up', 'Created', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-slate-600" />
                      </div>
                      <p className="text-slate-400 font-medium">No leads found</p>
                      <p className="text-slate-600 text-sm">Try adjusting your filters or add a new lead</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-800/50 transition-colors group">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-blue-400">
                            {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{lead.name}</p>
                          <p className="text-xs text-slate-500">{lead.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-slate-400">
                        <Building2 className="w-3.5 h-3.5 text-slate-600" />
                        {lead.company ?? '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <SourceBadge source={lead.source} />
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-300 whitespace-nowrap">
                      {lead.budget ? formatCurrency(lead.budget) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-400 whitespace-nowrap">
                      {formatDate(lead.next_follow_up)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(lead)}
                          className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500">
            Showing {filtered.length} of {leads.length} leads
          </div>
        )}
      </div>

      {/* Modal */}
      <LeadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={formInitial}
        title={editLead ? 'Edit Lead' : 'Add New Lead'}
      />
    </div>
  )
}
