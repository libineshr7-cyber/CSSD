import { useState, useMemo, useEffect } from 'react'
import {
  Plus, Search, Edit2, Trash2, X,
  Building2, Mail, Phone, MapPin,
  Calendar, FileText, CheckCircle2,
  Clock, ShieldAlert, Copy, Check, Eye,
  RefreshCw, DollarSign, Briefcase, MessageSquare,
  Users, ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { fetchClientFullHistory, type ClientFullHistory } from '../lib/clientHistory'
import { openPrintableRequirementSummary } from '../lib/pdfGenerator'
import type { Client, ClientStatus, PreferredComm } from '../types/database'

// ─── Constants ───────────────────────────────────────────────────────────────

const BUSINESS_CATEGORIES = [
  'E-Commerce & Retail',
  'Healthcare & Wellness',
  'Real Estate & Construction',
  'Technology & SaaS',
  'Corporate & Professional Services',
  'Finance & Banking',
  'Hospitality & Tourism',
  'Education & Training',
  'Manufacturing & Logistics',
  'Media & Entertainment',
  'Other',
]

const COMM_METHODS: { key: PreferredComm; label: string; icon: any }[] = [
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { key: 'phone', label: 'Phone', icon: Phone },
  { key: 'slack', label: 'Slack', icon: Briefcase },
  { key: 'teams', label: 'MS Teams', icon: Users },
]

const CLIENT_STATUS_STYLES: Record<ClientStatus, { badge: string; dot: string; label: string }> = {
  active:    { badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500', label: 'Active' },
  inactive:  { badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',     dot: 'bg-slate-400',   label: 'Inactive' },
  suspended: { badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',           dot: 'bg-rose-500',    label: 'Suspended' },
  churned:   { badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',       dot: 'bg-amber-500',   label: 'Churned' },
  archived:  { badge: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20',       dot: 'bg-slate-500',   label: 'Archived' },
  completed: { badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',           dot: 'bg-blue-500',    label: 'Completed' },
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)

  // Filters & Pagination
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'id_desc' | 'name_asc' | 'date_desc'>('id_desc')
  const [page, setPage] = useState(1)
  const pageSize = 8

  // Modals & Drawers
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [deleteConfirmClient, setDeleteConfirmClient] = useState<Client | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // 360° History Drawer
  const [activeHistoryClientId, setActiveHistoryClientId] = useState<string | null>(null)
  const [historyData, setHistoryData] = useState<ClientFullHistory | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyTab, setHistoryTab] = useState<'overview' | 'requirements' | 'projects' | 'commercials' | 'documents'>('overview')

  // Load clients from Supabase
  const loadClients = async () => {
    setLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setClients(data as Client[])
      }
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => {
    loadClients()
  }, [])

  // Load 360° History
  const openClientHistory = async (clientId: string) => {
    setActiveHistoryClientId(clientId)
    setLoadingHistory(true)
    setHistoryTab('overview')
    const fullHistory = await fetchClientFullHistory(clientId)
    setHistoryData(fullHistory)
    setLoadingHistory(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(text)
    toast.success(`Copied: ${text}`)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // ─── Filter & Sort ──────────────────────────────────────────────────────────
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (categoryFilter !== 'all' && c.business_category !== categoryFilter) return false

      if (search.trim()) {
        const q = search.toLowerCase()
        const matchCode = (c.client_code || '').toLowerCase().includes(q)
        const matchName = c.name.toLowerCase().includes(q)
        const matchCompany = (c.company || c.business_name || '').toLowerCase().includes(q)
        const matchEmail = c.email.toLowerCase().includes(q)
        const matchPhone = (c.phone || '').toLowerCase().includes(q)
        const matchGstin = (c.gstin || '').toLowerCase().includes(q)
        if (!matchCode && !matchName && !matchCompany && !matchEmail && !matchPhone && !matchGstin) return false
      }
      return true
    }).sort((a, b) => {
      if (sortBy === 'id_desc') return (b.client_code || '').localeCompare(a.client_code || '')
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name)
      if (sortBy === 'date_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return 0
    })
  }, [clients, search, statusFilter, categoryFilter, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize))
  const paginatedClients = filteredClients.slice((page - 1) * pageSize, page * pageSize)

  // ─── Save / Update Client with Duplicate Checking ───────────────────────────
  const handleSaveClient = async (formData: Partial<Client>, isEdit: boolean) => {
    if (!formData.name?.trim() || !formData.email?.trim()) {
      toast.error('Client name and email are required.')
      return
    }

    try {
      if (isEdit && editClient) {
        const updated: Client = {
          ...editClient,
          ...formData,
          updated_at: new Date().toISOString(),
        }

        await (supabase as any)
          .from('clients')
          .update(formData)
          .eq('id', editClient.id)

        setClients(prev => prev.map(c => c.id === editClient.id ? updated : c))
        if (historyData?.client.id === editClient.id) {
          setHistoryData(prev => prev ? { ...prev, client: updated } : null)
        }
        toast.success(`Client ${updated.client_code} updated successfully`)
        setEditClient(null)
      } else {
        // Auto generate client code
        const nextNum = clients.length + 1
        const clientCode = `CS-CLIENT-${String(nextNum).padStart(4, '0')}`

        const newClient: Client = {
          id: `client-${Date.now()}`,
          client_code: clientCode,
          lead_id: null,
          name: formData.name.trim(),
          business_name: formData.business_name || formData.company || formData.name.trim(),
          company: formData.company || formData.business_name || formData.name.trim(),
          business_category: formData.business_category || 'Corporate & Professional Services',
          email: formData.email.trim(),
          phone: formData.phone || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          postal_code: formData.postal_code || null,
          country: formData.country || 'South Africa',
          gstin: formData.gstin || null,
          preferred_comm: formData.preferred_comm || 'email',
          status: formData.status || 'active',
          avatar_url: null,
          notes: formData.notes || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        try {
          const { data } = await (supabase as any)
            .from('clients')
            .insert({
              client_code: newClient.client_code,
              name: newClient.name,
              business_name: newClient.business_name,
              company: newClient.company,
              business_category: newClient.business_category,
              email: newClient.email,
              phone: newClient.phone,
              address: newClient.address,
              city: newClient.city,
              state: newClient.state,
              postal_code: newClient.postal_code,
              country: newClient.country,
              gstin: newClient.gstin,
              preferred_comm: newClient.preferred_comm,
              status: newClient.status,
              notes: newClient.notes,
            })
            .select()
            .single()

          if (data) {
            newClient.id = data.id
            if (data.client_code) newClient.client_code = data.client_code
          }
        } catch (_) {}

        setClients(prev => [newClient, ...prev])
        toast.success(`Client created! ID: ${newClient.client_code}`)
        setCreateModalOpen(false)
      }
    } catch (err: any) {
      toast.error('Failed to save client: ' + err.message)
    }
  }

  const handleDeleteClient = async (clientId: string) => {
    try {
      await (supabase as any)
        .from('clients')
        .delete()
        .eq('id', clientId)

      setClients(prev => prev.filter(c => c.id !== clientId))
      if (activeHistoryClientId === clientId) setActiveHistoryClientId(null)
      toast.success('Client record removed')
      setDeleteConfirmClient(null)
    } catch (_) {
      toast.error('Could not delete client')
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Client Directory & Accounts</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage authorized client accounts, unique client IDs, business categories, and view complete project histories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadClients}
            className="p-1.5 rounded-lg border border-[#E5E5E5] dark:border-[#383838] bg-white dark:bg-[#1E1E1E] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            title="Refresh clients"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3 py-1.5 bg-[#0D99FF] hover:bg-[#0D99FF]/90 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New Client
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 rounded-xl shadow-xs">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">Total Clients</div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">{clients.length}</div>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 rounded-xl shadow-xs">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">Active Accounts</div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {clients.filter(c => c.status === 'active').length}
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 rounded-xl shadow-xs">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">Corporate & Enterprise</div>
          <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
            {clients.filter(c => (c.business_category || '').includes('Corporate') || (c.business_category || '').includes('Finance')).length}
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 rounded-xl shadow-xs">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider">E-Commerce Clients</div>
          <div className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
            {clients.filter(c => (c.business_category || '').includes('E-Commerce')).length}
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-3 bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 rounded-xl space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Client ID (CS-CLIENT-0001), Client name, Business, Email, Phone, GSTIN..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-[#0b101d] border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1.5 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-[#0b101d] border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {BUSINESS_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-[#0b101d] border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="id_desc">Client ID (Newest)</option>
              <option value="name_asc">Client Name (A–Z)</option>
              <option value="date_desc">Creation Date</option>
            </select>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-t border-slate-200/80 dark:border-slate-800/80 pt-2">
          <button
            onClick={() => { setStatusFilter('all'); setPage(1) }}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap text-xs ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Accounts ({clients.length})
          </button>

          {['active', 'inactive', 'suspended', 'completed'].map(st => {
            const count = clients.filter(c => c.status === st).length
            const cfg = CLIENT_STATUS_STYLES[st as ClientStatus] || CLIENT_STATUS_STYLES.active
            return (
              <button
                key={st}
                onClick={() => { setStatusFilter(st); setPage(1) }}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 text-xs ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Clients Table */}
      <div className="table-wrapper">
        {paginatedClients.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">No client accounts found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              No clients match your filter criteria or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Client ID</th>
                  <th>Client & Business</th>
                  <th>Category</th>
                  <th>Contact Info</th>
                  <th>Preferred Comm</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClients.map(client => {
                  const statusStyle = CLIENT_STATUS_STYLES[client.status] || CLIENT_STATUS_STYLES.active
                  const comm = COMM_METHODS.find(m => m.key === client.preferred_comm) || COMM_METHODS[0]
                  const CommIcon = comm.icon

                  return (
                    <tr
                      key={client.id}
                      className="cursor-pointer"
                      onClick={() => openClientHistory(client.id)}
                    >
                      {/* Client ID */}
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {client.client_code || 'CS-CLIENT-XXXX'}
                          </span>
                          <button
                            onClick={() => copyToClipboard(client.client_code || '')}
                            title="Copy Client ID"
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            {copiedId === client.client_code ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Added {formatDate(client.created_at)}
                        </div>
                      </td>

                      {/* Name & Business */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          {client.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {client.business_name || client.company || '—'}
                          {client.gstin && (
                            <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-[#282828] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#383838]">
                              GSTIN: {client.gstin}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Business Category */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-[#282828] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#383838]">
                          {client.business_category || 'General'}
                        </span>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3 px-4">
                        <div className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {client.email}
                        </div>
                        {client.phone && (
                          <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {client.phone}
                          </div>
                        )}
                      </td>

                      {/* Preferred Comm */}
                      <td>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 capitalize">
                          <CommIcon className="w-3 h-3" />
                          <span>{comm.label}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${statusStyle.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                          {statusStyle.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openClientHistory(client.id)}
                            title="View 360° History"
                            className="px-2 py-1 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded text-[11px] font-semibold flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> History
                          </button>

                          <button
                            onClick={() => setEditClient(client)}
                            title="Edit Client"
                            className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmClient(client)}
                            title="Delete Client"
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

        {/* Footer */}
        <div className="py-2.5 px-4 border-t border-[#E5E5E5] dark:border-[#2D2D2D] bg-[#F9FAFB] dark:bg-[#252525] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredClients.length)} of {filteredClients.length} accounts
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

      {/* ─── 360° CLIENT HISTORY DRAWER ───────────────────────────────────────── */}
      {activeHistoryClientId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs" onClick={() => setActiveHistoryClientId(null)}>
          <div
            className="w-full max-w-2xl h-full bg-white dark:bg-[#1E1E1E] border-l border-[#E5E5E5] dark:border-[#2D2D2D] shadow-2xl p-6 overflow-y-auto space-y-6"
            onClick={e => e.stopPropagation()}
          >
            {loadingHistory || !historyData ? (
              <div className="py-24 text-center">
                <RefreshCw className="w-8 h-8 text-[#0D99FF] animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400">Aggregating client lifecycle records...</p>
              </div>
            ) : (
              <>
                {/* Drawer Header */}
                <div className="flex items-start justify-between border-b border-[#E5E5E5] dark:border-[#2D2D2D] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[#0D99FF]/10 text-[#0D99FF]">
                        {historyData.client.client_code}
                      </span>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {historyData.client.name}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {historyData.client.business_name || historyData.client.company} • Category: {historyData.client.business_category}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveHistoryClientId(null)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* KPI Ribbon */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 bg-[#F9FAFB] dark:bg-[#252525] rounded-lg border border-[#E5E5E5] dark:border-[#383838]">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Invoiced</div>
                    <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {formatCurrency(historyData.summary.totalBilled)}
                    </div>
                  </div>
                  <div className="p-3 bg-[#F9FAFB] dark:bg-[#252525] rounded-lg border border-[#E5E5E5] dark:border-[#383838]">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Received</div>
                    <div className="font-bold text-green-500 mt-0.5">
                      {formatCurrency(historyData.summary.totalPaid)}
                    </div>
                  </div>
                  <div className="p-3 bg-[#F9FAFB] dark:bg-[#252525] rounded-lg border border-[#E5E5E5] dark:border-[#383838]">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Outstanding Balance</div>
                    <div className="font-bold text-amber-500 mt-0.5">
                      {formatCurrency(historyData.summary.outstandingBalance)}
                    </div>
                  </div>
                </div>

                {/* History Tabs */}
                <div className="flex border-b border-[#E5E5E5] dark:border-[#2D2D2D] gap-2 text-xs">
                  <button
                    onClick={() => setHistoryTab('overview')}
                    className={`pb-2 px-1 font-semibold border-b-2 transition-colors ${
                      historyTab === 'overview'
                        ? 'border-[#0D99FF] text-[#0D99FF]'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Overview & Origin
                  </button>
                  <button
                    onClick={() => setHistoryTab('requirements')}
                    className={`pb-2 px-1 font-semibold border-b-2 transition-colors ${
                      historyTab === 'requirements'
                        ? 'border-[#0D99FF] text-[#0D99FF]'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Requirements ({historyData.requirements.length})
                  </button>
                  <button
                    onClick={() => setHistoryTab('projects')}
                    className={`pb-2 px-1 font-semibold border-b-2 transition-colors ${
                      historyTab === 'projects'
                        ? 'border-[#0D99FF] text-[#0D99FF]'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Projects ({historyData.projects.length})
                  </button>
                  <button
                    onClick={() => setHistoryTab('commercials')}
                    className={`pb-2 px-1 font-semibold border-b-2 transition-colors ${
                      historyTab === 'commercials'
                        ? 'border-[#0D99FF] text-[#0D99FF]'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Quotes & Invoices
                  </button>
                </div>

                {/* Tab: Overview */}
                {historyTab === 'overview' && (
                  <div className="space-y-4 text-xs">
                    <div className="p-4 bg-[#F9FAFB] dark:bg-[#252525] rounded-xl border border-[#E5E5E5] dark:border-[#383838] space-y-2.5">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
                        Account Profile & Billing Details
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="text-slate-500">Email:</span> {historyData.client.email}</div>
                        <div><span className="text-slate-500">Phone:</span> {historyData.client.phone || '—'}</div>
                        <div><span className="text-slate-500">Address:</span> {historyData.client.address || '—'}</div>
                        <div><span className="text-slate-500">City/Country:</span> {historyData.client.city || '—'}, {historyData.client.country}</div>
                        <div><span className="text-slate-500">GSTIN / Tax ID:</span> {historyData.client.gstin || 'None'}</div>
                        <div><span className="text-slate-500">Preferred Channel:</span> {historyData.client.preferred_comm || 'Email'}</div>
                      </div>
                    </div>

                    {/* Acquisition Lead Origin */}
                    {historyData.lead ? (
                      <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-2">
                        <div className="flex justify-between items-center text-xs font-semibold text-blue-500">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> Acquisition Lead Origin
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Enquired: {formatDate(historyData.lead.created_at)}
                          </span>
                        </div>
                        <div className="text-slate-700 dark:text-slate-300 space-y-1">
                          <p><strong>Enquiry Source:</strong> {historyData.lead.source}</p>
                          <p><strong>Initial Stated Budget:</strong> {historyData.lead.budget ? formatCurrency(historyData.lead.budget) : 'TBD'}</p>
                          {historyData.lead.notes && (
                            <p className="italic text-slate-500 dark:text-slate-400 mt-1">"{historyData.lead.notes}"</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 text-slate-400 bg-slate-50 dark:bg-[#252525] rounded-lg">
                        Direct Client Creation (No lead conversion history)
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Requirements */}
                {historyTab === 'requirements' && (
                  <div className="space-y-3 text-xs">
                    {historyData.requirements.length === 0 ? (
                      <p className="text-slate-400 py-6 text-center">No requirement specifications created yet.</p>
                    ) : (
                      historyData.requirements.map(req => (
                        <div key={req.id} className="p-4 bg-[#F9FAFB] dark:bg-[#252525] rounded-xl border border-[#E5E5E5] dark:border-[#383838] space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-slate-100">{req.title}</h4>
                              <p className="text-slate-500 text-[11px] capitalize">Website Type: {req.website_type.replace('_', ' ')}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase">
                              {req.status}
                            </span>
                          </div>
                          <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E5E5] dark:border-[#383838]">
                            <button
                              onClick={() => openPrintableRequirementSummary({ requirement: req, client: historyData.client, lead: historyData.lead })}
                              className="px-2.5 py-1 bg-[#0D99FF] text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-xs"
                            >
                              <FileText className="w-3 h-3" /> View & Print Summary PDF
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab: Projects */}
                {historyTab === 'projects' && (
                  <div className="space-y-3 text-xs">
                    {historyData.projects.length === 0 ? (
                      <p className="text-slate-400 py-6 text-center">No projects assigned yet.</p>
                    ) : (
                      historyData.projects.map(proj => (
                        <div key={proj.id} className="p-4 bg-[#F9FAFB] dark:bg-[#252525] rounded-xl border border-[#E5E5E5] dark:border-[#383838] space-y-2">
                          <div className="flex justify-between">
                            <h4 className="font-bold text-slate-900 dark:text-slate-100">{proj.name}</h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-500 uppercase">
                              {proj.status}
                            </span>
                          </div>
                          <p className="text-slate-500 text-[11px]">{proj.description}</p>
                          <div className="w-full bg-slate-200 dark:bg-[#383838] h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#0D99FF] h-full" style={{ width: `${proj.progress || 0}%` }} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab: Commercials */}
                {historyTab === 'commercials' && (
                  <div className="space-y-3 text-xs">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">Invoices & Agreements</h4>
                    {historyData.invoices.length === 0 ? (
                      <p className="text-slate-400 py-4">No invoices billed to date.</p>
                    ) : (
                      historyData.invoices.map(inv => (
                        <div key={inv.id} className="p-3 bg-[#F9FAFB] dark:bg-[#252525] rounded-lg border border-[#E5E5E5] dark:border-[#383838] flex justify-between items-center">
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{inv.invoice_number}</div>
                            <div className="text-[10px] text-slate-400">Due: {formatDate(inv.due_date)}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(inv.total)}</div>
                            <span className="text-[10px] font-semibold text-green-500 uppercase">{inv.status}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── CREATE / EDIT CLIENT MODAL ──────────────────────────────────────── */}
      {(createModalOpen || editClient) && (
        <ClientFormModal
          open={createModalOpen || !!editClient}
          initial={editClient || undefined}
          existingClients={clients}
          onClose={() => { setCreateModalOpen(false); setEditClient(null) }}
          onSave={data => handleSaveClient(data, !!editClient)}
        />
      )}

      {/* ─── DELETE CLIENT CONFIRMATION MODAL ─────────────────────────────────── */}
      {deleteConfirmClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#1E1E1E] rounded-xl border border-[#E5E5E5] dark:border-[#383838] p-5 space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-red-500 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Delete Client Record?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Are you sure you want to remove client <strong>{deleteConfirmClient.client_code} - {deleteConfirmClient.name}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmClient(null)}
                className="px-3 py-1.5 rounded-lg border border-[#E5E5E5] dark:border-[#383838] text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteClient(deleteConfirmClient.id)}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Delete Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CLIENT FORM MODAL (WITH DUPLICATE WARNING) ───────────────────────────────

function ClientFormModal({
  open,
  initial,
  existingClients,
  onClose,
  onSave,
}: {
  open: boolean
  initial?: Client
  existingClients: Client[]
  onClose: () => void
  onSave: (data: Partial<Client>) => void
}) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    business_name: initial?.business_name || initial?.company || '',
    business_category: initial?.business_category || 'Corporate & Professional Services',
    email: initial?.email || '',
    phone: initial?.phone || '',
    address: initial?.address || '',
    city: initial?.city || '',
    state: initial?.state || '',
    postal_code: initial?.postal_code || '',
    country: initial?.country || 'India',
    gstin: initial?.gstin || '',
    preferred_comm: (initial?.preferred_comm || 'email') as PreferredComm,
    status: (initial?.status || 'active') as ClientStatus,
    notes: initial?.notes || '',
  })

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [allowDuplicateBypass, setAllowDuplicateBypass] = useState(false)

  if (!open) return null

  // Live duplicate checking
  const checkDuplicate = (email: string, phone: string, gstin: string) => {
    const cleanEmail = email.trim().toLowerCase()
    const cleanPhone = phone.trim().replace(/[\s-]/g, '')
    const cleanGstin = gstin.trim().toUpperCase()

    const match = existingClients.find(c => {
      if (initial && c.id === initial.id) return false
      if (cleanEmail && c.email.toLowerCase() === cleanEmail) return true
      if (cleanPhone && c.phone && c.phone.replace(/[\s-]/g, '') === cleanPhone) return true
      if (cleanGstin && c.gstin && c.gstin.toUpperCase() === cleanGstin) return true
      return false
    })

    if (match) {
      setDuplicateWarning(
        `Warning: A client record with matching contact details already exists (${match.client_code} - ${match.name}).`
      )
    } else {
      setDuplicateWarning(null)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (duplicateWarning && !allowDuplicateBypass) {
      toast.error('Please acknowledge the duplicate record warning before submitting.')
      return
    }
    onSave({
      ...form,
      company: form.business_name,
      phone: form.phone || null,
      address: form.address || null,
      gstin: form.gstin || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-white dark:bg-[#1E1E1E] rounded-xl border border-[#E5E5E5] dark:border-[#383838] p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#2D2D2D] pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {initial ? `Edit Client: ${initial.client_code}` : 'Register New Client Account'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Client IDs are automatically assigned in sequential format (CS-CLIENT-XXXX).
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Duplicate Warning Box */}
        {duplicateWarning && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-500 space-y-2">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{duplicateWarning}</div>
            </div>
            <label className="flex items-center gap-2 text-[11px] cursor-pointer pt-1 font-medium">
              <input
                type="checkbox"
                checked={allowDuplicateBypass}
                onChange={e => setAllowDuplicateBypass(e.target.checked)}
                className="rounded border-amber-500 text-amber-500"
              />
              Confirm and proceed with record creation anyway
            </label>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Client Contact Name *</label>
              <input
                required
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. David Chen"
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Business / Company Name *</label>
              <input
                required
                type="text"
                value={form.business_name}
                onChange={e => setForm({ ...form, business_name: e.target.value })}
                placeholder="e.g. Apex Financial Pty Ltd"
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Business Category *</label>
              <select
                value={form.business_category}
                onChange={e => setForm({ ...form, business_category: e.target.value })}
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              >
                {BUSINESS_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Preferred Communication</label>
              <select
                value={form.preferred_comm}
                onChange={e => setForm({ ...form, preferred_comm: e.target.value as any })}
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              >
                {COMM_METHODS.map(m => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Email Address *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={e => {
                  setForm({ ...form, email: e.target.value })
                  checkDuplicate(e.target.value, form.phone, form.gstin)
                }}
                placeholder="client@example.com"
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Phone Number</label>
              <input
                type="text"
                value={form.phone}
                onChange={e => {
                  setForm({ ...form, phone: e.target.value })
                  checkDuplicate(form.email, e.target.value, form.gstin)
                }}
                placeholder="+27 76 234 5678"
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-slate-500 mb-1">Street Address</label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="12 Buitenkant St"
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">GSTIN / Tax Registration</label>
              <input
                type="text"
                value={form.gstin}
                onChange={e => {
                  setForm({ ...form, gstin: e.target.value })
                  checkDuplicate(form.email, form.phone, e.target.value)
                }}
                placeholder="27AADCB2234P1Z8"
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100 uppercase"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Country</label>
              <input
                type="text"
                value={form.country}
                onChange={e => setForm({ ...form, country: e.target.value })}
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Client Status</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Internal Notes & History</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. VIP client, preferred contract terms..."
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
              {initial ? 'Save Client Changes' : 'Create Client Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
