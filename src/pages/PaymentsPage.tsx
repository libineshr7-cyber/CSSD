import { useState, useMemo, useEffect } from 'react'
import {
  CreditCard, Plus, Eye, Edit2, Search, Filter,
  TrendingUp, Clock, AlertTriangle, X, Upload, RefreshCw, Download
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { downloadReceiptPDF } from '../lib/pdfGenerator'
import type { Payment, Client, Project } from '../types/database'

// ─── Badges ───────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  received: 'bg-green-500/20 text-green-400 border border-green-500/30',
  pending: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  failed: 'bg-red-500/20 text-red-400 border border-red-500/30',
  refunded: 'bg-slate-700/50 text-slate-400 border border-slate-600',
}

const TYPE_BADGE: Record<string, string> = {
  advance: 'bg-blue-500/20 text-blue-400',
  milestone: 'bg-purple-500/20 text-purple-400',
  final: 'bg-green-500/20 text-green-400',
  maintenance: 'bg-teal-500/20 text-teal-400',
  other: 'bg-slate-700/50 text-slate-400',
}

const TYPE_LABEL: Record<string, string> = {
  advance: 'Advance', milestone: 'Milestone', final: 'Final',
  maintenance: 'Maintenance', other: 'Other',
}

const METHOD_LABEL: Record<string, string> = {
  bank_transfer: 'Bank Transfer', card: 'Card', cash: 'Cash',
  eft: 'EFT', other: 'Other',
}

// ─── Default form ─────────────────────────────────────────────────────────────

interface PaymentForm {
  client_id: string
  project_id: string
  reference: string
  amount: string
  payment_type: string
  payment_method: string
  received_date: string
  notes: string
}

const defaultForm = (): PaymentForm => ({
  client_id: '', project_id: '', reference: '',
  amount: '', payment_type: 'advance', payment_method: 'bank_transfer',
  received_date: new Date().toISOString().slice(0, 10), notes: '',
})

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PaymentForm>(defaultForm())
  const [viewPayment, setViewPayment] = useState<Payment | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [
        { data: payData },
        { data: cData },
        { data: prData },
      ] = await Promise.all([
        (supabase as any).from('payments').select('*').order('created_at', { ascending: false }),
        (supabase as any).from('clients').select('*').order('name', { ascending: true }),
        (supabase as any).from('projects').select('*').order('name', { ascending: true }),
      ])
      if (payData) setPayments(payData)
      if (cData) setClients(cData)
      if (prData) setProjects(prData)
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients])
  const projectMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects])

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const received = payments.filter(p => p.status === 'received')
    const pending = payments.filter(p => p.status === 'pending')
    const failed = payments.filter(p => p.status === 'failed')
    const sum = (arr: Payment[]) => arr.reduce((a, b) => a + (Number(b.amount) || 0), 0)
    return { received, pending, failed, sum }
  }, [payments])

  const totalReceived = stats.sum(stats.received)

  // ─── Filter ─────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return payments.filter(p => {
      const client = clientMap[p.client_id]
      const project = projectMap[p.project_id || '']
      const matchSearch =
        p.reference.toLowerCase().includes(search.toLowerCase()) ||
        (client?.business_name ?? client?.company ?? client?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (project?.name ?? '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || p.status === statusFilter
      const matchType = typeFilter === 'all' || p.payment_type === typeFilter
      const pDate = p.received_date ? new Date(p.received_date) : null
      const matchFrom = !dateFrom || (pDate && pDate >= new Date(dateFrom))
      const matchTo = !dateTo || (pDate && pDate <= new Date(dateTo))
      return matchSearch && matchStatus && matchType && matchFrom && matchTo
    })
  }, [payments, search, statusFilter, typeFilter, dateFrom, dateTo, clientMap, projectMap])

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  const openCreate = () => { setForm(defaultForm()); setEditingId(null); setShowModal(true) }

  const openEdit = (p: Payment) => {
    setForm({
      client_id: p.client_id,
      project_id: p.project_id ?? '',
      reference: p.reference,
      amount: String(p.amount),
      payment_type: p.payment_type,
      payment_method: p.payment_method,
      received_date: p.received_date ? p.received_date.slice(0, 10) : '',
      notes: p.notes ?? '',
    })
    setEditingId(p.id)
    setShowModal(true)
  }

  const savePayment = async () => {
    if (!form.client_id) return toast.error('Please select a client')
    if (!form.reference.trim()) return toast.error('Please enter a reference')
    if (!form.amount || isNaN(Number(form.amount))) return toast.error('Please enter a valid amount')

    const now = new Date().toISOString()

    if (editingId) {
      const updated: Partial<Payment> = {
        client_id: form.client_id,
        project_id: form.project_id || null,
        reference: form.reference,
        amount: Number(form.amount),
        payment_type: form.payment_type as Payment['payment_type'],
        payment_method: form.payment_method as Payment['payment_method'],
        received_date: form.received_date ? new Date(form.received_date).toISOString() : null,
        notes: form.notes || null,
        updated_at: now,
      }

      try {
        await (supabase as any).from('payments').update(updated).eq('id', editingId)
      } catch (_) {}

      setPayments(prev => prev.map(p => p.id === editingId ? { ...p, ...updated } : p))
      toast.success('Payment updated')
    } else {
      const newP: Payment = {
        id: `pay-${Date.now()}`,
        client_id: form.client_id,
        project_id: form.project_id || null,
        invoice_id: null,
        agreement_id: null,
        reference: form.reference,
        amount: Number(form.amount),
        currency: 'INR',
        payment_type: form.payment_type as Payment['payment_type'],
        payment_method: form.payment_method as Payment['payment_method'],
        status: 'received',
        received_date: form.received_date ? new Date(form.received_date).toISOString() : null,
        notes: form.notes || null,
        proof_url: null,
        created_at: now,
        updated_at: now,
      }

      try {
        await (supabase as any).from('payments').insert([newP])
      } catch (_) {}

      setPayments(prev => [newP, ...prev])
      toast.success('Payment recorded')
    }
    setShowModal(false)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Payments</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Total received: <span className="text-green-400 font-semibold">{formatCurrency(totalReceived)}</span>
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Received', data: stats.received, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Pending', data: stats.pending, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Failed', data: stats.failed, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
        ].map(({ label, data, icon: Icon, color, bg }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <span className="text-slate-400 text-sm">{label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-100">{data.length}</p>
            <p className={`text-sm font-medium mt-0.5 ${color}`}>{formatCurrency(stats.sum(data))}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search payments..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="received">Received</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="To date"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="text-left px-4 py-3 font-medium">Reference</th>
                <th className="text-left px-4 py-3 font-medium">Client</th>
                <th className="text-left px-4 py-3 font-medium">Project</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Method</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Date Received</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500">No payments found</td>
                </tr>
              ) : filtered.map(p => {
                const client = clients.find(c => c.id === p.client_id)
                const project = projects.find(pr => pr.id === p.project_id)
                return (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-blue-400 font-medium">{p.reference}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-200 font-medium">{client?.business_name ?? client?.company ?? client?.name ?? '—'}</div>
                      <div className="text-slate-500 text-xs">{client?.name}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{project?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-100">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[p.payment_type] ?? TYPE_BADGE.other}`}>
                        {TYPE_LABEL[p.payment_type] ?? p.payment_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{METHOD_LABEL[p.payment_method] ?? p.payment_method}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[p.status] ?? STATUS_BADGE.pending}`}>
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(p.received_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => downloadReceiptPDF(p, client)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          title="Download PDF Receipt"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewPayment(p)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="View receipt"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {viewPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewPayment(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-100">{viewPayment.reference}</h2>
                <p className="text-slate-400 text-sm">Payment Receipt</p>
              </div>
              <button onClick={() => setViewPayment(null)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              {[
                ['Client', clients.find(c => c.id === viewPayment.client_id)?.business_name ?? clients.find(c => c.id === viewPayment.client_id)?.company ?? clients.find(c => c.id === viewPayment.client_id)?.name ?? '—'],
                ['Project', projects.find(pr => pr.id === viewPayment.project_id)?.name ?? '—'],
                ['Amount', formatCurrency(viewPayment.amount)],
                ['Type', TYPE_LABEL[viewPayment.payment_type] ?? viewPayment.payment_type],
                ['Method', METHOD_LABEL[viewPayment.payment_method] ?? viewPayment.payment_method],
                ['Status', viewPayment.status.charAt(0).toUpperCase() + viewPayment.status.slice(1)],
                ['Date Received', formatDate(viewPayment.received_date)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-slate-200 font-medium">{value}</span>
                </div>
              ))}
              {viewPayment.notes && (
                <div className="bg-slate-800/60 rounded-xl p-3 mt-2">
                  <p className="text-slate-500 text-xs font-medium mb-1">Notes</p>
                  <p className="text-slate-300">{viewPayment.notes}</p>
                </div>
              )}
              <div className="pt-2">
                <button
                  onClick={() => downloadReceiptPDF(viewPayment, clients.find(c => c.id === viewPayment.client_id))}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" /> Download PDF Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-lg font-bold text-slate-100">{editingId ? 'Edit Payment' : 'Record Payment'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Client *</label>
                  <select
                    value={form.client_id}
                    onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.business_name || c.company || c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Project</label>
                  <select
                    value={form.project_id}
                    onChange={e => setForm(p => ({ ...p, project_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None</option>
                    {projects.map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Reference *</label>
                  <input
                    value={form.reference}
                    onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
                    placeholder="PAY-2026-XXX"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Amount (₹) *</label>
                  <input
                    type="number"
                    min={0}
                    value={form.amount}
                    onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Payment Type</label>
                  <select
                    value={form.payment_type}
                    onChange={e => setForm(p => ({ ...p, payment_type: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Payment Method</label>
                  <select
                    value={form.payment_method}
                    onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Date Received</label>
                <input
                  type="date"
                  value={form.received_date}
                  onChange={e => setForm(p => ({ ...p, received_date: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="Additional notes..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              {/* Proof Upload (UI only) */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Proof of Payment</label>
                <label className="flex items-center gap-2 px-3 py-2.5 bg-slate-800 border border-dashed border-slate-600 rounded-xl text-slate-500 text-sm cursor-pointer hover:border-blue-500 hover:text-slate-300 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Click to upload proof</span>
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={() => toast('File upload requires Supabase connection', { icon: '📎' })} />
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
              <button
                onClick={savePayment}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                {editingId ? 'Update Payment' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
