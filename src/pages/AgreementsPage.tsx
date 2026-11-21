import { useState, useMemo } from 'react'
import {
  Plus, Search, FileSignature, CheckCircle2, Clock, XCircle,
  Download, Eye, Edit2, AlertCircle, Calendar
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate } from '../lib/utils'
import { demoAgreements, demoClients, demoQuotations } from '../data/demoData'
import type { Agreement, AgreementStatus } from '../types/database'

const STATUS_CONFIG: Record<AgreementStatus, { label: string; badge: string }> = {
  draft:      { label: 'Draft',      badge: 'bg-slate-500/10 text-slate-400 border border-slate-500/20' },
  sent:       { label: 'Sent',       badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  signed:     { label: 'Signed',     badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  active:     { label: 'Active',     badge: 'bg-green-500/10 text-green-400 border border-green-500/20' },
  completed:  { label: 'Completed',  badge: 'bg-teal-500/10 text-teal-400 border border-teal-500/20' },
  terminated: { label: 'Terminated', badge: 'bg-red-500/10 text-red-400 border border-red-500/20' },
}

export default function AgreementsPage() {
  const [agreements, setAgreements] = useState<Agreement[]>(demoAgreements)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Form state
  const [clientId, setClientId] = useState('')
  const [quotationId, setQuotationId] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [totalValue, setTotalValue] = useState<number>(0)
  const [advancePercentage, setAdvancePercentage] = useState<number>(50)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const clientMap = useMemo(() => Object.fromEntries(demoClients.map(c => [c.id, c])), [])

  const stats = useMemo(() => ({
    total: agreements.length,
    signed: agreements.filter(a => a.status === 'signed' || a.status === 'active').length,
    draft: agreements.filter(a => a.status === 'draft').length,
    sent: agreements.filter(a => a.status === 'sent').length,
    totalValue: agreements.reduce((acc, a) => acc + a.total_value, 0)
  }), [agreements])

  const filtered = useMemo(() => {
    return agreements.filter(a => {
      const client = clientMap[a.client_id]
      const matchSearch =
        a.agreement_number.toLowerCase().includes(search.toLowerCase()) ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        (client?.name.toLowerCase().includes(search.toLowerCase()) ?? false)
      const matchStatus = statusFilter === 'all' || a.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [agreements, search, statusFilter, clientMap])

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId || !title || totalValue <= 0) {
      toast.error('Please enter valid agreement details')
      return
    }

    const advAmt = (totalValue * advancePercentage) / 100
    const newAgr: Agreement = {
      id: `agr-${Date.now()}`,
      client_id: clientId,
      quotation_id: quotationId || null,
      agreement_number: `AGR-2026-${String(agreements.length + 1).padStart(3, '0')}`,
      title,
      content: content || 'Standard CapeSecure Service Agreement terms apply.',
      total_value: totalValue,
      advance_percentage: advancePercentage,
      advance_amount: advAmt,
      balance_amount: totalValue - advAmt,
      status: 'draft',
      signed_at: null,
      signature_url: null,
      file_url: null,
      start_date: startDate || new Date().toISOString(),
      end_date: endDate || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    setAgreements([newAgr, ...agreements])
    setShowModal(false)
    toast.success('Agreement created successfully!')
  }

  const markSigned = (id: string) => {
    setAgreements(prev => prev.map(a => a.id === id ? {
      ...a,
      status: 'signed',
      signed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } : a))
    toast.success('Agreement marked as signed!')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Agreements & Contracts</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Manage legal service contracts, scopes of work, and digital signatures
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Create Agreement
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Total Value</span>
            <FileSignature className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(stats.totalValue)}</p>
          <span className="text-xs text-slate-400 mt-1 block">{stats.total} total contracts</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Signed & Active</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.signed}</p>
          <span className="text-xs text-slate-400 mt-1 block">Legally executed</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Awaiting Signature</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.sent}</p>
          <span className="text-xs text-slate-400 mt-1 block">Sent to client</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Drafts</span>
            <Edit2 className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.draft}</p>
          <span className="text-xs text-slate-400 mt-1 block">In preparation</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search agreement number, client, title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input sm:w-48"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="signed">Signed</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="terminated">Terminated</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Agreement #</th>
                <th>Client</th>
                <th>Title</th>
                <th>Total Value</th>
                <th>Advance (50%)</th>
                <th>Status</th>
                <th>Signed Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No agreements found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map(a => {
                  const client = clientMap[a.client_id]
                  const statusCfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.draft
                  return (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {a.agreement_number}
                      </td>
                      <td>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{client?.name ?? '—'}</div>
                        <div className="text-xs text-slate-500">{client?.company}</div>
                      </td>
                      <td className="max-w-xs truncate font-medium text-slate-800 dark:text-slate-200">
                        {a.title}
                      </td>
                      <td className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(a.total_value)}
                      </td>
                      <td className="text-slate-600 dark:text-slate-400 text-xs">
                        {formatCurrency(a.advance_amount)} ({a.advance_percentage}%)
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.badge}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="text-xs text-slate-500">
                        {a.signed_at ? formatDate(a.signed_at) : 'Not signed'}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedAgreement(a)}
                            className="btn-ghost p-1.5"
                            title="View Agreement Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {a.status !== 'signed' && (
                            <button
                              onClick={() => markSigned(a.id)}
                              className="btn-ghost p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              title="Mark as Signed"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => toast.success(`Agreement ${a.agreement_number} PDF exported`)}
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

      {/* Details View Modal */}
      {selectedAgreement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{selectedAgreement.agreement_number}</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedAgreement.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Client: {clientMap[selectedAgreement.client_id]?.name} ({clientMap[selectedAgreement.client_id]?.company})
                </p>
              </div>
              <button
                onClick={() => setSelectedAgreement(null)}
                className="btn-ghost p-1.5"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
              <div>
                <span className="text-xs text-slate-400 block">Total Value</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatCurrency(selectedAgreement.total_value)}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Advance Due</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatCurrency(selectedAgreement.advance_amount)}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Status</span>
                <span className="text-xs font-semibold uppercase text-emerald-500">{selectedAgreement.status}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Signed At</span>
                <span className="text-xs text-slate-700 dark:text-slate-300">{selectedAgreement.signed_at ? formatDate(selectedAgreement.signed_at) : 'Pending'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase text-slate-500">Agreement Terms & Scope</h4>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {selectedAgreement.content}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedAgreement(null)}
                className="btn-secondary"
              >
                Close
              </button>
              <button
                onClick={() => {
                  toast.success('Agreement PDF downloaded')
                }}
                className="btn-primary"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Create New Agreement</h3>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="form-group">
                <label className="label">Client *</label>
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
                <label className="label">Agreement Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Website Development & SLA Agreement"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Total Value (ZAR) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="75000"
                    value={totalValue || ''}
                    onChange={e => setTotalValue(Number(e.target.value))}
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Advance Deposit (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={advancePercentage}
                    onChange={e => setAdvancePercentage(Number(e.target.value))}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Target Completion Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">Agreement Clauses & Scope</label>
                <textarea
                  rows={4}
                  placeholder="Enter specific contractual requirements, payment milestones, and handover commitments..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="input resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Draft Agreement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
