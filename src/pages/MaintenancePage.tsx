import { useState, useEffect, useMemo } from 'react'
import {
  Shield,
  Plus,
  X,
  Calendar,
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Search,
  Filter,
  FileText,
  CreditCard,
  Mail,
  AlertTriangle,
  Send,
  Download,
  Check,
  Building2,
  ExternalLink,
  Layers,
  Wrench,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate, formatCurrency } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { downloadMaintenanceReportPDF } from '../lib/pdfGenerator'
import { sendMaintenanceRenewalReminderEmail } from '../lib/emailService'
import type {
  MaintenancePlanConfig,
  MaintenanceRecord,
  MaintenanceActivityItem,
  Client,
  Project,
  MonitoredWebsite
} from '../types/database'

const DEFAULT_PLANS: MaintenancePlanConfig[] = [
  {
    id: 'plan_standard',
    name: 'Standard Maintenance',
    price: 1999,
    billing_frequency: 'yearly',
    inclusions: [
      'Core framework & security patches',
      '99.5% Uptime monitoring (15-min interval)',
      'Monthly database backup verification',
      'SSL certificate expiry checks',
      '1 Priority support ticket / month',
      'Basic vulnerability scanning'
    ],
    exclusions: [
      'New custom feature development',
      'UI/UX redesigns',
      'Third-party paid API integration charges'
    ],
    support_hours_per_month: 2,
    is_active: true
  },
  {
    id: 'plan_advanced',
    name: 'Advanced Maintenance',
    price: 2999,
    billing_frequency: 'yearly',
    inclusions: [
      'Weekly core & dependency updates',
      'Real-time 99.9% Uptime monitoring (5-min interval)',
      'Weekly automated database & asset backups',
      'SSL & DNS health checks',
      'Unlimited defect fixes for deployed modules',
      'High-priority 2-hour response SLA',
      'Performance & page-speed optimization audits',
      'Quarterly comprehensive security hardening report'
    ],
    exclusions: [
      'Out-of-scope custom module creation',
      'Third-party cloud infrastructure billing'
    ],
    support_hours_per_month: 5,
    is_active: true
  }
]

export default function MaintenancePage() {
  const [activeTab, setActiveTab] = useState<'contracts' | 'plans' | 'workflow'>('contracts')
  const [loading, setLoading] = useState(true)

  // Data states
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [plans, setPlans] = useState<MaintenancePlanConfig[]>(DEFAULT_PLANS)
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [websites, setWebsites] = useState<MonitoredWebsite[]>([])

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Modals
  const [showAddContractModal, setShowAddContractModal] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [showRenewalModal, setShowRenewalModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null)

  // Contract Form State
  const [formClientId, setFormClientId] = useState('')
  const [formProjectId, setFormProjectId] = useState('')
  const [formPlanId, setFormPlanId] = useState('plan_standard')
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0])
  const [formRenewalDate, setFormRenewalDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [formPaymentStatus, setFormPaymentStatus] = useState<'paid' | 'pending'>('paid')
  const [formNotes, setFormNotes] = useState('')
  const [submittingContract, setSubmittingContract] = useState(false)

  // Plan Edit Form State
  const [editingPlan, setEditingPlan] = useState<MaintenancePlanConfig | null>(null)
  const [planName, setPlanName] = useState('')
  const [planPrice, setPlanPrice] = useState(1999)
  const [planFrequency, setPlanFrequency] = useState<'yearly' | 'semi_annual' | 'quarterly' | 'monthly'>('yearly')
  const [planInclusions, setPlanInclusions] = useState('')
  const [planExclusions, setPlanExclusions] = useState('')
  const [planHours, setPlanHours] = useState(2)

  // Activity Form State
  const [actTitle, setActTitle] = useState('')
  const [actPerformedBy, setActPerformedBy] = useState('CapeSecure DevOps')
  const [actNotes, setActNotes] = useState('')
  const [submittingAct, setSubmittingAct] = useState(false)

  // Renewal Action State
  const [sendingReminder, setSendingReminder] = useState(false)
  const [generatingInvoice, setGeneratingInvoice] = useState(false)
  const [activatingPeriod, setActivatingPeriod] = useState(false)

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      const [recRes, planRes, cliRes, prjRes, webRes] = await Promise.all([
        (supabase as any).from('maintenance_records').select('*').order('renewal_date', { ascending: true }),
        (supabase as any).from('maintenance_plans').select('*').order('price', { ascending: true }),
        (supabase as any).from('clients').select('*').order('name', { ascending: true }),
        (supabase as any).from('projects').select('*').order('name', { ascending: true }),
        (supabase as any).from('monitored_websites').select('*')
      ])

      if (recRes.data && recRes.data.length > 0) {
        setRecords(recRes.data)
      } else {
        setRecords([])
      }

      if (planRes.data && planRes.data.length > 0) {
        setPlans(planRes.data)
      }

      if (cliRes.data) setClients(cliRes.data)
      if (prjRes.data) setProjects(prjRes.data)
      if (webRes.data) setWebsites(webRes.data)
    } catch (err) {
      console.error('Error fetching maintenance data:', err)
      toast.error('Could not load all maintenance records.')
    } finally {
      setLoading(false)
    }
  }

  // Days remaining calculation
  const getDaysUntil = (dateStr: string): number => {
    const now = new Date()
    const target = new Date(dateStr)
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const client = clients.find((c) => c.id === r.client_id)
      const matchesSearch =
        r.plan_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client?.business_name || '').toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false

      if (filterStatus === 'all') return true
      if (filterStatus === 'urgent') return getDaysUntil(r.renewal_date) <= 15
      if (filterStatus === 'pending') return r.payment_status === 'pending'
      if (filterStatus === 'active') return r.contract_status === 'active'
      if (filterStatus === 'expired') return r.contract_status === 'expired' || getDaysUntil(r.renewal_date) < 0
      return true
    })
  }, [records, clients, searchQuery, filterStatus])

  // Save new contract
  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formClientId) {
      toast.error('Please select a client.')
      return
    }

    const selectedPlan = plans.find((p) => p.id === formPlanId) || DEFAULT_PLANS[0]
    setSubmittingContract(true)

    try {
      const newContract: Partial<MaintenanceRecord> = {
        client_id: formClientId,
        project_id: formProjectId || null,
        plan_id: selectedPlan.id,
        plan_name: selectedPlan.name,
        price: selectedPlan.price,
        billing_frequency: selectedPlan.billing_frequency,
        start_date: formStartDate,
        renewal_date: formRenewalDate,
        payment_status: formPaymentStatus,
        contract_status: 'active',
        support_entitlement: {
          hours_per_month: selectedPlan.support_hours_per_month,
          hours_used: 0,
          priority_sla: selectedPlan.id === 'plan_advanced' ? 'High Priority (2hr SLA)' : 'Standard (24hr SLA)'
        },
        maintenance_history: [
          {
            id: 'act-init',
            activity: 'Initial Baseline Security Hardening & Plan Activation',
            performed_by: 'CapeSecure Technical Lead',
            date: new Date().toISOString(),
            notes: 'Contract initiated and baseline diagnostics logged.'
          }
        ],
        notes: formNotes
      }

      const { data, error } = await (supabase as any)
        .from('maintenance_records')
        .insert(newContract)
        .select()
        .single()

      if (error) throw error

      setRecords((prev) => [data || (newContract as any), ...prev])
      toast.success('Maintenance contract activated successfully!')
      setShowAddContractModal(false)
      resetContractForm()
    } catch (err: any) {
      toast.error('Failed to create contract: ' + err.message)
    } finally {
      setSubmittingContract(false)
    }
  }

  const resetContractForm = () => {
    setFormClientId('')
    setFormProjectId('')
    setFormPlanId('plan_standard')
    setFormStartDate(new Date().toISOString().split('T')[0])
    setFormRenewalDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    setFormPaymentStatus('paid')
    setFormNotes('')
  }

  // Save / Update Plan Configuration
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!planName.trim()) {
      toast.error('Please enter a plan name.')
      return
    }

    const incArray = planInclusions.split('\n').map((s) => s.trim()).filter(Boolean)
    const excArray = planExclusions.split('\n').map((s) => s.trim()).filter(Boolean)

    const planData: MaintenancePlanConfig = {
      id: editingPlan?.id || `plan_${Date.now()}`,
      name: planName.trim(),
      price: Number(planPrice),
      billing_frequency: planFrequency,
      inclusions: incArray,
      exclusions: excArray,
      support_hours_per_month: Number(planHours),
      is_active: true
    }

    try {
      const { error } = await (supabase as any)
        .from('maintenance_plans')
        .upsert(planData)

      if (error) throw error

      setPlans((prev) => {
        const idx = prev.findIndex((p) => p.id === planData.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = planData
          return next
        }
        return [...prev, planData]
      })

      toast.success(`Plan "${planData.name}" saved!`)
      setShowPlanModal(false)
      setEditingPlan(null)
    } catch (err: any) {
      toast.error('Failed to save plan: ' + err.message)
    }
  }

  const openEditPlan = (plan: MaintenancePlanConfig) => {
    setEditingPlan(plan)
    setPlanName(plan.name)
    setPlanPrice(plan.price)
    setPlanFrequency(plan.billing_frequency as any)
    setPlanInclusions(plan.inclusions.join('\n'))
    setPlanExclusions(plan.exclusions.join('\n'))
    setPlanHours(plan.support_hours_per_month)
    setShowPlanModal(true)
  }

  // Record Activity Item
  const handleRecordActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRecord || !actTitle.trim()) {
      toast.error('Please enter the maintenance action.')
      return
    }

    setSubmittingAct(true)
    try {
      const newAct: MaintenanceActivityItem = {
        id: `act-${Date.now()}`,
        activity: actTitle.trim(),
        performed_by: actPerformedBy.trim() || 'CapeSecure Staff',
        date: new Date().toISOString(),
        notes: actNotes.trim(),
        status: 'completed'
      }

      const existingHistory = selectedRecord.maintenance_history || []
      const updatedHistory = [newAct, ...existingHistory]

      const { error } = await (supabase as any)
        .from('maintenance_records')
        .update({
          maintenance_history: updatedHistory,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRecord.id)

      if (error) throw error

      setRecords((prev) =>
        prev.map((r) => (r.id === selectedRecord.id ? { ...r, maintenance_history: updatedHistory } : r))
      )
      toast.success('Maintenance activity logged into client audit record!')
      setShowActivityModal(false)
      setActTitle('')
      setActNotes('')
    } catch (err: any) {
      toast.error('Failed to log activity: ' + err.message)
    } finally {
      setSubmittingAct(false)
    }
  }

  // Step 1: Send Renewal Reminder Email
  const handleSendReminder = async (rec: MaintenanceRecord) => {
    const client = clients.find((c) => c.id === rec.client_id)
    if (!client || !client.email) {
      toast.error('Client has no registered email address.')
      return
    }

    setSendingReminder(true)
    const daysLeft = getDaysUntil(rec.renewal_date)
    const website = websites.find((w) => w.client_id === rec.client_id)

    try {
      const res = await sendMaintenanceRenewalReminderEmail({
        toEmail: client.email,
        clientName: client.name,
        planName: rec.plan_name,
        price: rec.price,
        renewalDate: rec.renewal_date,
        daysLeft,
        websiteUrl: website?.url
      })

      if (res.success) {
        toast.success(`Renewal reminder dispatched to ${client.email}!`)
      } else {
        toast.error('Email service notice: ' + (res.error || 'Failed to dispatch'))
      }
    } catch (err: any) {
      toast.error('Failed to send reminder: ' + err.message)
    } finally {
      setSendingReminder(false)
    }
  }

  // Step 2: Generate Renewal Invoice
  const handleGenerateRenewalInvoice = async (rec: MaintenanceRecord) => {
    const client = clients.find((c) => c.id === rec.client_id)
    if (!client) {
      toast.error('Client not found.')
      return
    }

    setGeneratingInvoice(true)
    try {
      const invNum = `CS-INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
      const taxRate = 18
      const isGST = true
      const subtotal = rec.price
      const taxAmount = Math.round(subtotal * 0.18)
      const total = subtotal + taxAmount

      const invoicePayload = {
        client_id: client.id,
        project_id: rec.project_id || null,
        invoice_number: invNum,
        items: [
          {
            description: `Annual Renewal: ${rec.plan_name} (${formatDate(rec.renewal_date)} to ${formatDate(new Date(Date.now() + 365 * 86400000).toISOString())})`,
            quantity: 1,
            unit_price: subtotal,
            total: subtotal
          }
        ],
        subtotal,
        discount: 0,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        is_gst_applicable: isGST,
        gst_type: 'cgst_sgst',
        cgst_amount: Math.round(taxAmount / 2),
        sgst_amount: Math.round(taxAmount / 2),
        amount_paid: 0,
        balance_due: total,
        status: 'sent',
        due_date: rec.renewal_date,
        notes: 'Generated automatically from recurring maintenance renewal workflow.'
      }

      const { data, error } = await (supabase as any)
        .from('invoices')
        .insert(invoicePayload)
        .select()
        .single()

      if (error) throw error

      toast.success(`Renewal Invoice ${invNum} created for ${formatCurrency(total)}!`)
    } catch (err: any) {
      toast.error('Invoice generation failed: ' + err.message)
    } finally {
      setGeneratingInvoice(false)
    }
  }

  // Step 3 & 4: Activate / Extend Maintenance Period
  const handleExtendPeriod = async (rec: MaintenanceRecord) => {
    setActivatingPeriod(true)
    try {
      const currentRenewal = new Date(rec.renewal_date)
      // Extend by 1 year
      const nextRenewal = new Date(currentRenewal.setFullYear(currentRenewal.getFullYear() + 1))
        .toISOString()
        .split('T')[0]

      const renewalActivity: MaintenanceActivityItem = {
        id: `act-renew-${Date.now()}`,
        activity: `Contract Extended by 1 Year (${rec.plan_name})`,
        performed_by: 'Administrator',
        date: new Date().toISOString(),
        notes: `Renewal payment verified. Next renewal scheduled for ${formatDate(nextRenewal)}.`
      }

      const updatedHistory = [renewalActivity, ...(rec.maintenance_history || [])]

      const { error } = await (supabase as any)
        .from('maintenance_records')
        .update({
          renewal_date: nextRenewal,
          payment_status: 'paid',
          contract_status: 'active',
          maintenance_history: updatedHistory,
          updated_at: new Date().toISOString()
        })
        .eq('id', rec.id)

      if (error) throw error

      setRecords((prev) =>
        prev.map((r) =>
          r.id === rec.id
            ? {
                ...r,
                renewal_date: nextRenewal,
                payment_status: 'paid',
                contract_status: 'active',
                maintenance_history: updatedHistory
              }
            : r
        )
      )
      toast.success(`Maintenance extended to ${formatDate(nextRenewal)}!`)
      setShowRenewalModal(false)
    } catch (err: any) {
      toast.error('Failed to extend contract: ' + err.message)
    } finally {
      setActivatingPeriod(false)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#0ACF83]/15 text-[#0ACF83] border border-[#0ACF83]/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Website Maintenance Management
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Recurring SLA subscriptions, proactive patching, audit logs, and renewal workflows.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchInitialData}
            title="Refresh Records"
            className="p-2 rounded-lg bg-white dark:bg-[#252525] border border-slate-200 dark:border-[#383838] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0D99FF]' : ''}`} />
          </button>
          <button
            onClick={() => {
              resetContractForm()
              setShowAddContractModal(true)
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0D99FF] hover:bg-[#007BE5] text-white text-xs font-semibold shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Maintenance Contract</span>
          </button>
        </div>
      </div>

      {/* ── Compliance Mandate Alert ── */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
          <span className="font-bold">Compliance Notice:</span> As per CapeSecure security policy, do not automatically charge clients unless a properly authorized recurring payment mandate and compatible payment gateway (e.g. e-NACH/Razorpay Mandate) are configured. Always verify payment evidence or gateway webhooks before contract extension.
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#333333] shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Active Subscriptions</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
            {records.filter((r) => r.contract_status === 'active').length}
          </span>
          <span className="text-[11px] text-[#0ACF83] font-medium flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Guaranteed SLA protection</span>
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#333333] shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Renewals Approaching (≤ 30d)</span>
          <span className="text-2xl font-bold text-amber-500 mt-1 block">
            {records.filter((r) => getDaysUntil(r.renewal_date) <= 30 && getDaysUntil(r.renewal_date) >= 0).length}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Awaiting reminder & invoice dispatch</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#333333] shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Annual Contract Revenue</span>
          <span className="text-2xl font-bold text-[#0ACF83] mt-1 block">
            {formatCurrency(records.reduce((sum, r) => sum + Number(r.price || 0), 0))}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Predictable recurring maintenance ARR</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#333333] shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Proactive Maintenance Tasks</span>
          <span className="text-2xl font-bold text-[#0D99FF] mt-1 block">
            {records.reduce((acc, r) => acc + (r.maintenance_history?.length || 0), 0)}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">Logged diagnostic & patch events</span>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#333333] pb-1">
        <button
          onClick={() => setActiveTab('contracts')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'contracts'
              ? 'bg-[#0D99FF]/15 text-[#0D99FF]'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Active Contracts ({records.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'plans'
              ? 'bg-[#0D99FF]/15 text-[#0D99FF]'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Configurable Plans ({plans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('workflow')}
          className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'workflow'
              ? 'bg-[#0D99FF]/15 text-[#0D99FF]'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Renewal Workflow Wizard</span>
        </button>
      </div>

      {/* ── TAB 1: CONTRACTS ── */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by client, domain, or plan..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#383838] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-[#0D99FF]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#383838] text-xs text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="all">All Contracts</option>
                <option value="urgent">Urgent Renewal (≤ 15d)</option>
                <option value="pending">Pending Payment</option>
                <option value="active">Active SLA</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Contracts Table */}
          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#333333]">
              <Shield className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No maintenance records found</p>
              <p className="text-xs text-slate-400 mt-1">Activate a maintenance contract for any existing client to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-[#333333] bg-white dark:bg-[#202020]">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-[#252525] text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-[#333333]">
                  <tr>
                    <th className="py-3 px-4">Client & Project</th>
                    <th className="py-3 px-4">Maintenance Plan</th>
                    <th className="py-3 px-4">Annual Cost</th>
                    <th className="py-3 px-4">Start Date</th>
                    <th className="py-3 px-4">Next Renewal</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Support SLA</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#2d2d2d]">
                  {filteredRecords.map((r) => {
                    const client = clients.find((c) => c.id === r.client_id)
                    const project = projects.find((p) => p.id === r.project_id)
                    const website = websites.find((w) => w.client_id === r.client_id)
                    const daysLeft = getDaysUntil(r.renewal_date)

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-[#252525]/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {client?.name || 'Client'}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            {client?.business_name || client?.company || (project?.name || 'Direct Service')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-900 dark:text-white block">
                            {r.plan_name}
                          </span>
                          <span className="text-[10px] text-slate-400 capitalize">
                            Frequency: {r.billing_frequency}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-[#0ACF83] block">
                            {formatCurrency(r.price)}
                          </span>
                          <span className={`text-[10px] uppercase font-bold ${
                            r.payment_status === 'paid' ? 'text-[#0ACF83]' : 'text-amber-500'
                          }`}>
                            {r.payment_status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          {formatDate(r.start_date)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <Clock className={`w-3.5 h-3.5 ${
                              daysLeft < 0 ? 'text-red-500' : daysLeft <= 15 ? 'text-amber-500' : 'text-[#0ACF83]'
                            }`} />
                            <span className="font-medium">{formatDate(r.renewal_date)}</span>
                          </div>
                          <span className={`text-[10px] font-bold ${
                            daysLeft < 0 ? 'text-red-500' : daysLeft <= 15 ? 'text-amber-500' : 'text-slate-400'
                          }`}>
                            {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft} days left`}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            r.contract_status === 'active'
                              ? 'bg-[#0ACF83]/15 text-[#0ACF83] border border-[#0ACF83]/30'
                              : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                          }`}>
                            {r.contract_status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[11px] block">
                            {r.support_entitlement?.priority_sla || 'Standard SLA'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {r.support_entitlement?.hours_used || 0}h / {r.support_entitlement?.hours_per_month || 2}h used
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedRecord(r)
                                setShowActivityModal(true)
                              }}
                              title="Log Maintenance Action"
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#282828] text-slate-600 dark:text-slate-300 hover:text-[#0D99FF] transition-colors"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => downloadMaintenanceReportPDF(r, client, website)}
                              title="Download Official Health Report PDF"
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#282828] text-slate-600 dark:text-slate-300 hover:text-[#0ACF83] transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setSelectedRecord(r)
                                setShowRenewalModal(true)
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#0D99FF]/15 text-[#0D99FF] hover:bg-[#0D99FF] hover:text-white text-[11px] font-semibold transition-all"
                            >
                              Renew
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
        </div>
      )}

      {/* ── TAB 2: CONFIGURABLE PLANS ── */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Configurable Maintenance Plans</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure plan prices, billing frequency, service inclusions, and exclusions as required by the business model.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingPlan(null)
                setPlanName('')
                setPlanPrice(3999)
                setPlanFrequency('yearly')
                setPlanInclusions('Custom dedicated SLA\nDaily audits\nDirect phone support')
                setPlanExclusions('Third party infrastructure cost')
                setPlanHours(10)
                setShowPlanModal(true)
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0D99FF] hover:bg-[#007BE5] text-white text-xs font-semibold shadow transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Custom Plan</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div
                key={p.id}
                className="p-6 rounded-2xl bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#333333] shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#0D99FF]/15 text-[#0D99FF]">
                      {p.billing_frequency}
                    </span>
                    <button
                      onClick={() => openEditPlan(p)}
                      className="p-1 rounded text-slate-400 hover:text-white"
                      title="Edit Plan"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{p.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2 mb-4">
                    <span className="text-2xl font-extrabold text-[#0ACF83]">{formatCurrency(p.price)}</span>
                    <span className="text-xs text-slate-400">/ {p.billing_frequency}</span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div>
                      <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1.5">
                        Inclusions
                      </span>
                      <ul className="space-y-1.5">
                        {p.inclusions.map((inc, i) => (
                          <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#0ACF83] flex-shrink-0 mt-0.5" />
                            <span>{inc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {p.exclusions && p.exclusions.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 dark:border-[#2d2d2d]">
                        <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1.5">
                          Exclusions
                        </span>
                        <ul className="space-y-1">
                          {p.exclusions.map((exc, i) => (
                            <li key={i} className="text-[11px] text-slate-500 flex items-start gap-1.5">
                              <X className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                              <span>{exc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-[#2d2d2d] flex items-center justify-between text-xs text-slate-500">
                  <span>Support: {p.support_hours_per_month}h / month</span>
                  <button
                    onClick={() => openEditPlan(p)}
                    className="text-[#0D99FF] hover:underline font-semibold"
                  >
                    Modify Plan →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: WORKFLOW WIZARD ── */}
      {activeTab === 'workflow' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#333333] rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              Standardized 6-Step Maintenance Renewal Protocol
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Follow this verified sequential lifecycle for all upcoming subscriber renewals.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { step: '1', title: 'Send Reminder', desc: 'Dispatch 15/30-day Brevo email notice to client signatory.' },
                { step: '2', title: 'Generate Invoice', desc: 'Create sequential CS-INV tax invoice with applicable GST.' },
                { step: '3', title: 'Verify Payment', desc: 'Verify bank transfer / gateway response before updating status.' },
                { step: '4', title: 'Extend Contract', desc: 'Advance renewal date by 1 year and activate SLA guarantee.' },
                { step: '5', title: 'Record Activity', desc: 'Execute diagnostic patching, DB backup, and security scans.' },
                { step: '6', title: 'Download Report', desc: 'Deliver signed PDF health report and audit certificate.' },
              ].map((st) => (
                <div
                  key={st.step}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-[#252525] border border-slate-200 dark:border-[#333333] flex flex-col justify-between"
                >
                  <div>
                    <div className="w-6 h-6 rounded-full bg-[#0D99FF] text-white flex items-center justify-center font-bold text-xs mb-2">
                      {st.step}
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">{st.title}</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{st.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action Matrix for Pending Renewals */}
          <div className="bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#333333] rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
              Upcoming Renewals Awaiting Action
            </h3>

            {records.filter((r) => getDaysUntil(r.renewal_date) <= 30).length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                All client contracts are up to date. No renewals due in the next 30 days.
              </p>
            ) : (
              <div className="space-y-3">
                {records
                  .filter((r) => getDaysUntil(r.renewal_date) <= 30)
                  .map((r) => {
                    const client = clients.find((c) => c.id === r.client_id)
                    const daysLeft = getDaysUntil(r.renewal_date)
                    return (
                      <div
                        key={r.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-[#333333] bg-slate-50/50 dark:bg-[#252525]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white text-xs">
                              {client?.name} ({client?.business_name || client?.company})
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              daysLeft <= 7 ? 'bg-red-500/15 text-red-500' : 'bg-amber-500/15 text-amber-500'
                            }`}>
                              Due in {daysLeft} days
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            Plan: {r.plan_name} • Rate: {formatCurrency(r.price)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSendReminder(r)}
                            disabled={sendingReminder}
                            className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#383838] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#0D99FF] flex items-center gap-1.5"
                          >
                            <Mail className="w-3.5 h-3.5 text-[#0D99FF]" />
                            <span>1. Send Reminder</span>
                          </button>

                          <button
                            onClick={() => handleGenerateRenewalInvoice(r)}
                            disabled={generatingInvoice}
                            className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#383838] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#0ACF83] flex items-center gap-1.5"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-[#0ACF83]" />
                            <span>2. Create Invoice</span>
                          </button>

                          <button
                            onClick={() => handleExtendPeriod(r)}
                            disabled={activatingPeriod}
                            className="px-3 py-1.5 rounded-lg bg-[#0ACF83] hover:bg-[#08a569] text-white text-xs font-semibold shadow flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>4. Extend Contract</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE CONTRACT ── */}
      {showAddContractModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#383838] rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">New Maintenance Subscription</h3>
              <button
                onClick={() => setShowAddContractModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContract} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Client <span className="text-red-500">*</span>
                </label>
                <select
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-200 dark:border-[#383838] text-xs text-slate-900 dark:text-white outline-none"
                >
                  <option value="">Select a Client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.business_name || c.company || 'Enterprise'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Associated Project (Optional)
                </label>
                <select
                  value={formProjectId}
                  onChange={(e) => setFormProjectId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-200 dark:border-[#383838] text-xs text-slate-900 dark:text-white outline-none"
                >
                  <option value="">Standalone Client Coverage</option>
                  {projects
                    .filter((p) => !formClientId || p.client_id === formClientId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Maintenance Plan
                </label>
                <select
                  value={formPlanId}
                  onChange={(e) => setFormPlanId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-200 dark:border-[#383838] text-xs text-slate-900 dark:text-white outline-none"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.price)} / {p.billing_frequency}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-200 dark:border-[#383838] text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Renewal Date
                  </label>
                  <input
                    type="date"
                    value={formRenewalDate}
                    onChange={(e) => setFormRenewalDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-200 dark:border-[#383838] text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Payment Status
                </label>
                <select
                  value={formPaymentStatus}
                  onChange={(e) => setFormPaymentStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-200 dark:border-[#383838] text-xs text-slate-900 dark:text-white outline-none"
                >
                  <option value="paid">Payment Verified & Settled</option>
                  <option value="pending">Pending Payment Verification</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contract Notes
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Special instructions or customized SLA agreements..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-200 dark:border-[#383838] text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddContractModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#383838] text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#282828]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingContract}
                  className="px-5 py-2 rounded-xl bg-[#0D99FF] hover:bg-[#007BE5] text-white text-xs font-semibold shadow disabled:opacity-50"
                >
                  {submittingContract ? 'Saving...' : 'Activate Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIGURE PLAN ── */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#383838] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingPlan ? 'Edit Maintenance Plan' : 'Create New Maintenance Plan'}
              </h3>
              <button
                onClick={() => setShowPlanModal(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Plan Name
                </label>
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  required
                  placeholder="e.g. Standard Maintenance"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-200 dark:border-[#383838] text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    value={planPrice}
                    onChange={(e) => setPlanPrice(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-200 dark:border-[#383838] text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Billing Frequency
                  </label>
                  <select
                    value={planFrequency}
                    onChange={(e) => setPlanFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-200 dark:border-[#383838] text-xs text-slate-900 dark:text-white outline-none"
                  >
                    <option value="yearly">Yearly</option>
                    <option value="semi_annual">Semi-Annual</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Service Inclusions (One per line)
                </label>
                <textarea
                  rows={4}
                  value={planInclusions}
                  onChange={(e) => setPlanInclusions(e.target.value)}
                  placeholder="Core security patches&#10;Database backups&#10;Uptime monitoring"
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-200 dark:border-[#383838] text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Service Exclusions (One per line)
                </label>
                <textarea
                  rows={2}
                  value={planExclusions}
                  onChange={(e) => setPlanExclusions(e.target.value)}
                  placeholder="New feature development&#10;UI redesigns"
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-200 dark:border-[#383838] text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Support Hours per Month
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={planHours}
                  onChange={(e) => setPlanHours(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-200 dark:border-[#383838] text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#383838] text-xs text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0D99FF] text-white text-xs font-semibold shadow"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: LOG MAINTENANCE ACTIVITY ── */}
      {showActivityModal && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#383838] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Maintenance Action</h3>
                <p className="text-xs text-slate-400">Add verified diagnostic or patch log for {selectedRecord.plan_name}.</p>
              </div>
              <button
                onClick={() => setShowActivityModal(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordActivity} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Action Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={actTitle}
                  onChange={(e) => setActTitle(e.target.value)}
                  placeholder="e.g. Monthly Security Hardening & Dependency Patch"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-200 dark:border-[#383838] text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Performed By
                </label>
                <input
                  type="text"
                  value={actPerformedBy}
                  onChange={(e) => setActPerformedBy(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-200 dark:border-[#383838] text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Technical Notes & Diagnostics
                </label>
                <textarea
                  rows={3}
                  value={actNotes}
                  onChange={(e) => setActNotes(e.target.value)}
                  placeholder="Result of database vacuum, updated package versions, or latency benchmarks..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-200 dark:border-[#383838] text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#383838] text-xs text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAct}
                  className="px-5 py-2 rounded-xl bg-[#0D99FF] text-white text-xs font-semibold shadow disabled:opacity-50"
                >
                  {submittingAct ? 'Logging...' : 'Save Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: RENEWAL ACTIONS ── */}
      {showRenewalModal && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202020] border border-slate-200 dark:border-[#383838] rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Subscription Renewal Actions</h3>
                <p className="text-xs text-slate-400">
                  Manage renewal for {selectedRecord.plan_name} (Current: {formatDate(selectedRecord.renewal_date)}).
                </p>
              </div>
              <button
                onClick={() => setShowRenewalModal(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-200 dark:border-[#383838] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Step 1: Send Renewal Reminder</h4>
                  <p className="text-[11px] text-slate-500">Dispatch transactional email notice to registered contact.</p>
                </div>
                <button
                  onClick={() => handleSendReminder(selectedRecord)}
                  disabled={sendingReminder}
                  className="px-3.5 py-1.5 rounded-lg bg-[#0D99FF] hover:bg-[#007BE5] text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Reminder</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-200 dark:border-[#383838] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Step 2: Generate Renewal Invoice</h4>
                  <p className="text-[11px] text-slate-500">Auto-create CS-INV sequential invoice with GST breakdown.</p>
                </div>
                <button
                  onClick={() => handleGenerateRenewalInvoice(selectedRecord)}
                  disabled={generatingInvoice}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Create Invoice</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#282828] border border-slate-200 dark:border-[#383838] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Step 3 & 4: Extend Subscription</h4>
                  <p className="text-[11px] text-slate-500">Advance renewal date by 1 year and mark contract active.</p>
                </div>
                <button
                  onClick={() => handleExtendPeriod(selectedRecord)}
                  disabled={activatingPeriod}
                  className="px-3.5 py-1.5 rounded-lg bg-[#0ACF83] hover:bg-[#08a569] text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Extend 1 Year</span>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-[#333333] flex justify-end">
              <button
                type="button"
                onClick={() => setShowRenewalModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#383838] text-xs text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
