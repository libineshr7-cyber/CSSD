import { useMemo, useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Users, Briefcase, CreditCard, LifeBuoy,
  ArrowRight, Clock, CheckCircle2, AlertCircle, Circle, Plus,
  Layers, Download, Sparkles, Filter, ExternalLink, ShieldCheck,
  RefreshCw, FileText
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getClients } from '../lib/clientStore'
import { formatCurrency, formatDate, getInitials } from '../lib/utils'
import type { Lead, Client, Project, Payment, Task, SupportTicket } from '../types/database'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const statusBadges: Record<string, { label: string; badge: string; dot: string }> = {
  new:       { label: 'New',       badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700', dot: 'bg-slate-400' },
  contacted: { label: 'Contacted', badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', dot: 'bg-blue-500' },
  qualified: { label: 'Qualified', badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20', dot: 'bg-indigo-500' },
  proposal:  { label: 'Proposal',  badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500' },
  won:       { label: 'Won',       badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
  lost:      { label: 'Lost',      badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', dot: 'bg-rose-500' },
}

const projectPhaseStyles: Record<string, { badge: string; bar: string }> = {
  development: { badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', bar: 'bg-blue-600' },
  design:      { badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20', bar: 'bg-indigo-600' },
  review:      { badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', bar: 'bg-amber-500' },
  planning:    { badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20', bar: 'bg-slate-500' },
  testing:     { badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20', bar: 'bg-teal-500' },
  completed:   { badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', bar: 'bg-emerald-600' },
  paused:      { badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', bar: 'bg-rose-500' },
}

// ─── Custom Fintech Chart Tooltip ──────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-[#0e1526] border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 shadow-dropdown text-xs">
        <p className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider mb-0.5">{label} 2026</p>
        <p className="text-slate-900 dark:text-slate-100 font-mono font-semibold text-sm">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    )
  }
  return null
}

// ─── High-Density Fintech Stat Card ────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  trend: number
  trendLabel: string
}

function StatCard({ label, value, icon, trend, trendLabel }: StatCardProps) {
  const isPositive = trend >= 0
  return (
    <div className="bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-700/80 transition-all flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
            {label}
          </span>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1 tracking-tight">
            {value}
          </p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/70 text-[11px]">
        {isPositive ? (
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
        )}
        <span className={`font-semibold font-mono ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {isPositive ? '+' : ''}{trend}%
        </span>
        <span className="text-slate-400">{trendLabel}</span>
      </div>
    </div>
  )
}

// ─── Main Overview Page ────────────────────────────────────────────────────
export default function OverviewPage() {
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
        cList,
        { data: lData },
        { data: payData },
        { data: tData },
        { data: tickData },
      ] = await Promise.all([
        (supabase as any).from('projects').select('*').order('created_at', { ascending: false }).catch(() => ({ data: [] })),
        getClients(),
        (supabase as any).from('leads').select('*').order('created_at', { ascending: false }).catch(() => ({ data: [] })),
        (supabase as any).from('payments').select('*').order('created_at', { ascending: false }).catch(() => ({ data: [] })),
        (supabase as any).from('tasks').select('*').order('updated_at', { ascending: false }).catch(() => ({ data: [] })),
        (supabase as any).from('support_tickets').select('*').order('created_at', { ascending: false }).catch(() => ({ data: [] })),
      ])

      if (pData) setProjects(pData)
      if (cList) setClients(cList)
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

  // Calculations
  const activeProjects = useMemo(() => projects.filter(p => p.status !== 'cancelled'), [projects])
  const activeClients  = useMemo(() => clients.filter(c => c.status === 'active'), [clients])
  const openTickets    = useMemo(() => tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed'), [tickets])
  const receivedTotal  = useMemo(
    () => payments.filter(p => p.status === 'received').reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [payments]
  )
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
    }))
    const ticketEvents = tickets.map(t => ({
      id: t.id,
      title: t.subject,
      subtitle: `Ticket · ${t.ticket_number}`,
      date: t.updated_at,
      type: 'ticket' as const,
      status: t.status,
    }))
    return [...taskEvents, ...ticketEvents]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6)
  }, [tasks, tickets])

  const dynamicRevenueData = useMemo(() => {
    return [
      { month: 'Jun', revenue: 0 },
      { month: 'Jul', revenue: 0 },
      { month: 'Aug', revenue: 0 },
      { month: 'Sep', revenue: 0 },
      { month: 'Oct', revenue: 0 },
      { month: 'Nov', revenue: receivedTotal },
    ]
  }, [receivedTotal])

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* ── Executive Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {greeting()}, Admin
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Telemetry
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · CapeSecure Operations Executive Overview
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadDashboardData}
            className="btn-secondary text-xs"
            title="Refresh Real-time Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <Link to="/admin/projects" className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </Link>
        </div>
      </div>

      {/* ── 4-Card KPI Matrix ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Realized Revenue"
          value={formatCurrency(receivedTotal)}
          icon={<CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
          trend={receivedTotal > 0 ? 100 : 0}
          trendLabel="settled funds"
        />
        <StatCard
          label="Active Projects"
          value={String(activeProjects.length)}
          icon={<Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
          trend={activeProjects.length}
          trendLabel="in active pipeline"
        />
        <StatCard
          label="Client Accounts"
          value={String(clients.length)}
          icon={<Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
          trend={activeClients.length}
          trendLabel="active corporate clients"
        />
        <StatCard
          label="Support Tickets"
          value={String(openTickets.length)}
          icon={<LifeBuoy className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
          trend={openTickets.length}
          trendLabel="awaiting resolution"
        />
      </div>

      {/* ── Split: Revenue Trajectory & Live Event Stream ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Analytics Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-slate-900 dark:text-slate-100 font-semibold text-sm">
                Cleared Revenue Trajectory
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">Verified bank settlements (INR ₹)</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                Total: {formatCurrency(receivedTotal)}
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicRevenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-[11px] fill-slate-400 font-mono" />
                <YAxis tickLine={false} axisLine={false} className="text-[11px] fill-slate-400 font-mono" tickFormatter={v => `₹${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Operational Events */}
        <div className="bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-900 dark:text-slate-100 font-semibold text-sm">Live Operational Stream</h2>
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">Events</span>
            </div>

            {recentActivity.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Clock className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                No events recorded yet. Updates appear as tasks and tickets progress.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentActivity.map(act => (
                  <div key={act.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-[#0b101d] border border-slate-100 dark:border-slate-800/80 text-xs">
                    <div className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{act.title}</p>
                      <p className="text-[10px] text-slate-400">{act.subtitle} · {formatDate(act.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link to="/admin/tasks" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            Manage All Tasks <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Active Projects & Financial Settlements ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Projects Pipeline */}
        <div className="bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-900 dark:text-slate-100 font-semibold text-sm">Active Development Projects</h2>
            <Link to="/admin/projects" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              View all ({projects.length}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Briefcase className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              No projects initialized yet. Approved quotations transition automatically.
            </div>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 4).map(p => {
                const style = projectPhaseStyles[p.status] || projectPhaseStyles.development
                return (
                  <div key={p.id} className="p-3 rounded-lg bg-slate-50 dark:bg-[#0b101d] border border-slate-200/80 dark:border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs">{p.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${style.badge}`}>
                            {p.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">Due {formatDate(p.deadline)}</span>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">{p.progress}%</span>
                    </div>

                    <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-2.5">
                      <div
                        className={`h-full ${style.bar}`}
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Financial Pipeline */}
        <div className="bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-900 dark:text-slate-100 font-semibold text-sm">Recent Financial Settlements</h2>
            <Link to="/admin/payments" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
              View all ({payments.length}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {payments.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <CreditCard className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              No settlement transactions recorded yet.
            </div>
          ) : (
            <div className="space-y-2">
              {payments.slice(0, 4).map(pay => {
                const client = clientMap[pay.client_id]
                return (
                  <div key={pay.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#0b101d] border border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{client?.name || pay.reference}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{pay.payment_type} · {pay.payment_method.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(pay.amount)}</p>
                      <span className="text-[9px] uppercase font-mono font-medium text-slate-400">{pay.status}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Active Leads Pipeline Table ── */}
      <div className="bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-slate-900 dark:text-slate-100 font-semibold text-sm">Active Enquiries & Leads</h2>
            <p className="text-slate-400 text-xs mt-0.5">Commercial acquisition pipeline</p>
          </div>
          <Link to="/admin/leads" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
            Open Leads ({leads.length}) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {leads.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <Users className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            No active enquiries in pipeline.
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Lead Contact</th>
                  <th>Company</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th className="text-right">Budget</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {topLeads.map(lead => {
                  const badge = statusBadges[lead.status] || statusBadges.new
                  return (
                    <tr key={lead.id}>
                      <td>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{lead.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{lead.email}</div>
                      </td>
                      <td className="text-slate-600 dark:text-slate-300">{lead.company || '—'}</td>
                      <td className="capitalize text-slate-500">{lead.source}</td>
                      <td>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium border ${badge.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                      </td>
                      <td className="text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {lead.budget ? formatCurrency(lead.budget) : '—'}
                      </td>
                      <td className="text-slate-400 font-mono text-[11px]">{formatDate(lead.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
