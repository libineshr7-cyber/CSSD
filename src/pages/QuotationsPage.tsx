import { useState, useMemo } from 'react'
import {
  FileText, Plus, Eye, Edit2, Download, Trash2, X, Search,
  CheckCircle, Clock, Send, XCircle, TrendingUp
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate } from '../lib/utils'
import { demoQuotations, demoClients } from '../data/demoData'
import type { Quotation } from '../types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuoteItem {
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface QuoteForm {
  client_id: string
  title: string
  items: QuoteItem[]
  discount: number
  tax_rate: number
  valid_until: string
  notes: string
}

// ─── Status Helpers ───────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-slate-800 text-slate-300 border border-slate-700',
  sent: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  viewed: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  accepted: 'bg-green-500/20 text-green-400 border border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border border-red-500/30',
  expired: 'bg-slate-700/50 text-slate-400 border border-slate-600',
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', sent: 'Sent', viewed: 'Viewed',
  accepted: 'Accepted', rejected: 'Rejected', expired: 'Expired',
}

// ─── Default form ─────────────────────────────────────────────────────────────

const defaultItem = (): QuoteItem => ({ description: '', quantity: 1, unit_price: 0, total: 0 })

const defaultForm = (): QuoteForm => ({
  client_id: '',
  title: '',
  items: [defaultItem()],
  discount: 0,
  tax_rate: 15,
  valid_until: '',
  notes: '',
})

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>(demoQuotations)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<QuoteForm>(defaultForm())
  const [viewQuote, setViewQuote] = useState<Quotation | null>(null)

  // ─── Derived stats ──────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const draft = quotations.filter(q => q.status === 'draft')
    const sent = quotations.filter(q => q.status === 'sent' || q.status === 'viewed')
    const accepted = quotations.filter(q => q.status === 'accepted')
    const rejected = quotations.filter(q => q.status === 'rejected' || q.status === 'expired')
    const sum = (arr: Quotation[]) => arr.reduce((a, b) => a + b.total, 0)
    return { draft, sent, accepted, rejected, sum }
  }, [quotations])

  const filtered = useMemo(() => {
    return quotations.filter(q => {
      const client = demoClients.find(c => c.id === q.client_id)
      const matchSearch =
        q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
        q.title.toLowerCase().includes(search.toLowerCase()) ||
        (client?.company ?? '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || q.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [quotations, search, statusFilter])

  // ─── Form calc ──────────────────────────────────────────────────────────────

  const calcTotals = (items: QuoteItem[], discount: number, taxRate: number) => {
    const subtotal = items.reduce((a, i) => a + i.total, 0)
    const taxable = Math.max(0, subtotal - discount)
    const taxAmount = taxable * (taxRate / 100)
    const grand = taxable + taxAmount
    return { subtotal, taxAmount, grand }
  }

  const { subtotal, taxAmount, grand } = calcTotals(form.items, form.discount, form.tax_rate)

  const updateItem = (idx: number, field: keyof QuoteItem, value: string | number) => {
    setForm(prev => {
      const items = prev.items.map((item, i) => {
        if (i !== idx) return item
        const updated = { ...item, [field]: value }
        updated.total = updated.quantity * updated.unit_price
        return updated
      })
      return { ...prev, items }
    })
  }

  const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, defaultItem()] }))
  const removeItem = (idx: number) => setForm(prev => ({
    ...prev, items: prev.items.filter((_, i) => i !== idx)
  }))

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  const openCreate = () => { setForm(defaultForm()); setEditingId(null); setShowModal(true) }

  const openEdit = (q: Quotation) => {
    setForm({
      client_id: q.client_id,
      title: q.title,
      items: q.items.map(i => ({ ...i })),
      discount: q.discount,
      tax_rate: q.tax_rate,
      valid_until: q.valid_until ? q.valid_until.slice(0, 10) : '',
      notes: q.notes ?? '',
    })
    setEditingId(q.id)
    setShowModal(true)
  }

  const saveQuotation = (sendNow: boolean) => {
    if (!form.client_id) return toast.error('Please select a client')
    if (!form.title.trim()) return toast.error('Please enter a title')
    if (form.items.some(i => !i.description.trim())) return toast.error('All items need a description')

    const { subtotal: sub, taxAmount: tax, grand: total } = calcTotals(form.items, form.discount, form.tax_rate)
    const now = new Date().toISOString()

    if (editingId) {
      setQuotations(prev => prev.map(q => q.id === editingId ? {
        ...q,
        client_id: form.client_id,
        title: form.title,
        items: form.items,
        subtotal: sub,
        discount: form.discount,
        tax_rate: form.tax_rate,
        tax_amount: tax,
        total,
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : q.valid_until,
        notes: form.notes || null,
        status: sendNow ? 'sent' : q.status,
        sent_at: sendNow && !q.sent_at ? now : q.sent_at,
        updated_at: now,
      } : q))
      toast.success(sendNow ? 'Quotation updated and sent!' : 'Quotation updated')
    } else {
      const idx = quotations.length + 1
      const newQ: Quotation = {
        id: `quot-${Date.now()}`,
        client_id: form.client_id,
        requirement_id: null,
        quote_number: `QT-2026-${String(idx + 2).padStart(3, '0')}`,
        title: form.title,
        items: form.items,
        subtotal: sub,
        discount: form.discount,
        tax_rate: form.tax_rate,
        tax_amount: tax,
        total,
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString(),
        notes: form.notes || null,
        status: sendNow ? 'sent' : 'draft',
        sent_at: sendNow ? now : null,
        accepted_at: null,
        created_at: now,
        updated_at: now,
      }
      setQuotations(prev => [newQ, ...prev])
      toast.success(sendNow ? 'Quotation created and sent!' : 'Quotation saved as draft')
    }
    setShowModal(false)
  }

  const deleteQuotation = (id: string) => {
    setQuotations(prev => prev.filter(q => q.id !== id))
    toast.success('Quotation deleted')
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Quotations</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {quotations.length} quotations · Total value {formatCurrency(quotations.reduce((a, q) => a + q.total, 0))}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Quotation
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Draft', items: stats.draft, icon: FileText, color: 'text-slate-400', bg: 'bg-slate-800' },
          { label: 'Sent', items: stats.sent, icon: Send, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Accepted', items: stats.accepted, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Rejected / Expired', items: stats.rejected, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
        ].map(({ label, items, icon: Icon, color, bg }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <span className="text-slate-400 text-sm">{label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-100">{items.length}</p>
            <p className={`text-sm font-medium mt-0.5 ${color}`}>{formatCurrency(stats.sum(items))}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search quotations..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          {Object.keys(STATUS_LABEL).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="text-left px-4 py-3 font-medium">Quote #</th>
                <th className="text-left px-4 py-3 font-medium">Client</th>
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Valid Until</th>
                <th className="text-left px-4 py-3 font-medium">Sent Date</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    No quotations found
                  </td>
                </tr>
              ) : filtered.map(q => {
                const client = demoClients.find(c => c.id === q.client_id)
                return (
                  <tr key={q.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-blue-400 font-medium">{q.quote_number}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-200 font-medium">{client?.company ?? '—'}</div>
                      <div className="text-slate-500 text-xs">{client?.name}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 max-w-[200px] truncate">{q.title}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-100">{formatCurrency(q.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[q.status] ?? STATUS_BADGE.draft}`}>
                        {STATUS_LABEL[q.status] ?? q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(q.valid_until)}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(q.sent_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewQuote(q)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(q)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toast('PDF generation requires Supabase connection', { icon: '📄' })}
                          className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteQuotation(q.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
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
      {viewQuote && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewQuote(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-100">{viewQuote.quote_number}</h2>
                <p className="text-slate-400 text-sm">{viewQuote.title}</p>
              </div>
              <button onClick={() => setViewQuote(null)} className="text-slate-400 hover:text-slate-200 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Client</span>
                  <p className="text-slate-200 font-medium">{demoClients.find(c => c.id === viewQuote.client_id)?.company}</p>
                </div>
                <div>
                  <span className="text-slate-500">Status</span>
                  <p><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${STATUS_BADGE[viewQuote.status]}`}>{STATUS_LABEL[viewQuote.status]}</span></p>
                </div>
                <div>
                  <span className="text-slate-500">Valid Until</span>
                  <p className="text-slate-200">{formatDate(viewQuote.valid_until)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Sent Date</span>
                  <p className="text-slate-200">{formatDate(viewQuote.sent_at)}</p>
                </div>
              </div>
              <div className="bg-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400">
                      <th className="text-left px-4 py-2 font-medium">Description</th>
                      <th className="text-center px-4 py-2 font-medium">Qty</th>
                      <th className="text-right px-4 py-2 font-medium">Unit Price</th>
                      <th className="text-right px-4 py-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {viewQuote.items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-slate-300">{item.description}</td>
                        <td className="px-4 py-2 text-center text-slate-400">{item.quantity}</td>
                        <td className="px-4 py-2 text-right text-slate-400">{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-2 text-right text-slate-200 font-medium">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-sm space-y-1.5 text-right">
                <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>{formatCurrency(viewQuote.subtotal)}</span></div>
                {viewQuote.discount > 0 && <div className="flex justify-between text-red-400"><span>Discount</span><span>-{formatCurrency(viewQuote.discount)}</span></div>}
                <div className="flex justify-between text-slate-400"><span>Tax ({viewQuote.tax_rate}%)</span><span>{formatCurrency(viewQuote.tax_amount)}</span></div>
                <div className="flex justify-between text-slate-100 font-bold text-base border-t border-slate-700 pt-2 mt-2"><span>Grand Total</span><span>{formatCurrency(viewQuote.total)}</span></div>
              </div>
              {viewQuote.notes && (
                <div className="bg-slate-800/60 rounded-xl p-4">
                  <p className="text-slate-500 text-xs font-medium mb-1">Notes</p>
                  <p className="text-slate-300 text-sm">{viewQuote.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-lg font-bold text-slate-100">
                {editingId ? 'Edit Quotation' : 'Create Quotation'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Client & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Client *</label>
                  <select
                    value={form.client_id}
                    onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select client...</option>
                    {demoClients.map(c => <option key={c.id} value={c.id}>{c.company} – {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Title *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Website Development"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-400">Quote Items</label>
                  <button onClick={addItem} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                <div className="bg-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400">
                        <th className="text-left px-3 py-2 font-medium">Description</th>
                        <th className="text-center px-3 py-2 font-medium w-20">Qty</th>
                        <th className="text-right px-3 py-2 font-medium w-32">Unit Price</th>
                        <th className="text-right px-3 py-2 font-medium w-32">Total</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {form.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">
                            <input
                              value={item.description}
                              onChange={e => updateItem(idx, 'description', e.target.value)}
                              placeholder="Item description"
                              className="w-full bg-transparent text-slate-200 placeholder-slate-600 focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                              className="w-full text-center bg-transparent text-slate-200 focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              value={item.unit_price}
                              onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))}
                              className="w-full text-right bg-transparent text-slate-200 focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-slate-300 font-medium">{formatCurrency(item.total)}</td>
                          <td className="px-3 py-2">
                            {form.items.length > 1 && (
                              <button onClick={() => removeItem(idx)} className="text-slate-600 hover:text-red-400">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex flex-col items-end gap-2 text-sm">
                <div className="flex justify-between w-56 text-slate-400">
                  <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center gap-3 w-56">
                  <span className="text-slate-400">Discount</span>
                  <input
                    type="number"
                    min={0}
                    value={form.discount}
                    onChange={e => setForm(p => ({ ...p, discount: Number(e.target.value) }))}
                    className="w-28 text-right px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-3 w-56">
                  <span className="text-slate-400">Tax Rate (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.tax_rate}
                    onChange={e => setForm(p => ({ ...p, tax_rate: Number(e.target.value) }))}
                    className="w-28 text-right px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-between w-56 text-slate-400">
                  <span>Tax Amount</span><span>{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between w-56 text-slate-100 font-bold text-base border-t border-slate-700 pt-2">
                  <span>Grand Total</span><span>{formatCurrency(grand)}</span>
                </div>
              </div>

              {/* Valid Until & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Valid Until</label>
                  <input
                    type="date"
                    value={form.valid_until}
                    onChange={e => setForm(p => ({ ...p, valid_until: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    rows={2}
                    placeholder="Payment terms, conditions..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => saveQuotation(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-xl transition-colors"
              >
                Save as Draft
              </button>
              <button
                onClick={() => saveQuotation(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <Send className="w-4 h-4" />
                Send Quotation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
