import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  FileText, Download, Printer, ShieldCheck, Check,
  Clock, AlertCircle, Building2, Phone, Mail, CheckCircle2,
  RefreshCw, MessageSquare
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate } from '../../lib/utils'
import { demoQuotations, demoClients } from '../../data/demoData'
import { supabase } from '../../lib/supabase'
import { openPrintableQuotation, downloadQuotationHTML } from '../../lib/pdfGenerator'
import { QUOTE_STATUS_CONFIG } from '../QuotationsPage'
import type { Quotation, Client } from '../../types/database'

export default function PublicQuotationPage() {
  const { id } = useParams<{ id: string }>()

  const [quote, setQuote] = useState<Quotation | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)

  // Approval Form State
  const [approverName, setApproverName] = useState('')
  const [approverEmail, setApproverEmail] = useState('')
  const [approverRole, setApproverRole] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [submittingApproval, setSubmittingApproval] = useState(false)

  // Revision Request State
  const [showRevisionForm, setShowRevisionForm] = useState(false)
  const [revisionNotes, setRevisionNotes] = useState('')
  const [submittingRevision, setSubmittingRevision] = useState(false)

  useEffect(() => {
    async function fetchQuote() {
      setLoading(true)
      let foundQuote: Quotation | null = null

      try {
        const { data } = await (supabase as any)
          .from('quotations')
          .select('*')
          .eq('id', id)
          .maybeSingle()
        if (data) foundQuote = data as Quotation
      } catch (_) {}

      if (!foundQuote) {
        foundQuote = demoQuotations.find(q => q.id === id || q.quote_number === id) || null
      }

      if (foundQuote) {
        setQuote(foundQuote)

        // Fetch client
        let foundClient: Client | null = null
        try {
          const { data: cData } = await (supabase as any)
            .from('clients')
            .select('*')
            .eq('id', foundQuote.client_id)
            .maybeSingle()
          if (cData) foundClient = cData as Client
        } catch (_) {}

        if (!foundClient) {
          foundClient = demoClients.find(c => c.id === foundQuote!.client_id) || null
        }
        setClient(foundClient)
        if (foundClient) {
          setApproverName(foundClient.name)
          setApproverEmail(foundClient.email)
          setApproverRole('Client Representative')
        }

        // Record 'Viewed' tracking if status was 'sent' (NOT approval)
        if (foundQuote.status === 'sent') {
          try {
            await (supabase as any)
              .from('quotations')
              .update({
                status: 'viewed',
                viewed_at: new Date().toISOString(),
                view_count: (foundQuote.view_count || 0) + 1,
              })
              .eq('id', foundQuote.id)
            setQuote(prev => prev ? { ...prev, status: 'viewed' } : null)
          } catch (_) {}
        }
      }

      setLoading(false)
    }

    if (id) fetchQuote()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-[#0D99FF] animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading secure quotation details...</p>
        </div>
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-6 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-base font-bold text-white">Quotation Not Found</h2>
          <p className="text-xs text-slate-400">
            The quotation link you accessed is invalid or has expired. Please contact CapeSecure Support.
          </p>
          <a
            href="https://capesecure.vercel.app"
            className="inline-block px-4 py-2 bg-[#0D99FF] text-white rounded-lg text-xs font-semibold"
          >
            Visit CapeSecure
          </a>
        </div>
      </div>
    )
  }

  const isApproved = quote.status === 'approved' || quote.status === 'accepted'
  const advancePct = quote.advance_percentage ?? 50
  const advanceAmt = quote.advance_amount ?? (quote.total * (advancePct / 100))
  const balanceAmt = quote.balance_amount ?? (quote.total - advanceAmt)

  const handleExecuteApproval = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirmed) {
      toast.error('Please check the confirmation box to authorize this quotation.')
      return
    }

    setSubmittingApproval(true)
    const approvalPayload = {
      approved_by: approverName.trim(),
      approver_email: approverEmail.trim(),
      approver_role: approverRole.trim() || 'Client Signatory',
      approved_at: new Date().toISOString(),
      version: quote.version || 1,
      confirmation_statement: `Officially approved by ${approverName.trim()} on ${new Date().toLocaleString()}`,
      ip_address: 'client_web_portal',
    }

    try {
      await (supabase as any)
        .from('quotations')
        .update({
          status: 'approved',
          accepted_at: new Date().toISOString(),
          approval_details: approvalPayload,
        })
        .eq('id', quote.id)

      setQuote(prev => prev ? {
        ...prev,
        status: 'approved',
        accepted_at: new Date().toISOString(),
        approval_details: approvalPayload,
      } : null)

      toast.success('Quotation approved successfully! Our project team will initiate the service agreement.')
    } catch (_) {
      setQuote(prev => prev ? {
        ...prev,
        status: 'approved',
        approval_details: approvalPayload,
      } : null)
      toast.success('Quotation approved successfully!')
    } finally {
      setSubmittingApproval(false)
    }
  }

  const handleRequestRevision = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!revisionNotes.trim()) {
      toast.error('Please provide specific feedback for the requested revision.')
      return
    }

    setSubmittingRevision(true)
    try {
      await (supabase as any)
        .from('quotations')
        .update({
          status: 'revision_requested',
          notes: `Revision requested by client: ${revisionNotes.trim()}`,
        })
        .eq('id', quote.id)

      setQuote(prev => prev ? {
        ...prev,
        status: 'revision_requested',
        notes: revisionNotes.trim(),
      } : null)

      toast.success('Revision request sent to CapeSecure Solutions!')
      setShowRevisionForm(false)
    } catch (_) {
      toast.success('Revision request recorded!')
      setShowRevisionForm(false)
    } finally {
      setSubmittingRevision(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
              CAPE<span className="text-[#0D99FF]">SECURE</span>
            </div>
            <div className="text-[11px] text-slate-400">Digital Solutions & Enterprise Architecture</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openPrintableQuotation(quote, client)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
            <button
              onClick={() => downloadQuotationHTML(quote, client)}
              className="px-3 py-1.5 bg-[#0D99FF] hover:bg-[#0D99FF]/90 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </button>
          </div>
        </div>

        {/* Status Notification Banner */}
        {isApproved ? (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center justify-between gap-4 text-xs text-green-300">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <strong className="text-white text-sm">Quotation Approved & Confirmed</strong>
                <p className="text-[11px] text-green-400/80 mt-0.5">
                  Approved by {quote.approval_details?.approved_by || client?.name} on {formatDate(quote.approval_details?.approved_at || quote.accepted_at || new Date().toISOString())}.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-green-500/20 text-green-400 font-bold uppercase text-[10px]">
              Ready for Agreement
            </span>
          </div>
        ) : quote.status === 'revision_requested' ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2.5 text-xs text-amber-300">
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <strong className="text-white">Revision Under Review</strong>
              <p className="text-[11px] text-amber-400/80 mt-0.5">
                Our architectural team is preparing the revised quotation based on your requested changes.
              </p>
            </div>
          </div>
        ) : null}

        {/* Main Document Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-800">
            <div>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">
                {quote.quote_number} {quote.version && quote.version > 1 ? `(v${quote.version})` : ''}
              </span>
              <h1 className="text-xl font-bold text-white mt-2">{quote.title}</h1>
              {quote.description && (
                <p className="text-xs text-slate-400 mt-1 max-w-xl">{quote.description}</p>
              )}
            </div>

            <div className="text-left sm:text-right text-xs text-slate-400 space-y-1">
              <div>Issue Date: <strong className="text-slate-200">{formatDate(quote.created_at)}</strong></div>
              <div>Valid Until: <strong className="text-slate-200">{quote.valid_until ? formatDate(quote.valid_until) : '30 Days'}</strong></div>
              <div>Estimated Delivery: <strong className="text-slate-200">{quote.delivery_timeline || '4–6 Weeks'}</strong></div>
            </div>
          </div>

          {/* Client & Vendor Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800 space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-400">Prepared For</div>
              <div className="text-sm font-bold text-white">{client?.name || 'Valued Client'}</div>
              <div className="text-[#0D99FF] font-medium">{client?.business_name || client?.company}</div>
              <div className="text-slate-400">{client?.email}</div>
              {client?.phone && <div className="text-slate-400">{client?.phone}</div>}
            </div>

            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800 space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-400">Service Provider</div>
              <div className="text-sm font-bold text-white">CapeSecure Digital Solutions</div>
              <div className="text-slate-400">Enterprise Web Architecture & Security</div>
              <div className="text-slate-400">quotes@capesecure.com • capesecure.vercel.app</div>
              <div className="text-slate-400">Reg: 2024/098124/07</div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4 w-10">#</th>
                  <th className="py-2.5 px-4">Service Description</th>
                  <th className="py-2.5 px-4 text-center w-16">Qty</th>
                  <th className="py-2.5 px-4 text-right w-28">Unit Price</th>
                  <th className="py-2.5 px-4 text-right w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {quote.items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-slate-500 text-center">{idx + 1}</td>
                    <td className="py-3 px-4 font-medium text-slate-200">{it.description}</td>
                    <td className="py-3 px-4 text-center text-slate-400">{it.quantity}</td>
                    <td className="py-3 px-4 text-right text-slate-400">{formatCurrency(it.unit_price)}</td>
                    <td className="py-3 px-4 text-right font-bold text-white">{formatCurrency(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Milestones and Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Milestones */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2 text-xs">
              <div className="text-[10px] font-bold uppercase text-slate-400">Payment Milestones</div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <div>
                  <strong>Advance Payment ({advancePct}%)</strong>
                  <div className="text-[11px] text-slate-400">Due upon agreement execution to start project</div>
                </div>
                <div className="font-bold text-white">{formatCurrency(advanceAmt)}</div>
              </div>
              <div className="flex justify-between py-1">
                <div>
                  <strong>Final Settlement ({100 - advancePct}%)</strong>
                  <div className="text-[11px] text-slate-400">Due upon production deployment & client handover</div>
                </div>
                <div className="font-bold text-white">{formatCurrency(balanceAmt)}</div>
              </div>
            </div>

            {/* Calculations Table */}
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-200">{formatCurrency(quote.subtotal)}</span>
              </div>
              {quote.discount > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>Discount:</span>
                  <span>-{formatCurrency(quote.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Tax ({quote.tax_rate}%):</span>
                <span className="font-semibold text-slate-200">{formatCurrency(quote.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-white border-t border-slate-800 pt-2">
                <span>Grand Total:</span>
                <span className="text-[#0D99FF]">{formatCurrency(quote.total)}</span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800 pt-4">
            <div className="text-[10px] font-bold uppercase text-slate-300">Standard Terms & Conditions</div>
            <p className="text-[11px] leading-relaxed">
              {quote.terms_conditions || '1. Work commences upon receipt of advance payment. 2. Scope changes outside this quotation will be quoted separately. 3. Source code and deliverables transfer upon full final settlement.'}
            </p>
          </div>
        </div>

        {/* Client Action Box: Formal Approval or Request Revisions */}
        {!isApproved && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Approval Form */}
            <div className="bg-slate-900 border border-green-500/30 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>Formal Client Approval</span>
              </div>
              <p className="text-xs text-slate-400">
                Authorize this quotation to proceed immediately with contract generation and advance invoice.
              </p>

              <form onSubmit={handleExecuteApproval} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Approver Full Name *</label>
                  <input
                    required
                    type="text"
                    value={approverName}
                    onChange={e => setApproverName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Official Business Email *</label>
                  <input
                    required
                    type="email"
                    value={approverEmail}
                    onChange={e => setApproverEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Designation / Role</label>
                  <input
                    type="text"
                    value={approverRole}
                    onChange={e => setApproverRole(e.target.value)}
                    placeholder="e.g. Managing Director / Marketing Head"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <label className="flex items-start gap-2 pt-1 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={e => setConfirmed(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-green-500 focus:ring-green-500"
                  />
                  <span>
                    I confirm acceptance of Quotation <strong>{quote.quote_number}</strong> (Value: {formatCurrency(quote.total)}).
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={submittingApproval}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-green-900/30 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {submittingApproval ? 'Submitting Authorization...' : 'Submit Official Approval'}
                </button>
              </form>
            </div>

            {/* Request Revisions Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
                <MessageSquare className="w-5 h-5 text-amber-400" />
                <span>Need Adjustments or Scope Revision?</span>
              </div>
              <p className="text-xs text-slate-400">
                If deliverables, timeline, or pricing need alteration, send your feedback directly to the CapeSecure team.
              </p>

              {showRevisionForm ? (
                <form onSubmit={handleRequestRevision} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">What would you like revised?</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="e.g. Please adjust the timeline to 4 weeks and add an SEO maintenance retainer..."
                      value={revisionNotes}
                      onChange={e => setRevisionNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRevisionForm(false)}
                      className="flex-1 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingRevision}
                      className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold"
                    >
                      {submittingRevision ? 'Sending...' : 'Submit Revision'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="pt-8 text-center">
                  <button
                    onClick={() => setShowRevisionForm(true)}
                    className="px-4 py-2 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                  >
                    Request Scope / Price Revision
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
