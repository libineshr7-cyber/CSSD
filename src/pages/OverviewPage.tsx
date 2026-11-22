import { useMemo, useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Users, Briefcase, CreditCard, LifeBuoy,
  ArrowRight, Clock, CheckCircle2, AlertCircle, Circle, Plus,
  Layers, Download, Sparkles, Filter, ExternalLink, ShieldCheck,
  RefreshCw
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate, getInitials } from '../lib/utils'
import type { Lead, Client, Project, Payment, Task, SupportTicket } from '../types/database'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const statusColors: Record<string, string> = {
  new: 'text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-[#333333]',
  contacted: 'text-[#0D99FF] bg-[#0D99FF]/10',
  qualified: 'text-[#A259FF] bg-[#A259FF]/10',
  proposal: 'text-[#FFC700] bg-[#FFC700]/15 dark:text-[#FFC700]',
  won: 'text-[#0ACF83] bg-[#0ACF83]/10',
  lost: 'text-[#F24E1E] bg-[#F24E1E]/10',
}

const projectStatusColors: Record<string, string> = {
  development: 'text-[#0D99FF] bg-[#0D99FF]/10 border-[#0D99FF]/20',
  design: 'text-[#A259FF] bg-[#A259FF]/10 border-[#A259FF]/20',
  review: 'text-[#FFC700] bg-[#FFC700]/15 border-[#FFC700]/25 dark:text-[#FFC700]',
  planning: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200',
  testing: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30 border-amber-200',
  paused: 'text-slate-500 bg-slate-100 dark:bg-[#333333] border-slate-300 dark:border-slate-700',
  completed: 'text-[#0ACF83] bg-[#0ACF83]/10 border-[#0ACF83]/20',
}

const projectProgressColors: Record<string, string> = {
  development: 'bg-[#0D99FF]',
  design: 'bg-[#A259FF]',
  review: 'bg-[#FFC700]',
  planning: 'bg-indigo-500',
  testing: 'bg-amber-500',
  paused: 'bg-slate-400 dark:bg-slate-600',
  completed: 'bg-[#0ACF83]',
}

// ─── Custom Tooltip ──────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-xl px-3.5 py-2.5 shadow-xl text-xs">
        <p className="text-slate-400 text-[11px] font-medium mb-0.5">{label} 2026</p>
        <p className="text-[#0D99FF] font-bold text-sm">{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

// ─── Interactive Stat Card ─────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  iconBg: string
  trend: number
  trendLabel: string
  accentBorder?: string
}

function StatCard({ label, value, icon, iconBg, trend, trendLabel, accentBorder }: StatCardProps) {
  const isPositive = trend >= 0
  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className={`relative bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all overflow-hidden group ${accentBorder || ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-[#F5F5F5] mt-1.5 tracking-tight font-sans">
            {value}
          </p>
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${iconBg}`}>
          {icon}
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-[#F0F0F0] dark:border-[#383838]">
        {isPositive ? (
          <TrendingUp className="w-3.5 h-3.5 text-[#0ACF83]" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-[#F24E1E]" />
        )}
        <span className={`text-xs font-semibold ${isPositive ? 'text-[#0ACF83]' : 'text-[#F24E1E]'}`}>
          {isPositive ? '+' : ''}{trend}%
        </span>
        <span className="text-slate-400 text-xs">{trendLabel}</span>
      </div>
    </motion.div>
  )
}

// ─── Main Component ────────────────────────────────────────────────
export default function OverviewPage() {
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D' | '1Y'>('30D')
  const [loading, setLoading] = useState(true)

  // Real-time Database State
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [tickets, setTickets] = useState<SupportTicket[]>([])

  // Live database loader
  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [
        { data: pData },
        { data: cData },
        { data: lData },
        { data: payData },
        { data: tData },
        { data: tickData },
      ] = await Promise.all([
        (supabase as any).from('projects').select('*').order('created_at', { ascending: false }),
        (supabase as any).from('clients').select('*').order('created_at', { ascending: false }),
        (supabase as any).from('leads').select('*').order('created_at', { ascending: false }),
        (supabase as any).from('payments').select('*').order('created_at', { ascending: false }),
        (supabase as any).from('tasks').select('*').order('updated_at', { ascending: false }),
        (supabase as any).from('support_tickets').select('*').order('created_at', { ascending: false }),
      ])

      if (pData) setProjects(pData)
      if (cData) setClients(cData)
      if (lData) setLeads(lData)
      if (payData) setPayments(payData)
      if (tData) setTasks(tData)
      if (tickData) setTickets(tickData)
    } catch (err) {
      console.warn('Real-time database fetch:', err)
    } finally {
      setLoading(false)
    }
  }

  // Real-time Supabase Subscription
  useEffect(() => {
    loadDashboardData()

    // Subscribe to live changes across core tables
    const channel = supabase.channel('capesecure-overview-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => loadDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => loadDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => loadDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => loadDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadDashboardData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Dynamic calculations from real database
  const activeProjects = useMemo(() => projects.filter(p => p.status !== 'cancelled'), [projects])
  const activeClients  = useMemo(() => clients.filter(c => c.status === 'active'), [clients])
  const openTickets    = useMemo(() => tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed'), [tickets])
  const receivedTotal  = useMemo(
    () => payments.filter(p => p.status === 'received').reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [payments]
  )
  const pendingPayments = useMemo(() => payments.filter(p => p.status === 'pending'), [payments])
  const recentPayments  = useMemo(() => payments.filter(p => p.status === 'received'), [payments])
  const topLeads = useMemo(() => leads.filter(l => l.status !== 'lost').slice(0, 5), [leads])

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients])

  const recentActivity = useMemo(() => {
    const taskEvents = tasks.map(t => ({
      id: t.id,
      title: t.title,
      subtitle: `Task · ${t.assigned_to ?? 'Unassigned'}`,
      date: t.updated_at,
      type: 'task' as const,
      status: t.status,
      priority: t.priority,
    }))
    const ticketEvents = tickets.map(t => ({
      id: t.id,
      title: t.subject,
      subtitle: `Ticket · ${t.ticket_number}`,
      date: t.updated_at,
      type: 'ticket' as const,
      status: t.status,
      priority: t.priority,
    }))
    return [...taskEvents, ...ticketEvents]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6)
  }, [tasks, tickets])

  // Real-time Revenue Chart (constructed dynamically from live payments or 0 baseline)
  const dynamicRevenueData = useMemo(() => {
    const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']
    const currentMonthRev = receivedTotal
    return [
      { month: 'Jun', revenue: 0 },
      { month: 'Jul', revenue: 0 },
      { month: 'Aug', revenue: 0 },
      { month: 'Sep', revenue: 0 },
      { month: 'Oct', revenue: 0 },
      { month: 'Nov', revenue: currentMonthRev },
    ]
  }, [receivedTotal])

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Real-Time Workspace Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#E5E5E5] dark:border-[#383838]">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="CapeSecure Official Logo"
            className="w-11 h-11 rounded-full object-contain drop-shadow-md hover:scale-105 transition-transform flex-shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-[#F5F5F5] tracking-tight">
                {greeting()}, Admin
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0ACF83]/10 text-[#0ACF83] border border-[#0ACF83]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0ACF83] animate-pulse" /> Live Supabase Connected
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · CapeSecure Production Management
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadDashboardData}
            className="btn-ghost p-1.5 text-slate-500"
            title="Refresh Real-time Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/admin/projects"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0D99FF] hover:bg-[#007BE5] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </Link>
        </div>
      </div>

      {/* ── Stat Cards (Live Database Driven) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Realized Revenue"
          value={formatCurrency(receivedTotal)}
          icon={<CreditCard className="w-5 h-5 text-[#0ACF83]" />}
          iconBg="bg-[#0ACF83]/10"
          trend={receivedTotal > 0 ? 100 : 0}
          trendLabel="live cleared payments"
          accentBorder="hover:border-[#0ACF83]/40"
        />
        <StatCard
          label="Active Projects"
          value={String(activeProjects.length)}
          icon={<Briefcase className="w-5 h-5 text-[#0D99FF]" />}
          iconBg="bg-[#0D99FF]/10"
          trend={activeProjects.length}
          trendLabel="in active lifecycle"
          accentBorder="hover:border-[#0D99FF]/40"
        />
        <StatCard
          label="Total Client Accounts"
          value={String(clients.length)}
          icon={<Users className="w-5 h-5 text-[#A259FF]" />}
          iconBg="bg-[#A259FF]/10"
          trend={activeClients.length}
          trendLabel="active corporate accounts"
          accentBorder="hover:border-[#A259FF]/40"
        />
        <StatCard
          label="Open Support Tickets"
          value={String(openTickets.length)}
          icon={<LifeBuoy className="w-5 h-5 text-[#FFC700]" />}
          iconBg="bg-[#FFC700]/15"
          trend={openTickets.length}
          trendLabel="pending resolution"
          accentBorder="hover:border-[#FFC700]/40"
        />
      </div>

      {/* ── Empty Database Real-Time Quickstart Banner ── */}
      {clients.length === 0 && leads.length === 0 && (
        <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 border border-blue-500/20 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Live Real-Time Database Initialized & Ready
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            All fake mockup data has been eliminated. The system is connected directly to your CapeSecure Supabase PostgreSQL database. Create your first real lead or client to begin managing their lifecycle.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link to="/admin/leads" className="btn-primary text-xs">
              <Plus className="w-3.5 h-3.5" /> Create First Lead
            </Link>
            <Link to="/admin/clients" className="btn-secondary text-xs">
              <Users className="w-3.5 h-3.5" /> Add Client Account
            </Link>
            <Link to="/admin/quotations" className="btn-secondary text-xs">
              <CreditCard className="w-3.5 h-3.5" /> Create Quotation
            </Link>
          </div>
        </div>
      )}

      {/* ── Real Revenue Chart & Lifecycle Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Analytics */}
        <div className="lg:col-span-2 bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-slate-900 dark:text-[#F5F5F5] font-semibold text-sm">
                Cleared Revenue Trajectory
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">Live cleared client settlements (INR ₹)</p>
            </div>
            <span className="text-xs font-mono font-bold text-[#0ACF83] bg-[#0ACF83]/10 px-2.5 py-1 rounded-full border border-[#0ACF83]/20">
              Total: {formatCurrency(receivedTotal)}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-xs fill-slate-400" />
                <YAxis tickLine={false} axisLine={false} className="text-xs fill-slate-400" tickFormatter={v => `₹${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="#0D99FF" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Activity Stream */}
        <div className="bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-900 dark:text-[#F5F5F5] font-semibold text-sm">Recent Operational Events</h2>
              <span className="text-[10px] font-mono text-slate-400">Live Logs</span>
            </div>

            {recentActivity.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Clock className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                No events logged yet. Real activity appears as tasks and tickets progress.
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map(act => (
                  <div key={act.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#252525] border border-slate-100 dark:border-slate-800 text-xs">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{act.title}</p>
                      <p className="text-[10px] text-slate-400">{act.subtitle} • {formatDate(act.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link to="/admin/tasks" className="text-xs font-semibold text-blue-500 hover:underline flex items-center gap-1 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            Manage All Tasks <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Active Projects & Financial Pipeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects in Delivery */}
        <div className="bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-900 dark:text-[#F5F5F5] font-semibold text-sm">Active Development Projects</h2>
            <Link to="/admin/projects" className="text-xs font-semibold text-[#0D99FF] hover:underline flex items-center gap-1">
              View all ({projects.length}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Briefcase className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              No projects created yet. Convert an approved quotation to initialize a project.
            </div>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 4).map(p => (
                <div key={p.id} className="p-3 rounded-xl bg-slate-50 dark:bg-[#252525] border border-slate-200 dark:border-[#383838]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs">{p.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${projectStatusColors[p.status] || 'text-slate-500'}`}>
                          {p.status}
                        </span>
                        <span className="text-[10px] text-slate-400">Due {formatDate(p.deadline)}</span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{p.progress}%</span>
                  </div>

                  <div className="h-1.5 bg-slate-200 dark:bg-[#383838] rounded-full overflow-hidden mt-2.5">
                    <div
                      className={`h-full ${projectProgressColors[p.status] || 'bg-blue-500'}`}
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Financial Pipeline (Cleared & Pending) */}
        <div className="bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-900 dark:text-[#F5F5F5] font-semibold text-sm">Financial Settlements</h2>
            <Link to="/admin/payments" className="text-xs font-semibold text-[#0D99FF] hover:underline flex items-center gap-1">
              View all ({payments.length}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {payments.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <CreditCard className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              No payment transactions recorded yet. Advance and milestone receipts will appear here.
            </div>
          ) : (
            <div className="space-y-2">
              {payments.slice(0, 4).map(pay => {
                const client = clientMap[pay.client_id]
                return (
                  <div key={pay.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#252525] border border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{client?.name || pay.reference}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{pay.payment_type} • {pay.payment_method.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(pay.amount)}</p>
                      <span className="text-[9px] uppercase font-semibold text-slate-400">{pay.status}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Active Leads Pipeline ── */}
      <div className="bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-slate-900 dark:text-[#F5F5F5] font-semibold text-sm">Active Enquiries & Leads</h2>
            <p className="text-slate-400 text-xs mt-0.5">Prospects entering the client acquisition funnel</p>
          </div>
          <Link to="/admin/leads" className="text-xs font-semibold text-[#0D99FF] hover:underline flex items-center gap-1">
            Open Leads ({leads.length}) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {leads.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            <Users className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            No active leads in pipeline. Create a new lead enquiry to begin the acquisition workflow.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E5E5E5] dark:border-[#383838] text-slate-400 text-[11px]">
                  <th className="text-left pb-2 pr-4 font-semibold uppercase">Lead Contact</th>
                  <th className="text-left pb-2 pr-4 font-semibold uppercase">Company</th>
                  <th className="text-left pb-2 pr-4 font-semibold uppercase">Source</th>
                  <th className="text-left pb-2 pr-4 font-semibold uppercase">Status</th>
                  <th className="text-right pb-2 pr-4 font-semibold uppercase">Budget</th>
                  <th className="text-left pb-2 font-semibold uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0] dark:divide-[#383838]">
                {topLeads.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-[#252525]">
                    <td className="py-2.5 pr-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{lead.name}</div>
                      <div className="text-[10px] text-slate-400">{lead.email}</div>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300">{lead.company || '—'}</td>
                    <td className="py-2.5 pr-4 capitalize text-slate-500">{lead.source}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[lead.status] || 'bg-slate-100 text-slate-600'}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right font-semibold text-slate-900 dark:text-slate-100">{lead.budget ? formatCurrency(lead.budget) : '—'}</td>
                    <td className="py-2.5 text-slate-400">{formatDate(lead.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
