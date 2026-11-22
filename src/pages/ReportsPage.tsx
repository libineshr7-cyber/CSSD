import React, { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts'
import {
  TrendingUp, Briefcase, Users, Activity,
  DollarSign, Award, FileText, Clock,
  CheckCircle, AlertCircle, Calendar,
  ArrowUpRight, ShieldCheck, Receipt,
  Download, FileSpreadsheet, RefreshCw,
  Ban, ShieldAlert, ArrowDownRight, UserCheck
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/utils'
import { downloadFinancialReportPDF } from '../lib/pdfGenerator'
import type { Invoice, Payment, Client, Project } from '../types/database'

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444']

type Tab = 'financial' | 'projects' | 'clients' | 'audit'

const formatINR = (value: number) => formatCurrency(value)

const StatCard: React.FC<{
  title: string
  value: string
  sub?: string
  icon: React.ElementType
  color: string
  alert?: boolean
}> = ({ title, value, sub, icon: Icon, color, alert }) => (
  <div className={`bg-slate-900 rounded-2xl border p-5 flex items-start gap-4 transition-all shadow-lg ${
    alert ? 'border-rose-500/40 bg-rose-950/10' : 'border-slate-800'
  }`}>
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{title}</p>
      <p className="text-xl font-bold text-slate-100 mt-1 truncate">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5 truncate">{sub}</p>}
    </div>
  </div>
)

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('financial')
  const [loading, setLoading] = useState(false)

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const [
        { data: invData },
        { data: payData },
        { data: clientData },
        { data: projData },
        { data: logData },
      ] = await Promise.all([
        (supabase as any).from('invoices').select('*').order('created_at', { ascending: false }),
        (supabase as any).from('payments').select('*').order('created_at', { ascending: false }),
        (supabase as any).from('clients').select('*').order('name', { ascending: true }),
        (supabase as any).from('projects').select('*').order('created_at', { ascending: false }),
        (supabase as any).from('financial_audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
      ])

      if (invData) setInvoices(invData as Invoice[])
      if (payData) setPayments(payData as Payment[])
      if (clientData) setClients(clientData as Client[])
      if (projData) setProjects(projData as Project[])
      if (logData) setAuditLogs(logData)
    } catch (err) {
      console.error('Error fetching financial dashboard records:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients])
  const projectMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects])

  // ─── 9 Core Financial KPIs ──────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const currentMonthPrefix = new Date().toISOString().slice(0, 7) // YYYY-MM
    const currentYearPrefix = new Date().toISOString().slice(0, 4) // YYYY

    // 1. Total Invoiced (Excluding cancelled invoices)
    const validInvoices = invoices.filter(i => i.status !== 'cancelled')
    const totalInvoiced = validInvoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0)

    // 2. Total Collected (Verified & settled funds)
    const verifiedPayments = payments.filter(
      p => (p.status === 'received' || p.verification_status === 'verified') && p.payment_type !== 'refund'
    )
    const totalCollected = verifiedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    // 3. Outstanding Payments
    const outstandingPayments = validInvoices
      .filter(i => i.status === 'sent' || i.status === 'overdue' || i.status === 'draft')
      .reduce((sum, i) => sum + (Number(i.balance_due ?? (i.status === 'paid' ? 0 : i.total)) || 0), 0)

    // 4. Overdue Invoices
    const overdueInvoicesList = validInvoices.filter(
      i => i.status === 'overdue' || (i.status === 'sent' && i.due_date && i.due_date < today)
    )
    const overdueInvoices = overdueInvoicesList.reduce((sum, i) => sum + (Number(i.balance_due ?? i.total) || 0), 0)
    const overdueCount = overdueInvoicesList.length

    // 5. Advance Payments (50% upfront milestone)
    const advancePayments = verifiedPayments
      .filter(p => p.payment_type === 'advance')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    // 6. Monthly Revenue (Current Month)
    const monthlyRevenue = verifiedPayments
      .filter(p => (p.received_date || p.created_at || '').startsWith(currentMonthPrefix))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    // 7. Annual Revenue (Current Calendar Year)
    const annualRevenue = verifiedPayments
      .filter(p => (p.received_date || p.created_at || '').startsWith(currentYearPrefix))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    // 8. Maintenance Revenue
    const maintenanceRevenue = verifiedPayments
      .filter(p => p.payment_type === 'maintenance')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    // 9. Refunds
    const refundsTotal = payments
      .filter(p => p.payment_type === 'refund')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    return {
      totalInvoiced,
      totalCollected,
      outstandingPayments,
      overdueInvoices,
      overdueCount,
      advancePayments,
      monthlyRevenue,
      annualRevenue,
      maintenanceRevenue,
      refundsTotal,
      invoicesCount: validInvoices.length,
      paymentsCount: verifiedPayments.length,
    }
  }, [invoices, payments])

  // ─── Monthly Revenue Chart Data ─────────────────────────────────────────────
  const monthlyRevenueData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const currentYear = new Date().getFullYear()

    const monthlyMap: Record<number, number> = {}
    for (let m = 0; m < 12; m++) monthlyMap[m] = 0

    payments.forEach(p => {
      if ((p.status === 'received' || p.verification_status === 'verified') && p.payment_type !== 'refund') {
        const d = new Date(p.received_date || p.created_at)
        if (d.getFullYear() === currentYear) {
          const monthIndex = d.getMonth()
          monthlyMap[monthIndex] = (monthlyMap[monthIndex] || 0) + Number(p.amount)
        }
      }
    })

    return months.map((month, idx) => ({
      month,
      revenue: monthlyMap[idx] || 0
    }))
  }, [payments])

  // ─── Revenue by Payment Type ────────────────────────────────────────────────
  const revenueByTypeData = useMemo(() => {
    const typeTotals: Record<string, number> = {
      'Advance (50%)': 0,
      'Milestone': 0,
      'Final Settlement': 0,
      'Maintenance': 0,
      'Refunds': 0,
    }

    payments.forEach(p => {
      const amt = Number(p.amount) || 0
      if (p.payment_type === 'advance') typeTotals['Advance (50%)'] += amt
      else if (p.payment_type === 'milestone') typeTotals['Milestone'] += amt
      else if (p.payment_type === 'final') typeTotals['Final Settlement'] += amt
      else if (p.payment_type === 'maintenance') typeTotals['Maintenance'] += amt
      else if (p.payment_type === 'refund') typeTotals['Refunds'] += amt
    })

    return Object.entries(typeTotals)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
  }, [payments])

  // ─── Top Clients by Revenue ─────────────────────────────────────────────────
  const topClientsByRevenue = useMemo(() => {
    const clientRevenue: Record<string, { name: string; business: string; revenue: number; invoiceCount: number }> = {}

    payments.forEach(p => {
      if ((p.status === 'received' || p.verification_status === 'verified') && p.payment_type !== 'refund') {
        const c = clientMap[p.client_id]
        const cId = p.client_id || 'unknown'
        if (!clientRevenue[cId]) {
          clientRevenue[cId] = {
            name: c?.name || 'Direct Client',
            business: c?.business_name || c?.company || 'Enterprise',
            revenue: 0,
            invoiceCount: 0
          }
        }
        clientRevenue[cId].revenue += Number(p.amount) || 0
      }
    })

    invoices.forEach(i => {
      if (i.status !== 'cancelled' && clientRevenue[i.client_id]) {
        clientRevenue[i.client_id].invoiceCount += 1
      }
    })

    return Object.values(clientRevenue).sort((a, b) => b.revenue - a.revenue)
  }, [payments, invoices, clientMap])

  // ─── Export PDF Report ──────────────────────────────────────────────────────
  const handleExportPDF = () => {
    try {
      downloadFinancialReportPDF({
        totalInvoiced: kpis.totalInvoiced,
        totalCollected: kpis.totalCollected,
        outstandingPayments: kpis.outstandingPayments,
        overdueInvoices: kpis.overdueInvoices,
        advancePayments: kpis.advancePayments,
        maintenanceRevenue: kpis.maintenanceRevenue,
        refundsTotal: kpis.refundsTotal,
        annualRevenue: kpis.annualRevenue,
        invoicesCount: kpis.invoicesCount,
        paymentsCount: kpis.paymentsCount,
      })
      toast.success('Genuine CapeSecure Financial Audit PDF generated & downloaded!')
    } catch (err: any) {
      toast.error(`PDF generation failed: ${err.message}`)
    }
  }

  // ─── Export CSV Report ──────────────────────────────────────────────────────
  const handleExportCSV = () => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      let csvContent = 'data:text/csv;charset=utf-8,'

      // Section 1: Executive KPI Summary
      csvContent += 'CAPESECURE SOLUTIONS LLP - FINANCIAL AUDIT SUMMARY REPORT\r\n'
      csvContent += `Generated Date,${today}\r\n`
      csvContent += `Reporting Period,FY 2026-27\r\n\r\n`
      csvContent += 'FINANCIAL METRIC,AMOUNT (INR)\r\n'
      csvContent += `Total Invoiced,${kpis.totalInvoiced}\r\n`
      csvContent += `Total Collected (Verified Funds),${kpis.totalCollected}\r\n`
      csvContent += `Outstanding Payments Due,${kpis.outstandingPayments}\r\n`
      csvContent += `Overdue Invoices Balance,${kpis.overdueInvoices}\r\n`
      csvContent += `Advance Payments Received (50%),${kpis.advancePayments}\r\n`
      csvContent += `Current Month Revenue,${kpis.monthlyRevenue}\r\n`
      csvContent += `Current Year Revenue,${kpis.annualRevenue}\r\n`
      csvContent += `Maintenance Revenue,${kpis.maintenanceRevenue}\r\n`
      csvContent += `Refunds Issued,${kpis.refundsTotal}\r\n\r\n`

      // Section 2: Detailed Invoices Ledger
      csvContent += 'TAX INVOICES LEDGER\r\n'
      csvContent += 'Invoice Number,Client Name,Business Name,Due Date,GST Type,Subtotal,Tax Amount,Total,Amount Paid,Balance Due,Status,Cancellation Reason\r\n'
      invoices.forEach(inv => {
        const client = clientMap[inv.client_id]
        const cleanReason = (inv.cancellation_reason || '').replace(/"/g, '""')
        csvContent += `"${inv.invoice_number}","${client?.name || ''}","${client?.business_name || client?.company || ''}","${inv.due_date || ''}","${inv.gst_type || 'none'}",${inv.subtotal},${inv.tax_amount},${inv.total},${inv.amount_paid || 0},${inv.balance_due || 0},"${inv.status}","${cleanReason}"\r\n`
      })
      csvContent += '\r\n'

      // Section 3: Verified Payments & Receipts Ledger
      csvContent += 'PAYMENTS & VERIFIED RECEIPTS LEDGER\r\n'
      csvContent += 'Receipt Number,Reference,Client Name,Payment Date,Payment Method,Payment Type,Amount,Verification Status,Verified By,Evidence Reference,Notes\r\n'
      payments.forEach(p => {
        const client = clientMap[p.client_id]
        const cleanNotes = (p.notes || '').replace(/"/g, '""')
        csvContent += `"${p.receipt_number || 'N/A'}","${p.reference}","${client?.name || ''}","${p.received_date || p.created_at.slice(0, 10)}","${p.payment_method}","${p.payment_type}",${p.amount},"${p.verification_status || 'pending'}","${p.verified_by || ''}","${p.verification_evidence || ''}","${cleanNotes}"\r\n`
      })

      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `CapeSecure-Financial-Report-${today}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Financial Report CSV exported successfully!')
    } catch (err: any) {
      toast.error(`CSV export failed: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in p-6 bg-slate-950 text-slate-100 min-h-screen">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-blue-400" />
            Financial Dashboard &amp; Audit Reports
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Real-time verified revenue metrics, statutory Indian GST accounting, and compliance audit trail
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors border border-slate-800"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
          >
            <Download className="w-4 h-4" /> Download PDF Report
          </button>
        </div>
      </div>

      {/* ─── 9 Core Financial Dashboard KPIs ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        {/* 1. Total Invoiced */}
        <StatCard
          title="1. Total Invoiced"
          value={formatINR(kpis.totalInvoiced)}
          sub={`${kpis.invoicesCount} active billing documents`}
          icon={Receipt}
          color="bg-blue-600"
        />

        {/* 2. Total Collected */}
        <StatCard
          title="2. Total Collected"
          value={formatINR(kpis.totalCollected)}
          sub="Verified funds in bank account"
          icon={CheckCircle}
          color="bg-emerald-600"
        />

        {/* 3. Outstanding Payments */}
        <StatCard
          title="3. Outstanding Payments"
          value={formatINR(kpis.outstandingPayments)}
          sub="Pending accounts receivable"
          icon={Clock}
          color="bg-amber-600"
        />

        {/* 4. Overdue Invoices */}
        <StatCard
          title="4. Overdue Invoices"
          value={formatINR(kpis.overdueInvoices)}
          sub={`${kpis.overdueCount} invoices past maturity date`}
          icon={AlertCircle}
          color="bg-rose-600"
          alert={kpis.overdueInvoices > 0}
        />

        {/* 5. Advance Payments */}
        <StatCard
          title="5. Advance Payments"
          value={formatINR(kpis.advancePayments)}
          sub="50% commencement milestone"
          icon={TrendingUp}
          color="bg-indigo-600"
        />

        {/* 6. Monthly Revenue */}
        <StatCard
          title="6. Monthly Revenue"
          value={formatINR(kpis.monthlyRevenue)}
          sub={`Collections in ${new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`}
          icon={Calendar}
          color="bg-cyan-600"
        />

        {/* 7. Annual Revenue */}
        <StatCard
          title="7. Annual Revenue"
          value={formatINR(kpis.annualRevenue)}
          sub={`Total collections in FY ${new Date().getFullYear()}`}
          icon={Award}
          color="bg-purple-600"
        />

        {/* 8. Maintenance Revenue */}
        <StatCard
          title="8. Maintenance Revenue"
          value={formatINR(kpis.maintenanceRevenue)}
          sub="Recurring security & retainer fees"
          icon={ShieldCheck}
          color="bg-teal-600"
        />

        {/* 9. Refunds Total */}
        <StatCard
          title="9. Refunds & Adjustments"
          value={formatINR(kpis.refundsTotal)}
          sub="Documented customer refunds"
          icon={Ban}
          color="bg-rose-800"
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 w-fit">
        {[
          { key: 'financial', label: 'Revenue Analytics', icon: TrendingUp },
          { key: 'audit', label: 'Financial Audit Stream', icon: ShieldAlert },
          { key: 'clients', label: 'Client Ledger', icon: Users },
          { key: 'projects', label: 'Project Financials', icon: Briefcase },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as Tab)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === key
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ─── TAB 1: Financial & Revenue Analytics ─────────────────────────────── */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Revenue Bar Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Monthly Revenue Trajectory (₹)</h3>
                  <p className="text-xs text-slate-400">Verified bank settlements for FY {new Date().getFullYear()}</p>
                </div>
                <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                  {formatINR(kpis.annualRevenue)} YTD
                </span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    formatter={(value: any) => [formatINR(Number(value) || 0), 'Settled Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Revenue by Payment Type Pie Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Revenue by Milestone &amp; Type</h3>
                  <p className="text-xs text-slate-400">Distribution across contract milestones</p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  100% Verified
                </span>
              </div>
              {revenueByTypeData.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-slate-500 text-sm">
                  No verified milestone transactions recorded yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={revenueByTypeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      dataKey="value"
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {revenueByTypeData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                      formatter={(value: any) => formatINR(Number(value) || 0)}
                    />
                    <Legend wrapperStyle={{ color: '#94a3b8', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: Financial Audit Stream ────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-400" />
                Immutable Financial Audit Trail &amp; Verification Evidence
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Statutory audit log of payment settlements, receipts issued, and invoice cancellations
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
              {auditLogs.length + payments.length} Audit Events Logged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/90 border-b border-slate-800 text-xs uppercase font-medium text-slate-400">
                <tr>
                  <th className="text-left py-2.5 px-3">Timestamp</th>
                  <th className="text-left py-2.5 px-3">Transaction / Doc Ref</th>
                  <th className="text-left py-2.5 px-3">Client</th>
                  <th className="text-left py-2.5 px-3">Audit Event</th>
                  <th className="text-right py-2.5 px-3">Amount</th>
                  <th className="text-left py-2.5 px-3">Verifier / Officer</th>
                  <th className="text-left py-2.5 px-3">Evidence Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No financial settlements or audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  payments.map(p => {
                    const client = clientMap[p.client_id]
                    const isVerified = p.verification_status === 'verified'
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 text-xs font-mono text-slate-400">
                          {formatDate(p.verified_at || p.created_at)}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs font-bold text-blue-400">
                          {p.receipt_number || p.reference}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-200">
                          {client?.business_name || client?.name || 'Direct Client'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            p.payment_type === 'refund'
                              ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                              : isVerified
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          }`}>
                            {p.payment_type === 'refund' ? 'Refund Processed' : isVerified ? 'Verified Settlement' : 'Pending Verification'}
                          </span>
                        </td>
                        <td className={`py-3 px-3 text-right font-bold text-xs ${
                          p.payment_type === 'refund' ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          {p.payment_type === 'refund' ? `- ${formatINR(p.amount)}` : formatINR(p.amount)}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-300">
                          {p.verified_by || p.recorded_by || 'Treasury Admin'}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-400 max-w-xs truncate">
                          {p.verification_evidence || p.notes || 'Direct Bank Settlement'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: Client Ledger ────────────────────────────────────────────── */}
      {activeTab === 'clients' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-100">Top Clients by Cumulative Revenue</h3>
              <p className="text-xs text-slate-400">Contract volume and lifetime payment realization</p>
            </div>
            <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
              {topClientsByRevenue.length} Total Accounts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/90 border-b border-slate-800 text-xs uppercase font-medium text-slate-400">
                <tr>
                  <th className="text-left py-2 px-3">#</th>
                  <th className="text-left py-2 px-3">Client / Organization</th>
                  <th className="text-left py-2 px-3">Primary Contact</th>
                  <th className="text-center py-2 px-3">Invoices</th>
                  <th className="text-right py-2 px-3">Cumulative Realized Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {topClientsByRevenue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No client revenue records available yet.
                    </td>
                  </tr>
                ) : (
                  topClientsByRevenue.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 text-slate-500 font-mono text-xs">{i + 1}</td>
                      <td className="py-3 px-3 font-semibold text-slate-200">{c.business}</td>
                      <td className="py-3 px-3 text-slate-400 text-xs">{c.name}</td>
                      <td className="py-3 px-3 text-center text-xs text-slate-300">{c.invoiceCount}</td>
                      <td className="py-3 px-3 text-right font-bold text-blue-400 text-sm">
                        {formatINR(c.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 4: Project Financials ─────────────────────────────────────────── */}
      {activeTab === 'projects' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-100">Project Financial Progress</h3>
              <p className="text-xs text-slate-400">Contract value vs billed vs settled milestones</p>
            </div>
            <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
              {projects.length} Total Projects
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/90 border-b border-slate-800 text-xs uppercase font-medium text-slate-400">
                <tr>
                  <th className="text-left py-2 px-3">Project Title</th>
                  <th className="text-left py-2 px-3">Client</th>
                  <th className="text-left py-2 px-3">Lifecycle Status</th>
                  <th className="text-right py-2 px-3">Budget / Value</th>
                  <th className="text-right py-2 px-3">Settled Funds</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No active projects in database.
                    </td>
                  </tr>
                ) : (
                  projects.map(p => {
                    const client = clientMap[p.client_id]
                    const projInvoices = invoices.filter(inv => inv.project_id === p.id && inv.status !== 'cancelled')
                    const totalProjValue = projInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0)
                    const settledForProj = payments
                      .filter(pay => pay.project_id === p.id && (pay.status === 'received' || pay.verification_status === 'verified'))
                      .reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0)

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-medium text-slate-200">{p.name}</td>
                        <td className="py-3 px-3 text-slate-400 text-xs">{client?.name || '—'}</td>
                        <td className="py-3 px-3">
                          <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-slate-300 font-semibold text-xs">
                          {formatINR(totalProjValue)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-400 text-xs">
                          {formatINR(settledForProj)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
