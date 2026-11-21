import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Users, Briefcase, CreditCard, LifeBuoy,
  ArrowRight, Clock, CheckCircle2, AlertCircle, Circle, Plus,
  Layers, Download, Sparkles, Filter, ExternalLink
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { demoLeads, demoClients, demoProjects, demoPayments, demoTasks, demoTickets } from '../data/demoData'
import { formatCurrency, formatDate, getInitials } from '../lib/utils'

// ─── Revenue chart data ───────────────────────────────────────────
const revenueData = [
  { month: 'Jun', revenue: 42000 },
  { month: 'Jul', revenue: 28500 },
  { month: 'Aug', revenue: 61000 },
  { month: 'Sep', revenue: 37250 },
  { month: 'Oct', revenue: 55000 },
  { month: 'Nov', revenue: 189750 },
]

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
  paused: 'text-slate-500 bg-slate-100 dark:bg-[#333333] border-slate-300 dark:border-slate-700',
  completed: 'text-[#0ACF83] bg-[#0ACF83]/10 border-[#0ACF83]/20',
}

const projectProgressColors: Record<string, string> = {
  development: 'bg-[#0D99FF]',
  design: 'bg-[#A259FF]',
  review: 'bg-[#FFC700]',
  paused: 'bg-slate-400 dark:bg-slate-600',
  completed: 'bg-[#0ACF83]',
}

const priorityDot: Record<string, string> = {
  urgent: 'bg-[#F24E1E]',
  high: 'bg-[#FFC700]',
  medium: 'bg-[#0D99FF]',
  low: 'bg-slate-400',
}

// ─── Custom Figma Tooltip ──────────────────────────────────────────
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

  const activeProjects = useMemo(() => demoProjects.filter(p => p.status !== 'paused'), [])
  const activeClients  = useMemo(() => demoClients.filter(c => c.status === 'active'), [])
  const openTickets    = useMemo(() => demoTickets.filter(t => t.status !== 'resolved'), [])
  const receivedTotal  = useMemo(
    () => demoPayments.filter(p => p.status === 'received').reduce((s, p) => s + p.amount, 0),
    []
  )
  const pendingPayments = useMemo(() => demoPayments.filter(p => p.status === 'pending'), [])
  const recentPayments  = useMemo(() => demoPayments.filter(p => p.status === 'received'), [])
  const topLeads = useMemo(() => demoLeads.filter(l => l.status !== 'lost').slice(0, 5), [])

  const recentActivity = useMemo(() => {
    const taskEvents = demoTasks.map(t => ({
      id: t.id,
      title: t.title,
      subtitle: `Task · ${t.assigned_to ?? 'Unassigned'}`,
      date: t.updated_at,
      type: 'task' as const,
      status: t.status,
      priority: t.priority,
    }))
    const ticketEvents = demoTickets.map(t => ({
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
  }, [])

  return (
    <div className="space-y-6">

      {/* ── Figma Canvas Toolbar & Header ── */}
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
                <span className="w-1.5 h-1.5 rounded-full bg-[#0ACF83] animate-pulse" /> All Systems Active
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              {new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · CapeSecure Production Workspace
            </p>
          </div>
        </div>

        {/* Timeframe & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Segmented Timeframe Switcher */}
          <div className="flex items-center p-0.5 bg-slate-200/60 dark:bg-[#252525] rounded-lg border border-[#E5E5E5] dark:border-[#383838]">
            {(['7D', '30D', '90D', '1Y'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`relative px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  timeRange === t
                    ? 'bg-white dark:bg-[#383838] text-[#0D99FF] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <Link
            to="/admin/projects"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0D99FF] hover:bg-[#007BE5] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </Link>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(receivedTotal)}
          icon={<CreditCard className="w-4 h-4 text-[#0ACF83]" />}
          iconBg="bg-[#0ACF83]/10"
          trend={18}
          trendLabel="vs last month"
        />
        <StatCard
          label="Active Projects"
          value={String(activeProjects.length)}
          icon={<Briefcase className="w-4 h-4 text-[#0D99FF]" />}
          iconBg="bg-[#0D99FF]/10"
          trend={33}
          trendLabel="vs last quarter"
        />
        <StatCard
          label="Active Clients"
          value={String(activeClients.length)}
          icon={<Users className="w-4 h-4 text-[#A259FF]" />}
          iconBg="bg-[#A259FF]/10"
          trend={-5}
          trendLabel="vs last month"
        />
        <StatCard
          label="Open Tickets"
          value={String(openTickets.length)}
          icon={<LifeBuoy className="w-4 h-4 text-[#FFC700]" />}
          iconBg="bg-[#FFC700]/15"
          trend={-25}
          trendLabel="vs last week"
        />
      </div>

      {/* ── Revenue Chart + Recent Activity ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* Revenue Chart */}
        <div className="xl:col-span-3 bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-slate-900 dark:text-[#F5F5F5] font-semibold text-sm">
                  Revenue Performance
                </h2>
                <span className="text-[10px] font-mono text-[#0ACF83] bg-[#0ACF83]/10 px-2 py-0.5 rounded-full border border-[#0ACF83]/20 font-semibold">
                  +18% MoM
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">Last 6 months verified billing</p>
            </div>
            <Link to="/admin/reports" className="text-xs font-semibold text-[#0D99FF] hover:underline flex items-center gap-1">
              Detailed Analytics <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="h-[210px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} barSize={26}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-10" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#888888', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#888888', fontSize: 11 }}
                  tickFormatter={v => `R${(v / 1000).toFixed(0)}k`}
                  width={46}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(13, 153, 255, 0.06)' }} />
                <Bar dataKey="revenue" fill="#0D99FF" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity Timeline */}
        <div className="xl:col-span-2 bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#F0F0F0] dark:border-[#383838]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#A259FF]" />
                <h2 className="text-slate-900 dark:text-[#F5F5F5] font-semibold text-sm">
                  Live Activity Stream
                </h2>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Real-time</span>
            </div>

            <div className="space-y-2">
              {recentActivity.map((item, i) => (
                <div key={item.id} className="relative flex items-center gap-3 py-1.5 group">
                  <div className="relative z-10 flex-shrink-0">
                    {item.type === 'task' ? (
                      item.status === 'done' ? (
                        <CheckCircle2 className="w-4 h-4 text-[#0ACF83]" />
                      ) : (
                        <Circle className="w-4 h-4 text-[#0D99FF]" />
                      )
                    ) : (
                      item.status === 'resolved' ? (
                        <CheckCircle2 className="w-4 h-4 text-[#0ACF83]" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-[#FFC700]" />
                      )
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 dark:text-slate-200 text-xs font-medium leading-tight truncate group-hover:text-[#0D99FF] transition-colors">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                      <span>{item.subtitle}</span>
                      <span>·</span>
                      <span>{formatDate(item.date, 'relative')}</span>
                    </div>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priorityDot[item.priority] ?? 'bg-slate-400'}`} />
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/admin/tasks"
            className="mt-3 pt-2 border-t border-[#F0F0F0] dark:border-[#383838] text-xs font-semibold text-[#0D99FF] hover:underline flex items-center justify-between"
          >
            <span>Open Tasks Board</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Project Progress + Payment Pipeline ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Project Progress */}
        <div className="bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0D99FF]" />
              <h2 className="text-slate-900 dark:text-[#F5F5F5] font-semibold text-sm">
                Project Milestone Tracking
              </h2>
            </div>
            <Link to="/admin/projects" className="flex items-center gap-1 text-[#0D99FF] hover:underline text-xs font-semibold">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {demoProjects.slice(0, 4).map(project => (
              <div key={project.id} className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#252525] border border-[#E5E5E5]/60 dark:border-[#383838]">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-slate-800 dark:text-slate-200 text-xs font-semibold truncate">
                      {project.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${projectStatusColors[project.status] ?? 'text-slate-500 bg-slate-100'}`}>
                        {project.status}
                      </span>
                      <span className="text-slate-400 text-[11px]">Due {formatDate(project.deadline)}</span>
                    </div>
                  </div>
                  <span className="text-slate-900 dark:text-[#F5F5F5] font-bold text-xs font-mono">{project.progress}%</span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-slate-200 dark:bg-[#383838] rounded-full overflow-hidden mt-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${project.progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${projectProgressColors[project.status] ?? 'bg-slate-400'}`}
                  />
                </div>

                {/* Tech stack */}
                <div className="flex gap-1.5 mt-2.5 flex-wrap">
                  {project.tech_stack?.slice(0, 3).map(tech => (
                    <span key={tech} className="text-slate-500 dark:text-slate-400 bg-white dark:bg-[#1E1E1E] border border-slate-200 dark:border-[#383838] text-[9px] px-1.5 py-0.5 rounded font-mono">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Pipeline */}
        <div className="bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#0ACF83]" />
              <h2 className="text-slate-900 dark:text-[#F5F5F5] font-semibold text-sm">
                Financial Transactions
              </h2>
            </div>
            <Link to="/admin/payments" className="flex items-center gap-1 text-[#0D99FF] hover:underline text-xs font-semibold">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Pending */}
          {pendingPayments.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Upcoming / Pending</p>
              <div className="space-y-1.5">
                {pendingPayments.slice(0, 2).map(pay => {
                  const client = demoClients.find(c => c.id === pay.client_id)
                  return (
                    <div key={pay.id} className="flex items-center gap-3 bg-slate-50 dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-xl px-3 py-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#FFC700]/15 flex items-center justify-center flex-shrink-0 text-[#FFC700] text-xs font-bold">
                        {getInitials(client?.company ?? pay.reference)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-800 dark:text-slate-200 text-xs font-medium truncate">{client?.company ?? pay.reference}</p>
                        <p className="text-slate-400 text-[10px] capitalize">{pay.payment_type} · {pay.payment_method.replace('_', ' ')}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-slate-800 dark:text-slate-200 font-bold text-xs">{formatCurrency(pay.amount)}</p>
                        <span className="text-[9px] font-semibold text-amber-600 dark:text-[#FFC700] bg-[#FFC700]/15 px-1.5 py-0.5 rounded">Pending</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Received */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Recently Received</p>
            <div className="space-y-1.5">
              {recentPayments.slice(0, 3).map(pay => {
                const client = demoClients.find(c => c.id === pay.client_id)
                return (
                  <div key={pay.id} className="flex items-center gap-3 bg-slate-50 dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-xl px-3 py-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#0ACF83]/15 flex items-center justify-center flex-shrink-0 text-[#0ACF83] text-xs font-bold">
                      {getInitials(client?.company ?? pay.reference)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 dark:text-slate-200 text-xs font-medium truncate">{client?.company ?? pay.reference}</p>
                      <p className="text-slate-400 text-[10px]">{formatDate(pay.received_date)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[#0ACF83] font-bold text-xs">{formatCurrency(pay.amount)}</p>
                      <span className="text-[9px] font-semibold text-[#0ACF83] bg-[#0ACF83]/10 px-1.5 py-0.5 rounded">Received</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Leads Pipeline ── */}
      <div className="bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-slate-900 dark:text-[#F5F5F5] font-semibold text-sm">Active Leads Pipeline</h2>
            <p className="text-slate-400 text-xs mt-0.5">Top qualified prospects in funnel</p>
          </div>
          <Link to="/admin/leads" className="flex items-center gap-1 text-[#0D99FF] hover:underline text-xs font-semibold">
            Open Pipeline <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E5E5E5] dark:border-[#383838]">
                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider pb-2.5 pr-4">Lead</th>
                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider pb-2.5 pr-4">Company</th>
                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider pb-2.5 pr-4">Source</th>
                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider pb-2.5 pr-4">Status</th>
                <th className="text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider pb-2.5 pr-4">Budget</th>
                <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider pb-2.5">Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0F0] dark:divide-[#383838]">
              {topLeads.map(lead => (
                <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-[#252525] transition-colors group">
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#0D99FF]/10 text-[#0D99FF] flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                        {getInitials(lead.name)}
                      </div>
                      <div>
                        <p className="text-slate-800 dark:text-slate-200 font-semibold">{lead.name}</p>
                        <p className="text-slate-400 text-[10px]">{lead.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300 font-medium">
                    {lead.company}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="text-slate-500 capitalize text-[10px] bg-slate-100 dark:bg-[#252525] px-2 py-0.5 rounded">
                      {lead.source}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusColors[lead.status] ?? 'text-slate-400 bg-slate-100'}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {lead.budget ? formatCurrency(lead.budget) : '—'}
                  </td>
                  <td className="py-2.5 text-slate-400 text-[11px]">
                    {lead.next_follow_up ? formatDate(lead.next_follow_up) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
