import { useState, useMemo } from 'react'
import {
  Plus, Search, Edit2, X, ChevronDown,
  Mail, Phone, MapPin, Building2, User, Users, TrendingUp
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate, getInitials } from '../lib/utils'
import { demoClients, demoPayments } from '../data/demoData'
import type { Client, ClientStatus } from '../types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  name: string
  email: string
  phone: string
  company: string
  address: string
  city: string
  country: string
  status: ClientStatus
  notes: string
}

const EMPTY_FORM: FormData = {
  name: '', email: '', phone: '', company: '',
  address: '', city: '', country: 'South Africa', status: 'active', notes: '',
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ClientStatus, { badge: string; label: string; dot: string }> = {
  active:    { badge: 'bg-green-500/10 text-green-400 border-green-500/20',    dot: 'bg-green-500',   label: 'Active' },
  inactive:  { badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',   dot: 'bg-slate-500',   label: 'Inactive' },
  suspended: { badge: 'bg-red-500/10 text-red-400 border-red-500/20',         dot: 'bg-red-500',     label: 'Suspended' },
  churned:   { badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20', dot: 'bg-orange-500', label: 'Churned' },
}

// ─── Avatar colors ────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-blue-600 text-blue-100',
  'bg-purple-600 text-purple-100',
  'bg-emerald-600 text-emerald-100',
  'bg-orange-600 text-orange-100',
  'bg-pink-600 text-pink-100',
  'bg-cyan-600 text-cyan-100',
]

function getAvatarColor(id: string) {
  const idx = id.charCodeAt(id.length - 1) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

// ─── Form input helpers ───────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

// ─── Modal ────────────────────────────────────────────────────────────────────

function ClientModal({
  open, onClose, onSave, initial, title,
}: {
  open: boolean; onClose: () => void; onSave: (d: FormData) => void; initial: FormData; title: string
}) {
  const [form, setForm] = useState<FormData>(initial)

  if (!open) return null

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) { toast.error('Name and email are required'); return }
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
              <input className={inputCls} value={form.name} onChange={set('name')} placeholder="John Smith" required />
            </FormField>
            <FormField label="Email *">
              <input type="email" className={inputCls} value={form.email} onChange={set('email')} placeholder="john@company.co.za" required />
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

          <FormField label="Address">
            <input className={inputCls} value={form.address} onChange={set('address')} placeholder="12 Main Street" />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="City">
              <input className={inputCls} value={form.city} onChange={set('city')} placeholder="Cape Town" />
            </FormField>
            <FormField label="Country">
              <input className={inputCls} value={form.country} onChange={set('country')} placeholder="South Africa" />
            </FormField>
          </div>

          <FormField label="Status">
            <select className={`${inputCls} cursor-pointer`} value={form.status} onChange={set('status')}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Notes">
            <textarea className={`${inputCls} resize-none`} rows={3} value={form.notes} onChange={set('notes')} placeholder="Additional notes..." />
          </FormField>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 rounded-lg text-sm font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
              Save Client
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Client Card ──────────────────────────────────────────────────────────────

function ClientCard({ client, onEdit, totalRevenue }: { client: Client; onEdit: (c: Client) => void; totalRevenue: number }) {
  const cfg = STATUS_CONFIG[client.status] ?? STATUS_CONFIG.inactive
  const avatarCls = getAvatarColor(client.id)

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors flex flex-col gap-4">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0 ${avatarCls}`}>
            {getInitials(client.name)}
          </div>
          <div>
            <p className="font-semibold text-slate-100 leading-tight">{client.name}</p>
            {client.company && (
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                <Building2 className="w-3 h-3" />
                {client.company}
              </p>
            )}
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.badge} shrink-0`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      {/* Contact info */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Mail className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span className="truncate">{client.email}</span>
        </div>
        {client.phone && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Phone className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span>{client.phone}</span>
          </div>
        )}
        {(client.city || client.country) && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span>{[client.city, client.country].filter(Boolean).join(', ')}</span>
          </div>
        )}
      </div>

      {/* Revenue */}
      {totalRevenue > 0 && (
        <div className="bg-slate-800/50 rounded-xl px-3 py-2.5">
          <p className="text-xs text-slate-500 mb-0.5">Total Revenue</p>
          <p className="text-sm font-semibold text-emerald-400">{formatCurrency(totalRevenue)}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onEdit(client)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-slate-700 hover:border-blue-500/50 hover:text-blue-400 text-slate-400 rounded-lg text-xs font-medium transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Edit
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg text-xs font-medium transition-colors border border-blue-500/20">
          <User className="w-3.5 h-3.5" />
          View Details
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>(demoClients)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [formInitial, setFormInitial] = useState<FormData>(EMPTY_FORM)

  const totalRevenue = useMemo(() =>
    demoPayments.filter(p => p.status === 'received').reduce((sum, p) => sum + p.amount, 0),
    []
  )

  const revenueByClient = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of demoPayments) {
      if (p.status === 'received') map[p.client_id] = (map[p.client_id] ?? 0) + p.amount
    }
    return map
  }, [])

  const stats = useMemo(() => ({
    active: clients.filter(c => c.status === 'active').length,
    inactive: clients.filter(c => c.status !== 'active').length,
    total: clients.length,
  }), [clients])

  const filtered = useMemo(() => clients.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.company ?? '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchStatus
  }), [clients, search, statusFilter])

  const openAdd = () => { setEditClient(null); setFormInitial(EMPTY_FORM); setModalOpen(true) }
  const openEdit = (client: Client) => {
    setEditClient(client)
    setFormInitial({
      name: client.name, email: client.email, phone: client.phone ?? '',
      company: client.company ?? '', address: client.address ?? '',
      city: client.city ?? '', country: client.country ?? 'South Africa',
      status: client.status, notes: client.notes ?? '',
    })
    setModalOpen(true)
  }

  const handleSave = (data: FormData) => {
    if (editClient) {
      setClients(cs => cs.map(c => c.id === editClient.id
        ? { ...c, ...data, phone: data.phone || null, company: data.company || null, address: data.address || null, city: data.city || null, country: data.country || null, notes: data.notes || null, updated_at: new Date().toISOString() }
        : c
      ))
      toast.success('Client updated')
    } else {
      const newClient: Client = {
        id: `client-${Date.now()}`,
        lead_id: null,
        name: data.name, email: data.email,
        phone: data.phone || null, company: data.company || null,
        address: data.address || null, city: data.city || null, country: data.country || null,
        status: data.status, avatar_url: null, notes: data.notes || null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }
      setClients(cs => [newClient, ...cs])
      toast.success('Client added')
    }
    setModalOpen(false)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Clients</h1>
          <p className="text-slate-400 text-sm mt-0.5">{clients.length} clients total</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Active Clients</p>
            <p className="text-2xl font-bold text-slate-100">{stats.active}</p>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-500/10 rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Inactive / Other</p>
            <p className="text-2xl font-bold text-slate-100">{stats.inactive}</p>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Revenue</p>
            <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search clients..."
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
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {/* Client Grid */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl py-20 flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-slate-600" />
          </div>
          <p className="text-slate-400 font-medium">No clients found</p>
          <p className="text-slate-600 text-sm">Try adjusting your filters or add a new client</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              onEdit={openEdit}
              totalRevenue={revenueByClient[client.id] ?? 0}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <ClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={formInitial}
        title={editClient ? 'Edit Client' : 'Add New Client'}
      />
    </div>
  )
}
