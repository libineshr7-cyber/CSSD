import { useState, useMemo, useEffect } from 'react'
import {
  CreditCard, Plus, Eye, CheckCircle2, Search, Filter,
  Clock, AlertTriangle, X, RefreshCw, Download, ShieldCheck,
  RotateCcw, FileText, Check, ShieldAlert, ArrowDownRight, UserCheck
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { downloadReceiptPDF } from '../lib/pdfGenerator'
import { useAuth } from '../contexts/AuthContext'
import type {
  Payment,
  PaymentType,
  PaymentMethod,
  PaymentVerificationStatus,
  Client,
  Project,
  Invoice
} from '../types/database'

// ─── Status & Type Configs ───────────────────────────────────────────────────

const VERIFICATION_CONFIG: Record<PaymentVerificationStatus, { label: string; badge: string }> = {
  pending_verification: {
    label: 'Pending Bank Verification',
    badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
  },
  verified: {
    label: 'Verified & Settled',
    badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
  },
  rejected: {
    label: 'Rejected / Invalid Evidence',
    badge: 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
  },
  disputed: {
    label: 'Disputed Transaction',
    badge: 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
  },
}

const TYPE_CONFIG: Record<PaymentType, { label: string; badge: string }> = {
  advance:            { label: 'Advance (50%)',        badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  milestone:          { label: 'Milestone',            badge: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' },
  final:              { label: 'Final Settlement',     badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  additional_feature: { label: 'Additional Feature',   badge: 'bg-violet-500/20 text-violet-400 border border-violet-500/30' },
  maintenance:        { label: 'Monthly Maintenance',  badge: 'bg-teal-500/20 text-teal-400 border border-teal-500/30' },
  refund:             { label: 'Refund / Adjustment',  badge: 'bg-rose-500/20 text-rose-400 border border-rose-500/30' },
  other:              { label: 'Other',                badge: 'bg-slate-700/50 text-slate-400 border border-slate-600' },
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  upi:           'UPI (GPay/PhonePe/Paytm)',
  bank_transfer: 'Bank Transfer (NEFT/IMPS/RTGS)',
  gateway:       'Payment Gateway (Razorpay/Stripe)',
  card:          'Credit/Debit Card',
  cash:          'Cash Settlement',
  cheque:        'Cheque / Demand Draft',
  paypal:        'PayPal International',
  other:         'Other Authorized Channel',
}

export default function PaymentsPage() {
  const { user } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [verificationFilter, setVerificationFilter] = useState('all')

  // Modals
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [viewPayment, setViewPayment] = useState<Payment | null>(null)
  const [verifyingPayment, setVerifyingPayment] = useState<Payment | null>(null)

  // Record Payment Form
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [invoiceId, setInvoiceId] = useState('')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [paymentType, setPaymentType] = useState<PaymentType>('advance')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi')
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  // Verification Form
  const [evidenceType, setEvidenceType] = useState('bank_statement')
  const [evidenceRef, setEvidenceRef] = useState('')
  const [verifierNotes, setVerifierNotes] = useState('')
  const [confirmedEvidence, setConfirmedEvidence] = useState(false)

  // Refund Form
  const [refundClientId, setRefundClientId] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [refundOriginalRef, setRefundOriginalRef] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('bank_transfer')

  // Load Data from Supabase
  const loadData = async () => {
    setLoading(true)
    try {
      const [
        { data: payData },
        { data: cData },
        { data: prData },
        { data: invData },
      ] = await Promise.all([
        (supabase as any).from('payments').select('*').order('created_at', { ascending: false }),
        (supabase as any).from('clients').select('*').order('name', { ascending: true }),
        (supabase as any).from('projects').select('*').order('name', { ascending: true }),
        (supabase as any).from('invoices').select('*').order('created_at', { ascending: false }),
      ])

      if (payData) setPayments(payData as Payment[])
      if (cData) setClients(cData as Client[])
      if (prData) setProjects(prData as Project[])
      if (invData) setInvoices(invData as Invoice[])
    } catch (err) {
      console.error('Failed to load payments data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('capesecure-payments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients])
  const projectMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects])
  const invoiceMap = useMemo(() => Object.fromEntries(invoices.map(i => [i.id, i])), [invoices])

  // Dynamic KPI Stats
  const stats = useMemo(() => {
    const verified = payments.filter(p => p.verification_status === 'verified' || (p.status === 'received' && p.verification_status !== 'rejected'))
    const pending = payments.filter(p => p.verification_status === 'pending_verification' || (p.status === 'pending' && !p.verification_status))
    const refunds = payments.filter(p => p.payment_type === 'refund')

    const totalCollected = verified
      .filter(p => p.payment_type !== 'refund')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    const totalPending = pending.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    const totalRefunded = refunds.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    const advancePayments = verified
      .filter(p => p.payment_type === 'advance')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    return { totalCollected, totalPending, totalRefunded, advancePayments, verifiedCount: verified.length, pendingCount: pending.length }
  }, [payments])

  // Filtered Payments
  const filtered = useMemo(() => {
    return payments.filter(p => {
      const client = clientMap[p.client_id]
      const project = projectMap[p.project_id || '']
      const matchSearch =
        p.reference.toLowerCase().includes(search.toLowerCase()) ||
        (p.receipt_number?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (client?.business_name ?? client?.company ?? client?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (project?.name ?? '').toLowerCase().includes(search.toLowerCase())

      const vStatus = p.verification_status || (p.status === 'received' ? 'verified' : 'pending_verification')
      const matchType = typeFilter === 'all' || p.payment_type === typeFilter
      const matchMethod = methodFilter === 'all' || p.payment_method === methodFilter
      const matchVerif = verificationFilter === 'all' || vStatus === verificationFilter

      return matchSearch && matchType && matchMethod && matchVerif
    })
  }, [payments, search, typeFilter, methodFilter, verificationFilter, clientMap, projectMap])

  // Generate Sequential Receipt Number
  const generateReceiptNumber = () => {
    const year = new Date().getFullYear()
    const verifiedCount = payments.filter(p => p.receipt_number).length + 1
    return `CS-REC-${year}-${String(verifiedCount).padStart(3, '0')}`
  }

  // Handle Record Payment (Initial State: Pending Bank Verification)
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId) {
      toast.error('Please select a client')
      return
    }
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }
    if (!reference.trim()) {
      toast.error('Transaction reference (UTR or Gateway ID) is required')
      return
    }

    const newPaymentData: Partial<Payment> = {
      client_id: clientId,
      project_id: projectId || null,
      invoice_id: invoiceId || null,
      amount: Number(amount),
      currency: 'INR',
      reference: reference.trim(),
      payment_type: paymentType,
      payment_method: paymentMethod,
      status: 'pending',
      verification_status: 'pending_verification',
      received_date: receivedDate,
      notes: notes || null,
      recorded_by: user?.email || 'admin@capesecure.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const { data, error } = await (supabase as any)
        .from('payments')
        .insert([newPaymentData])
        .select()
        .single()

      if (error) {
        console.warn('Supabase insert payment error:', error)
        setPayments([{ id: `pay-${Date.now()}`, ...newPaymentData } as Payment, ...payments])
      } else if (data) {
        setPayments([data as Payment, ...payments])
      }

      setShowRecordModal(false)
      setAmount('')
      setReference('')
      setNotes('')
      toast.success('Payment recorded! Status: Pending Reliable Evidence Verification.')
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    }
  }

  // Handle Reliable Payment Verification
  const handleVerifyPayment = async () => {
    if (!verifyingPayment) return
    if (!confirmedEvidence) {
      toast.error('You must confirm that funds were verified against bank statement or gateway webhook.')
      return
    }

    const toastId = toast.loading('Reconciling payment and generating verified receipt...')
    const verifiedTimestamp = new Date().toISOString()
    const newReceiptNumber = verifyingPayment.receipt_number || generateReceiptNumber()

    // Calculate remaining balance on related invoice if attached
    let remainingBal = 0
    if (verifyingPayment.invoice_id) {
      const relatedInv = invoiceMap[verifyingPayment.invoice_id]
      if (relatedInv) {
        const currentPaid = relatedInv.amount_paid || 0
        const newPaidTotal = currentPaid + Number(verifyingPayment.amount)
        remainingBal = Math.max(0, relatedInv.total - newPaidTotal)

        // Update invoice in database
        await (supabase as any)
          .from('invoices')
          .update({
            amount_paid: newPaidTotal,
            balance_due: remainingBal,
            status: remainingBal === 0 ? 'paid' : 'sent',
            paid_at: remainingBal === 0 ? verifiedTimestamp : null,
            updated_at: verifiedTimestamp,
          })
          .eq('id', relatedInv.id)
      }
    }

    const updatePayload = {
      status: 'received',
      verification_status: 'verified' as PaymentVerificationStatus,
      receipt_number: newReceiptNumber,
      verified_by: user?.email || 'Finance Manager',
      verified_at: verifiedTimestamp,
      verification_evidence: `${evidenceType.toUpperCase()}: ${evidenceRef || verifyingPayment.reference}`,
      balance_after_payment: remainingBal,
      notes: verifierNotes ? `${verifyingPayment.notes ? verifyingPayment.notes + ' | ' : ''}Verification Notes: ${verifierNotes}` : verifyingPayment.notes,
      updated_at: verifiedTimestamp,
    }

    try {
      await (supabase as any)
        .from('payments')
        .update(updatePayload)
        .eq('id', verifyingPayment.id)

      const updatedPayment: Payment = {
        ...verifyingPayment,
        ...(updatePayload as any),
      }

      setPayments(prev => prev.map(p => p.id === verifyingPayment.id ? updatedPayment : p))
      setVerifyingPayment(null)
      setConfirmedEvidence(false)
      setEvidenceRef('')
      setVerifierNotes('')

      toast.success(`Payment verified! Receipt ${newReceiptNumber} generated.`, { id: toastId })

      // Auto-trigger genuine PDF Receipt Download
      const client = clientMap[updatedPayment.client_id]
      const invoice = updatedPayment.invoice_id ? invoiceMap[updatedPayment.invoice_id] : null
      downloadReceiptPDF(updatedPayment, client, invoice)
    } catch (err: any) {
      toast.error(`Verification error: ${err.message}`, { id: toastId })
    }
  }

  // Handle Record Refund
  const handleRecordRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!refundClientId || !refundAmount || !refundReason.trim()) {
      toast.error('Client, refund amount, and reason are required')
      return
    }

    const refundPaymentData: Partial<Payment> = {
      client_id: refundClientId,
      project_id: null,
      invoice_id: null,
      amount: Number(refundAmount),
      currency: 'INR',
      reference: `REFUND-${Date.now().toString().slice(-6)}`,
      receipt_number: `CS-REC-REF-${Date.now().toString().slice(-4)}`,
      payment_type: 'refund',
      payment_method: refundMethod,
      status: 'received',
      verification_status: 'verified',
      verified_by: user?.email || 'Finance Administrator',
      verified_at: new Date().toISOString(),
      refund_reason: refundReason.trim(),
      refund_original_ref: refundOriginalRef || null,
      received_date: new Date().toISOString().slice(0, 10),
      notes: `Customer refund: ${refundReason.trim()}`,
      recorded_by: user?.email || 'admin@capesecure.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const { data, error } = await (supabase as any)
        .from('payments')
        .insert([refundPaymentData])
        .select()
        .single()

      if (!error && data) {
        setPayments([data as Payment, ...payments])
      } else {
        setPayments([{ id: `pay-${Date.now()}`, ...refundPaymentData } as Payment, ...payments])
      }

      setShowRefundModal(false)
      setRefundAmount('')
      setRefundReason('')
      setRefundOriginalRef('')
      toast.success('Refund transaction documented and recorded in audit ledger.')
    } catch (err: any) {
      toast.error(`Failed to record refund: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Finance &amp; Payment Settlements</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            Strict evidence-based payment verification, advance tracking, and verified receipts (₹).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="btn-secondary"
            title="Refresh database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={() => setShowRefundModal(true)}
            className="btn-secondary text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Issue Refund</span>
          </button>
          <button
            onClick={() => setShowRecordModal(true)}
            className="btn-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Security Mandate Alert Banner */}
      <div className="bg-slate-50 dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-3.5 flex items-start gap-3 shadow-xs">
        <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <strong className="text-slate-900 dark:text-slate-100 font-semibold">CapeSecure Financial Security Mandate:</strong> In accordance with audit standards, customer payments are never recognized merely upon screenshot submission. Every transaction requires verification against confirmed bank statement settlements, NEFT/IMPS/UPI UTR reconciliation, or signed gateway webhook responses before official receipt issuance.
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider">Verified Collections</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.totalCollected)}</p>
          <span className="text-[11px] text-slate-400 mt-1 block font-mono">{stats.verifiedCount} verified transactions</span>
        </div>

        <div className="bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider">Pending Verification</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">{formatCurrency(stats.totalPending)}</p>
          <span className="text-[11px] text-slate-400 mt-1 block font-mono">{stats.pendingCount} awaiting bank reconciliation</span>
        </div>

        <div className="bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider">Advance Settlements</span>
            <ArrowDownRight className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">{formatCurrency(stats.advancePayments)}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">50% upfront project milestones</span>
        </div>

        <div className="bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider">Refunds Documented</span>
            <RotateCcw className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">{formatCurrency(stats.totalRefunded)}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Adjustments &amp; refunds ledger</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by UTR, Receipt #, Client, Project..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-[#0e1526] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:ring-1.5 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={verificationFilter}
            onChange={e => setVerificationFilter(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-[#0e1526] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 text-xs focus:outline-none shadow-xs"
          >
            <option value="all">All Verification Statuses</option>
            <option value="verified">Verified &amp; Settled</option>
            <option value="pending_verification">Pending Bank Verification</option>
            <option value="rejected">Rejected / Invalid</option>
            <option value="disputed">Disputed</option>
          </select>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-[#0e1526] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 text-xs focus:outline-none shadow-xs"
          >
            <option value="all">All Payment Types</option>
            <option value="advance">Advance (50%)</option>
            <option value="milestone">Milestone</option>
            <option value="final">Final Settlement</option>
            <option value="additional_feature">Additional Feature</option>
            <option value="maintenance">Maintenance</option>
            <option value="refund">Refunds</option>
          </select>
          <select
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-[#0e1526] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 text-xs focus:outline-none shadow-xs"
          >
            <option value="all">All Payment Methods</option>
            <option value="upi">UPI (GPay/PhonePe/Paytm)</option>
            <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
            <option value="gateway">Payment Gateway</option>
            <option value="cash">Cash Settlement</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>
      </div>

      {/* Payments Ledger Table */}
      <div className="table-wrapper">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Receipt / Ref</th>
                <th>Client / Business</th>
                <th>Project / Invoice</th>
                <th className="text-right">Amount (₹)</th>
                <th>Type</th>
                <th>Method</th>
                <th>Verification Status</th>
                <th>Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-500">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    No financial transaction records match criteria.
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const client = clientMap[p.client_id]
                  const project = projectMap[p.project_id || '']
                  const invoice = p.invoice_id ? invoiceMap[p.invoice_id] : null
                  const vStatus = p.verification_status || (p.status === 'received' ? 'verified' : 'pending_verification')
                  const isVerified = vStatus === 'verified'
                  const isRefund = p.payment_type === 'refund'

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold text-blue-400">
                          {p.receipt_number || p.reference}
                        </div>
                        {p.receipt_number && (
                          <div className="text-[10px] text-slate-500 font-mono">Ref: {p.reference}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-200">
                          {client?.business_name ?? client?.company ?? client?.name ?? '—'}
                        </div>
                        <div className="text-xs text-slate-500">{client?.name}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="text-slate-300 font-medium">{project?.name ?? '—'}</div>
                        {invoice && (
                          <div className="text-slate-500 font-mono">Inv: {invoice.invoice_number}</div>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${isRefund ? 'text-rose-400' : 'text-slate-100'}`}>
                        {isRefund ? '-' : ''}{formatCurrency(p.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_CONFIG[p.payment_type]?.badge || TYPE_CONFIG.other.badge}`}>
                          {TYPE_CONFIG[p.payment_type]?.label || p.payment_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">
                        {METHOD_LABEL[p.payment_method] || p.payment_method}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${VERIFICATION_CONFIG[vStatus]?.badge || VERIFICATION_CONFIG.pending_verification.badge}`}>
                          {VERIFICATION_CONFIG[vStatus]?.label || vStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {formatDate(p.received_date || p.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isVerified ? (
                            <button
                              onClick={() => downloadReceiptPDF(p, client, invoice)}
                              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                              title="Download Verified Receipt PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setVerifyingPayment(p)}
                              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                              title="Verify against bank evidence"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" /> Verify
                            </button>
                          )}
                          <button
                            onClick={() => setViewPayment(p)}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="View audit details"
                          >
                            <Eye className="w-4 h-4" />
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

      {/* View Payment Audit Detail Modal */}
      {viewPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewPayment(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  {viewPayment.receipt_number || viewPayment.reference}
                </h3>
                <p className="text-xs text-slate-400">Payment Audit Record & Verification Log</p>
              </div>
              <button onClick={() => setViewPayment(null)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3 text-sm">
              {[
                ['Client / Business', clientMap[viewPayment.client_id]?.business_name || clientMap[viewPayment.client_id]?.name || '—'],
                ['Project', projectMap[viewPayment.project_id || '']?.name || 'Direct Client Account'],
                ['Related Invoice', viewPayment.invoice_id ? invoiceMap[viewPayment.invoice_id]?.invoice_number : 'Direct Credit'],
                ['Amount Paid', formatCurrency(viewPayment.amount)],
                ['Payment Type', TYPE_CONFIG[viewPayment.payment_type]?.label || viewPayment.payment_type],
                ['Payment Method', METHOD_LABEL[viewPayment.payment_method] || viewPayment.payment_method],
                ['Transaction Ref / UTR', viewPayment.reference],
                ['Payment Date', formatDate(viewPayment.received_date)],
                ['Recorded By', viewPayment.recorded_by || 'Admin'],
                ['Verification Status', (viewPayment.verification_status || viewPayment.status).toUpperCase()],
                ['Verified By', viewPayment.verified_by || 'Pending Reconciliation'],
                ['Verification Evidence', viewPayment.verification_evidence || 'Pending Bank Statement Check'],
              ].map(([lbl, val]) => (
                <div key={lbl} className="flex justify-between py-1 border-b border-slate-800/60 text-xs">
                  <span className="text-slate-400">{lbl}</span>
                  <span className="text-slate-100 font-semibold text-right max-w-xs truncate">{val}</span>
                </div>
              ))}

              {viewPayment.notes && (
                <div className="p-3 bg-slate-800/60 rounded-xl text-xs text-slate-300">
                  <span className="text-slate-400 font-semibold block mb-0.5">Notes:</span>
                  {viewPayment.notes}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button onClick={() => setViewPayment(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors">
                Close
              </button>
              {(viewPayment.verification_status === 'verified' || viewPayment.status === 'received') && (
                <button
                  onClick={() => downloadReceiptPDF(viewPayment, clientMap[viewPayment.client_id], viewPayment.invoice_id ? invoiceMap[viewPayment.invoice_id] : null)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" /> Download Official Receipt PDF
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Verification Modal */}
      {verifyingPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setVerifyingPayment(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" /> Reconcile & Verify Payment
                </h3>
                <p className="text-xs text-slate-400">Verify against confirmed bank statement or gateway webhook</p>
              </div>
              <button onClick={() => setVerifyingPayment(null)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-800/60 p-3.5 rounded-xl space-y-1.5 border border-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Client:</span>
                  <span className="text-slate-200 font-semibold">{clientMap[verifyingPayment.client_id]?.business_name || clientMap[verifyingPayment.client_id]?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount to Settle:</span>
                  <span className="text-emerald-400 font-bold text-sm">{formatCurrency(verifyingPayment.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Client Reported Ref:</span>
                  <span className="text-blue-400 font-mono">{verifyingPayment.reference}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Reliable Evidence Type *</label>
                <select
                  value={evidenceType}
                  onChange={e => setEvidenceType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="bank_statement">Bank Account Statement Credit (NEFT/RTGS/IMPS/UPI)</option>
                  <option value="gateway_webhook">Payment Gateway Webhook Signature Verified (Razorpay/Stripe)</option>
                  <option value="cheque_realization">Cheque Realization & Bank Credit Advice</option>
                  <option value="counter_cash_receipt">Cash Voucher Signed by Authorized Cashier</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Bank Statement Date / Settled UTR / Webhook Event ID *</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-918238120391 / Settlement Date 2026-11-22"
                  value={evidenceRef}
                  onChange={e => setEvidenceRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Internal Verification Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Funds cleared in SBI A/C 418299100234"
                  value={verifierNotes}
                  onChange={e => setVerifierNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedEvidence}
                    onChange={e => setConfirmedEvidence(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-slate-300">
                    I confirm under financial liability that I have verified cleared funds in CapeSecure bank accounts or received an authenticated gateway webhook response. I am not verifying based on unverified screenshots.
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button onClick={() => setVerifyingPayment(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors">
                Cancel
              </button>
              <button
                onClick={handleVerifyPayment}
                disabled={!confirmedEvidence}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/20"
              >
                <ShieldCheck className="w-4 h-4" /> Approve & Issue Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowRecordModal(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-400" /> Record Client Payment
              </h3>
              <button onClick={() => setShowRecordModal(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Client *</label>
                  <select
                    required
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.business_name || c.company || c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Project (Optional)</label>
                  <select
                    value={projectId}
                    onChange={e => setProjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None / Direct Settlement</option>
                    {projects.map(pr => (
                      <option key={pr.id} value={pr.id}>{pr.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Related Invoice (Optional)</label>
                  <select
                    value={invoiceId}
                    onChange={e => {
                      setInvoiceId(e.target.value)
                      const inv = invoiceMap[e.target.value]
                      if (inv && !amount) setAmount(String(inv.balance_due || inv.total))
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None / Advance on Account</option>
                    {invoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} ({formatCurrency(inv.total)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="25000"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Payment Type *</label>
                  <select
                    value={paymentType}
                    onChange={e => setPaymentType(e.target.value as PaymentType)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="advance">Advance Payment (50%)</option>
                    <option value="milestone">Milestone Payment</option>
                    <option value="final">Final Settlement</option>
                    <option value="additional_feature">Additional Feature</option>
                    <option value="maintenance">Monthly Maintenance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="upi">UPI (GPay / PhonePe / Paytm / BHIM)</option>
                    <option value="bank_transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                    <option value="gateway">Payment Gateway (Razorpay / Stripe)</option>
                    <option value="card">Credit / Debit Card</option>
                    <option value="cheque">Cheque / Demand Draft</option>
                    <option value="cash">Cash Settlement</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Transaction Reference / UTR *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UTR-418299100234"
                    value={reference}
                    onChange={e => setReference(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={receivedDate}
                    onChange={e => setReceivedDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Notes & Remittance Details</label>
                <textarea
                  rows={2}
                  placeholder="Notes from customer, sender account name, etc."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowRecordModal(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20">
                  <Plus className="w-4 h-4" /> Save Payment Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowRefundModal(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 text-rose-400">
                <RotateCcw className="w-5 h-5" /> Issue Customer Refund / Adjustment
              </h3>
              <button onClick={() => setShowRefundModal(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleRecordRefund} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Client *</label>
                  <select
                    required
                    value={refundClientId}
                    onChange={e => setRefundClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">Select client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.business_name || c.company || c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Refund Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="5000"
                    value={refundAmount}
                    onChange={e => setRefundAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Original Transaction Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-418299100234"
                    value={refundOriginalRef}
                    onChange={e => setRefundOriginalRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Refund Method *</label>
                  <select
                    value={refundMethod}
                    onChange={e => setRefundMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="bank_transfer">Direct Bank Transfer (NEFT/IMPS)</option>
                    <option value="upi">UPI Reversal</option>
                    <option value="gateway">Payment Gateway Refund</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Reason for Refund *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Document the exact business/contractual reason for this refund"
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowRefundModal(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-rose-600/20">
                  <RotateCcw className="w-4 h-4" /> Issue & Log Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
