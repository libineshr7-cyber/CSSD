import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Users, Briefcase, CreditCard, LifeBuoy,
  ArrowRight, Clock, CheckCircle2, AlertCircle, Circle,
} from 'lucide-react'
import { demoLeads, demoClients, demoProjects, demoPayments, demoTasks, demoTickets } from '../data/demoData'
import { formatCurrency, formatDate, getInitials } from '../lib/utils'

// ─── Mock revenue chart data (last 6 months) ───────────────────────────────
const revenueData = [
  { month: 'Jun', revenue: 42000 },
  { month: 'Jul', revenue: 28500 },
  { month: 'Aug', revenue: 61000 },
  { month: 'Sep', revenue: 37250 },
  { month: 'Oct', revenue: 55000 },
  { month: 'Nov', revenue: 189750 },
]

// ─── Helpers ────────────────────────────────────────────────────────────────
function getHour() {
  return new Date().getHours()
}

function greeting() {
  const h = getHour()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const statusColors: Record<string, string> = {
  new: 'text-slate-400 bg-slate-800',
  contacted: 'text-blue-400 bg-blue-500/10',
  qualified: 'text-violet-400 bg-violet-500/10',
  proposal: 'text-amber-400 bg-amber-500/10',
  won: 'text-emerald-400 bg-emerald-500/10',
  lost: 'text-rose-400 bg-rose-500/10',
}

const projectStatusColors: Record<string, string> = {
  development: 'text-blue-400 bg-blue-500/10',
  design: 'text-violet-400 bg-violet-500/10',
  review: 'text-amber-400 bg-amber-500/10',
  paused: 'text-slate-400 bg-slate-800',
  completed: 'text-emerald-400 bg-emerald-500/10',
}

const projectProgressColors: Record<string, string> = {
  development: 'bg-blue-500',
  design: 'bg-violet-500',
  review: 'bg-amber-500',
  paused: 'bg-slate-600',
  completed: 'bg-emerald-500',
}

const priorityDot: Record<string, string> = {
  urgent: 'bg-rose-500',
  high: 'bg-amber-500',
  medium: 'bg-blue-500',
  low: 'bg-slate-500',
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 shadow-xl">
        <p className="text-slate-400 text-xs mb-1">{label}</p>
        <p className="text-white font-semibold text-sm">{formatCurrency(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string
  icon: React.ReactNode
  iconBg: string
  trend: number
  trendLabel: string
}

function StatCard({ label, value, icon, iconBg, trend, trendLabel }: StatCardProps) {
  const isPositive = trend >= 0
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {isPositive
          ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
        <span className={`text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isPositive ? '+' : ''}{trend}%
        </span>
        <span className="text-slate-500 text-xs">{trendLabel}</span>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function OverviewPage() {
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

  // Recent activity: merge tasks + tickets sorted by updated_at desc
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
      .slice(0, 7)
  }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{greeting()}, Admin 👋</h1>
          <p className="text-slate-400 text-sm mt-1">
            {new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 text-sm font-medium">All systems operational</span>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(receivedTotal)}
          icon={<CreditCard className="w-5 h-5 text-emerald-400" />}
          iconBg="bg-emerald-500/10"
          trend={18}
          trendLabel="vs last month"
        />
        <StatCard
          label="Active Projects"
          value={String(activeProjects.length)}
          icon={<Briefcase className="w-5 h-5 text-blue-400" />}
          iconBg="bg-blue-500/10"
          trend={33}
          trendLabel="vs last quarter"
        />
        <StatCard
          label="Active Clients"
          value={String(activeClients.length)}
          icon={<Users className="w-5 h-5 text-violet-400" />}
          iconBg="bg-violet-500/10"
          trend={-5}
          trendLabel="vs last month"
        />
        <StatCard
          label="Open Tickets"
          value={String(openTickets.length)}
          icon={<LifeBuoy className="w-5 h-5 text-amber-400" />}
          iconBg="bg-amber-500/10"
          trend={-25}
          trendLabel="vs last week"
        />
      </div>

      {/* ── Revenue Chart + Recent Activity ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* Revenue Chart */}
        <div className="xl:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-white font-semibold">Revenue Overview</h2>
              <p className="text-slate-500 text-xs mt-0.5">Last 6 months</p>
            </div>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
              +18% MoM
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={v => `R${(v / 1000).toFixed(0)}k`}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Recent Activity</h2>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          <div className="space-y-1">
            {recentActivity.map((item, i) => (
              <div key={item.id} className="relative flex gap-3 py-2.5">
                {/* Timeline line */}
                {i < recentActivity.length - 1 && (
                  <div className="absolute left-[13px] top-7 bottom-0 w-px bg-slate-800" />
                )}
                {/* Icon */}
                <div className="relative z-10 mt-0.5 flex-shrink-0">
                  {item.type === 'task' ? (
                    item.status === 'done'
                      ? <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      : item.status === 'in_progress'
                        ? <Circle className="w-6 h-6 text-blue-400" />
                        : <Circle className="w-6 h-6 text-slate-600" />
                  ) : (
                    item.status === 'resolved'
                      ? <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      : <AlertCircle className="w-6 h-6 text-amber-400" />
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm font-medium leading-tight truncate">{item.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-slate-500 text-xs">{item.subtitle}</span>
                    <span className="text-slate-700">·</span>
                    <span className="text-slate-600 text-xs">{formatDate(item.date, 'relative')}</span>
                  </div>
                </div>
                {/* Priority dot */}
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${priorityDot[item.priority] ?? 'bg-slate-600'}`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Project Progress + Payment Pipeline ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Project Progress */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold">Project Progress</h2>
            <button className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-5">
            {demoProjects.map(project => (
              <div key={project.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-slate-200 text-sm font-medium truncate">{project.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${projectStatusColors[project.status] ?? 'text-slate-400 bg-slate-800'}`}>
                        {project.status}
                      </span>
                      <span className="text-slate-600 text-xs">Due {formatDate(project.deadline)}</span>
                    </div>
                  </div>
                  <span className="text-white font-bold text-sm tabular-nums">{project.progress}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${projectProgressColors[project.status] ?? 'bg-slate-600'}`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                {/* Tech stack tags */}
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {project.tech_stack?.map(tech => (
                    <span key={tech} className="text-slate-500 bg-slate-800 text-[10px] px-2 py-0.5 rounded-md font-mono">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Pipeline */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold">Payment Pipeline</h2>
            <button className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Pending */}
          {pendingPayments.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Upcoming / Pending</p>
              <div className="space-y-2">
                {pendingPayments.map(pay => {
                  const client = demoClients.find(c => c.id === pay.client_id)
                  return (
                    <div key={pay.id} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-400 text-xs font-bold">{getInitials(client?.company ?? pay.reference)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-200 text-sm font-medium truncate">{client?.company ?? pay.reference}</p>
                        <p className="text-slate-500 text-xs capitalize">{pay.payment_type} · {pay.payment_method.replace('_', ' ')}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-amber-400 font-semibold text-sm">{formatCurrency(pay.amount)}</p>
                        <span className="text-[10px] font-medium text-amber-400/70 bg-amber-500/10 px-2 py-0.5 rounded-full">Pending</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Received */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Recently Received</p>
            <div className="space-y-2">
              {recentPayments.map(pay => {
                const client = demoClients.find(c => c.id === pay.client_id)
                return (
                  <div key={pay.id} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-400 text-xs font-bold">{getInitials(client?.company ?? pay.reference)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 text-sm font-medium truncate">{client?.company ?? pay.reference}</p>
                      <p className="text-slate-500 text-xs">{formatDate(pay.received_date)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-emerald-400 font-semibold text-sm">{formatCurrency(pay.amount)}</p>
                      <span className="text-[10px] font-medium text-emerald-400/70 bg-emerald-500/10 px-2 py-0.5 rounded-full">Received</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Leads ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-white font-semibold">Active Leads</h2>
            <p className="text-slate-500 text-xs mt-0.5">Top prospects in pipeline</p>
          </div>
          <button className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider pb-3 pr-4">Lead</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider pb-3 pr-4">Company</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider pb-3 pr-4">Source</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider pb-3 pr-4">Status</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider pb-3 pr-4">Budget</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider pb-3">Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {topLeads.map(lead => (
                <tr key={lead.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-400 text-xs font-semibold">{getInitials(lead.name)}</span>
                      </div>
                      <div>
                        <p className="text-slate-200 font-medium">{lead.name}</p>
                        <p className="text-slate-500 text-xs">{lead.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className="text-slate-300">{lead.company}</span>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className="text-slate-400 capitalize text-xs bg-slate-800 px-2.5 py-1 rounded-full">
                      {lead.source}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusColors[lead.status] ?? 'text-slate-400 bg-slate-800'}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 text-right">
                    <span className="text-slate-200 font-medium tabular-nums">
                      {lead.budget ? formatCurrency(lead.budget) : '—'}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <span className="text-slate-400 text-xs">
                      {lead.next_follow_up ? formatDate(lead.next_follow_up) : '—'}
                    </span>
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
