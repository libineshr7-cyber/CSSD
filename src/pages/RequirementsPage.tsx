import React, { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Plus, X, FileText, ChevronDown, Check, Link as LinkIcon,
  Calendar, DollarSign, User, Globe, Layers, Clock, Search
} from 'lucide-react'
import { demoClients } from '../data/demoData'

// ─── Types ───────────────────────────────────────────────────────────────────

type RequirementStatus = 'draft' | 'submitted' | 'reviewed' | 'approved'
type WebsiteType = 'brochure' | 'e-commerce' | 'portal' | 'blog' | 'custom'

interface Requirement {
  id: string
  clientId: string
  clientName: string
  title: string
  websiteType: WebsiteType
  pages: string[]
  features: string[]
  designPreferences: string
  referenceUrls: string[]
  timeline: string
  budgetMin: number
  budgetMax: number
  status: RequirementStatus
  createdAt: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_FEATURES = [
  'Contact Form', 'Blog', 'E-Commerce', 'Gallery', 'Booking System',
  'User Login', 'Payment Gateway', 'Admin Panel', 'API Integration', 'SEO Optimization',
]

const WEBSITE_TYPES: WebsiteType[] = ['brochure', 'e-commerce', 'portal', 'blog', 'custom']

const STATUS_TABS: { key: 'all' | RequirementStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'approved', label: 'Approved' },
]

// ─── Mock data ────────────────────────────────────────────────────────────────

const INITIAL_REQUIREMENTS: Requirement[] = [
  {
    id: 'req-001', clientId: 'client-001', clientName: 'Apex Financial',
    title: 'Financial Dashboard Requirements', websiteType: 'portal',
    pages: ['Home', 'Dashboard', 'Reports', 'Settings'],
    features: ['User Login', 'Admin Panel', 'API Integration', 'SEO Optimization'],
    designPreferences: 'Professional, dark theme with blue accents.',
    referenceUrls: ['https://stripe.com/dashboard'],
    timeline: '3 months', budgetMin: 45000, budgetMax: 60000,
    status: 'approved', createdAt: '2026-11-01T08:00:00Z',
  },
  {
    id: 'req-002', clientId: 'client-002', clientName: 'StyleHaus Fashion',
    title: 'E-Commerce Store Spec', websiteType: 'e-commerce',
    pages: ['Home', 'Shop', 'Product Detail', 'Cart', 'Checkout', 'Account'],
    features: ['E-Commerce', 'Payment Gateway', 'User Login', 'SEO Optimization', 'Gallery'],
    designPreferences: 'Minimal, clean look with large product imagery.',
    referenceUrls: ['https://www.asos.com'],
    timeline: '2 months', budgetMin: 25000, budgetMax: 35000,
    status: 'reviewed', createdAt: '2026-10-20T09:00:00Z',
  },
  {
    id: 'req-003', clientId: 'client-003', clientName: 'Horizon Health Clinic',
    title: 'Patient Portal Requirements', websiteType: 'portal',
    pages: ['Home', 'Appointments', 'Records', 'Doctors', 'Telemedicine'],
    features: ['Booking System', 'User Login', 'Admin Panel', 'Contact Form'],
    designPreferences: 'Clean, calming healthcare aesthetic — blues and greens.',
    referenceUrls: [],
    timeline: '4 months', budgetMin: 50000, budgetMax: 70000,
    status: 'submitted', createdAt: '2026-09-10T10:00:00Z',
  },
  {
    id: 'req-004', clientId: 'client-004', clientName: 'Pinnacle Properties',
    title: 'Real Estate Listings Site', websiteType: 'custom',
    pages: ['Home', 'Listings', 'Property Detail', 'Agents', 'Contact'],
    features: ['Gallery', 'Contact Form', 'SEO Optimization', 'API Integration'],
    designPreferences: 'Luxury, premium feel. Dark backgrounds with gold accents.',
    referenceUrls: ['https://www.pam.co.za'],
    timeline: '3 months', budgetMin: 30000, budgetMax: 45000,
    status: 'draft', createdAt: '2026-07-20T08:00:00Z',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusColor(status: RequirementStatus) {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-700'
    case 'submitted': return 'bg-blue-100 text-blue-700'
    case 'reviewed': return 'bg-yellow-100 text-yellow-700'
    case 'approved': return 'bg-green-100 text-green-700'
  }
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-4">
        <FileText className="w-10 h-10 text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-1">
        {filtered ? 'No requirements match this filter' : 'No requirements yet'}
      </h3>
      <p className="text-sm text-gray-500 max-w-xs">
        {filtered
          ? 'Try a different status tab or add a new requirement.'
          : 'Start by clicking "New Requirement" to capture a client\'s website needs.'}
      </p>
    </div>
  )
}

// ─── Requirement Card ─────────────────────────────────────────────────────────

function RequirementCard({ req, onView }: { req: Requirement; onView: (r: Requirement) => void }) {
  return (
    <div
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3 cursor-pointer"
      onClick={() => onView(req)}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-800 leading-tight">{req.title}</h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${statusColor(req.status)}`}>
          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <User className="w-3.5 h-3.5" />
        <span>{req.clientName}</span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Globe className="w-3.5 h-3.5" />
          <span className="capitalize">{req.websiteType}</span>
        </span>
        <span className="flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" />
          {req.pages.length} pages
        </span>
        <span className="flex items-center gap-1">
          <Check className="w-3.5 h-3.5" />
          {req.features.length} features
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="flex items-center gap-1 text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          {req.timeline}
        </span>
        <span className="flex items-center gap-1 text-gray-500">
          <DollarSign className="w-3.5 h-3.5" />
          R{req.budgetMin.toLocaleString()} – R{req.budgetMax.toLocaleString()}
        </span>
      </div>

      <div className="flex items-center gap-1 text-xs text-gray-400 mt-auto pt-2 border-t border-gray-100">
        <Calendar className="w-3.5 h-3.5" />
        {fmt(req.createdAt)}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RequirementsPage() {
  const [requirements, setRequirements] = useState<Requirement[]>(INITIAL_REQUIREMENTS)
  const [activeTab, setActiveTab] = useState<'all' | RequirementStatus>('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  // Form state
  const [form, setForm] = useState({
    clientId: '',
    title: '',
    websiteType: '' as WebsiteType | '',
    pagesInput: '',
    pages: [] as string[],
    features: [] as string[],
    designPreferences: '',
    referenceUrls: [''],
    timeline: '',
    budgetMin: '',
    budgetMax: '',
    status: 'draft' as 'draft' | 'submitted',
  })

  // Filtered list
  const filtered = requirements.filter(r => {
    const matchTab = activeTab === 'all' || r.status === activeTab
    const matchSearch = search === '' ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.clientName.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  // Page chip handling
  function addPageChip() {
    const trimmed = form.pagesInput.trim()
    if (!trimmed) return
    const newPages = trimmed.split(',').map(p => p.trim()).filter(p => p && !form.pages.includes(p))
    setForm(f => ({ ...f, pages: [...f.pages, ...newPages], pagesInput: '' }))
  }

  function removePageChip(page: string) {
    setForm(f => ({ ...f, pages: f.pages.filter(p => p !== page) }))
  }

  function toggleFeature(feature: string) {
    setForm(f => ({
      ...f,
      features: f.features.includes(feature)
        ? f.features.filter(x => x !== feature)
        : [...f.features, feature],
    }))
  }

  function addRefUrl() {
    setForm(f => ({ ...f, referenceUrls: [...f.referenceUrls, ''] }))
  }

  function updateRefUrl(idx: number, val: string) {
    setForm(f => {
      const updated = [...f.referenceUrls]
      updated[idx] = val
      return { ...f, referenceUrls: updated }
    })
  }

  function removeRefUrl(idx: number) {
    setForm(f => ({ ...f, referenceUrls: f.referenceUrls.filter((_, i) => i !== idx) }))
  }

  function resetForm() {
    setForm({
      clientId: '', title: '', websiteType: '', pagesInput: '', pages: [],
      features: [], designPreferences: '', referenceUrls: [''],
      timeline: '', budgetMin: '', budgetMax: '', status: 'draft',
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clientId || !form.title || !form.websiteType) {
      toast.error('Please fill in all required fields.')
      return
    }
    const client = demoClients.find(c => c.id === form.clientId)
    const newReq: Requirement = {
      id: `req-${Date.now()}`,
      clientId: form.clientId,
      clientName: client?.company || client?.name || '',
      title: form.title,
      websiteType: form.websiteType as WebsiteType,
      pages: form.pages,
      features: form.features,
      designPreferences: form.designPreferences,
      referenceUrls: form.referenceUrls.filter(u => u.trim()),
      timeline: form.timeline,
      budgetMin: Number(form.budgetMin) || 0,
      budgetMax: Number(form.budgetMax) || 0,
      status: form.status,
      createdAt: new Date().toISOString(),
    }
    setRequirements(prev => [newReq, ...prev])
    toast.success('Requirement added successfully!')
    setShowModal(false)
    resetForm()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Requirements</h1>
          <p className="text-sm text-gray-500 mt-0.5">Capture and manage client website requirements</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Requirement
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg flex-wrap">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs text-gray-400">
                ({tab.key === 'all' ? requirements.length : requirements.filter(r => r.status === tab.key).length})
              </span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search requirements…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.length === 0
          ? <EmptyState filtered={activeTab !== 'all' || search !== ''} />
          : filtered.map(req => (
            <RequirementCard key={req.id} req={req} onView={() => {}} />
          ))}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">New Requirement</h2>
              <button onClick={() => { setShowModal(false); resetForm() }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Client + Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      value={form.clientId}
                      onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select client…</option>
                      {demoClients.map(c => (
                        <option key={c.id} value={c.id}>{c.company || c.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. E-Commerce Platform Requirements"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Website Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website Type <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select
                    value={form.websiteType}
                    onChange={e => setForm(f => ({ ...f, websiteType: e.target.value as WebsiteType }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select type…</option>
                    {WEBSITE_TYPES.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Pages */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pages</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.pagesInput}
                    onChange={e => setForm(f => ({ ...f, pagesInput: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPageChip() } }}
                    placeholder="Home, About, Contact (comma-separated)"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="button" onClick={addPageChip} className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200">
                    Add
                  </button>
                </div>
                {form.pages.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.pages.map(p => (
                      <span key={p} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                        {p}
                        <button type="button" onClick={() => removePageChip(p)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Features */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_FEATURES.map(feature => (
                    <label key={feature} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.features.includes(feature)}
                        onChange={() => toggleFeature(feature)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {feature}
                    </label>
                  ))}
                </div>
              </div>

              {/* Design Preferences */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Design Preferences</label>
                <textarea
                  value={form.designPreferences}
                  onChange={e => setForm(f => ({ ...f, designPreferences: e.target.value }))}
                  rows={3}
                  placeholder="Describe the visual style, color palette, tone, or reference brand examples…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Reference URLs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference URLs</label>
                {form.referenceUrls.map((url, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        value={url}
                        onChange={e => updateRefUrl(idx, e.target.value)}
                        placeholder="https://example.com"
                        className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {form.referenceUrls.length > 1 && (
                      <button type="button" onClick={() => removeRefUrl(idx)} className="text-gray-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addRefUrl} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add another URL
                </button>
              </div>

              {/* Timeline + Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
                  <input
                    type="text"
                    value={form.timeline}
                    onChange={e => setForm(f => ({ ...f, timeline: e.target.value }))}
                    placeholder="e.g. 3 months"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Min (R)</label>
                  <input
                    type="number"
                    value={form.budgetMin}
                    onChange={e => setForm(f => ({ ...f, budgetMin: e.target.value }))}
                    placeholder="25000"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Max (R)</label>
                  <input
                    type="number"
                    value={form.budgetMax}
                    onChange={e => setForm(f => ({ ...f, budgetMax: e.target.value }))}
                    placeholder="40000"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="flex gap-3">
                  {(['draft', 'submitted'] as const).map(s => (
                    <label key={s} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value={s}
                        checked={form.status === s}
                        onChange={() => setForm(f => ({ ...f, status: s }))}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm() }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Save Requirement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
