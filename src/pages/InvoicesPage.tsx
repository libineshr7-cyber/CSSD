import { useState, useMemo } from 'react'
import {
  Plus, Search, Download, CheckCircle2, Clock, AlertTriangle,
  Receipt, Eye, Trash2, Send
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate } from '../lib/utils'
import { demoInvoices, demoClients } from '../data/demoData'
import type { Invoice, InvoiceStatus, InvoiceItem } from '../types/database'

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; badge: string }> = {
  draft:     { label: 'Draft',     badge: 'bg-slate-500/10 text-slate-400 border border-slate-500/20' },
  sent:      { label: 'Sent',      badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  paid:      { label: 'Paid',      badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  overdue:   { label: 'Overdue',   badge: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  cancelled: { label: 'Cancelled', badge: 'bg-slate-500/10 text-slate-400 border border-slate-500/20' },
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(demoInvoices)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  // Form states
  const [clientId, setClientId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [taxRate, setTaxRate] = useState<number>(15)
  const [notes, setNotes] = useState('Payment terms: Net 7 days. Please use invoice number as reference.')
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: 'Website Development & Design Phase 1', quantity: 1, unit_price: 25000, total: 25000 }
  ])

  const clientMap = useMemo(() => Object.fromEntries(demoClients.map(c => [c.id, c])), [])

  const stats = useMemo(() => {
    const totalBilled = invoices.reduce((acc, i) => acc + i.total, 0)
    const totalPaid = invoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.total, 0)
    const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((acc, i) => acc + i.total, 0)
    const totalPending = invoices.filter(i => i.status === 'sent').reduce((acc, i) => acc + i.total, 0)
    return { totalBilled, totalPaid, totalOverdue, totalPending }
  }, [invoices])

  const filtered = useMemo(() => {
    return invoices.filter(i => {
      const client = clientMap[i.client_id]
      const matchSearch =
        i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        (client?.name.toLowerCase().includes(search.toLowerCase()) ?? false) ||
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
  const taxAmount = (subtotal * taxRate) / 100
  const grandTotal = subtotal + taxAmount

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId) {
      toast.error('Please select a client')
      return
    }

    const newInv: Invoice = {
      id: `inv-${Date.now()}`,
      client_id: clientId,
      project_id: null,
      payment_id: null,
      invoice_number: `INV-2026-${String(invoices.length + 1).padStart(3, '0')}`,
      items,
      subtotal,
      discount: 0,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total: grandTotal,
      due_date: dueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
      paid_at: null,
      status: 'sent',
      notes,
      file_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    setInvoices([newInv, ...invoices])
    setShowModal(false)
    toast.success('Invoice created & sent to client!')
  }

  const markPaid = (id: string) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? {
      ...inv,
      status: 'paid',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } : inv))
    toast.success('Invoice marked as paid!')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Invoices & Billing</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Create professional VAT tax invoices, track payment status, and send receipts
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Total Invoiced</span>
            <Receipt className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(stats.totalBilled)}</p>
          <span className="text-xs text-slate-400 mt-1 block">All-time billing</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Paid Invoices</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.totalPaid)}</p>
          <span className="text-xs text-slate-400 mt-1 block">Settled funds</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Pending Payment</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(stats.totalPending)}</p>
          <span className="text-xs text-slate-400 mt-1 block">Awaiting payment</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Overdue Invoices</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(stats.totalOverdue)}</p>
          <span className="text-xs text-red-400 mt-1 block">Requires immediate follow-up</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice number, client, company..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input sm:w-44"
        >
          <option value="all">All Invoices</option>
          <option value="paid">Paid</option>
          <option value="sent">Sent (Pending)</option>
          <option value="overdue">Overdue</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Invoices List Table */}
      <div className="card overflow-hidden">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client / Entity</th>
                <th>Description</th>
                <th>Subtotal</th>
                <th>VAT (15%)</th>
                <th>Total (ZAR)</th>
                <th>Status</th>
                <th>Due Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                filtered.map(inv => {
                  const client = clientMap[inv.client_id]
                  const statusCfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft
                  const isOverdue = inv.status === 'overdue'

                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                        isOverdue ? 'border-l-4 border-l-red-500 bg-red-500/[0.02]' : ''
                      }`}
                    >
                      <td className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {inv.invoice_number}
                      </td>
                      <td>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{client?.name ?? '—'}</div>
                        <div className="text-xs text-slate-500">{client?.company}</div>
                      </td>
                      <td className="max-w-xs truncate text-xs text-slate-600 dark:text-slate-300">
                        {inv.items[0]?.description || 'Website services'}
                        {inv.items.length > 1 && ` (+${inv.items.length - 1} more items)`}
                      </td>
                      <td className="text-xs text-slate-600 dark:text-slate-400">
                        {formatCurrency(inv.subtotal)}
                      </td>
                      <td className="text-xs text-slate-500">
                        {formatCurrency(inv.tax_amount)}
                      </td>
                      <td className="font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(inv.total)}
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.badge}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className={`text-xs ${isOverdue ? 'font-bold text-red-500' : 'text-slate-500'}`}>
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="btn-ghost p-1.5"
                            title="View Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {inv.status !== 'paid' && (
                            <button
                              onClick={() => markPaid(inv.id)}
                              className="btn-ghost p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              title="Mark as Paid"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => toast.success(`Invoice ${inv.invoice_number} PDF exported`)}
                            className="btn-ghost p-1.5 text-slate-500"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400">
                    {selectedInvoice.invoice_number}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(STATUS_CONFIG[selectedInvoice.status] || STATUS_CONFIG.draft).badge}`}>
                    {selectedInvoice.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Issued to: <strong className="text-slate-700 dark:text-slate-300">{clientMap[selectedInvoice.client_id]?.name}</strong> ({clientMap[selectedInvoice.client_id]?.company})
                </p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="btn-ghost p-1.5">✕</button>
            </div>

            {/* Line Items Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase text-slate-500">Invoice Items</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                    <th className="text-left py-2">Description</th>
                    <th className="text-center py-2 w-16">Qty</th>
                    <th className="text-right py-2 w-28">Rate</th>
                    <th className="text-right py-2 w-28">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedInvoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 text-slate-800 dark:text-slate-200">{item.description}</td>
                      <td className="py-2.5 text-center text-slate-600 dark:text-slate-400">{item.quantity}</td>
                      <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">{formatCurrency(item.unit_price)}</td>
                      <td className="py-2.5 text-right font-medium text-slate-900 dark:text-slate-100">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-right text-sm">
                <div className="flex justify-end gap-8 text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-end gap-8 text-slate-500">
                  <span>VAT ({selectedInvoice.tax_rate}%):</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(selectedInvoice.tax_amount)}</span>
                </div>
                <div className="flex justify-end gap-8 text-base font-bold text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span>Total Amount Due:</span>
                  <span className="text-blue-600 dark:text-blue-400">{formatCurrency(selectedInvoice.total)}</span>
                </div>
              </div>
            </div>

            {selectedInvoice.notes && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-400">
                <strong>Notes / Payment Instructions:</strong> {selectedInvoice.notes}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setSelectedInvoice(null)} className="btn-secondary">
                Close
              </button>
              <button
                onClick={() => toast.success(`Receipt sent for ${selectedInvoice.invoice_number}`)}
                className="btn-primary"
              >
                <Download className="w-4 h-4" /> Export PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Create Tax Invoice</h3>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5">✕</button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Bill To Client *</label>
                  <select
                    required
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    className="input cursor-pointer"
                  >
                    <option value="">Select a client...</option>
                    {demoClients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="label">Line Items</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-xs text-blue-600 hover:text-blue-500 font-semibold"
                  >
                    + Add Item
                  </button>
                </div>
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Service or milestone description"
                      required
                      value={item.description}
                      onChange={e => updateItem(idx, 'description', e.target.value)}
                      className="input flex-1"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                      className="input w-16 text-center"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Price"
                      value={item.unit_price || ''}
                      onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))}
                      className="input w-28 text-right"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="btn-ghost p-2 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Summary Calculation */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-2 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500 items-center">
                  <span>VAT Rate (%):</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={e => setTaxRate(Number(e.target.value))}
                    className="input w-20 text-center py-1 text-xs"
                  />
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>VAT Amount:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-base text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span>Grand Total:</span>
                  <span className="text-blue-600 dark:text-blue-400">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="label">Invoice Notes & Bank Details</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="input resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Send className="w-4 h-4" /> Send Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
