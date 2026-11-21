import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Shield,
  Plus,
  X,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { formatDate, formatCurrency } from '../lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type PlanType = 'Basic' | 'Standard' | 'Premium'
type PlanStatus = 'active' | 'expiring' | 'expired'
type RenewalType = 'domain' | 'hosting' | 'maintenance'

interface MaintenancePlan {
  id: string
  client: string
  website: string
  planType: PlanType
  monthlyCost: number
  startDate: string
  renewalDate: string
  status: PlanStatus
}

interface RenewalItem {
  id: string
  website: string
  client: string
  renewalType: RenewalType
  cost: number
  renewalDate: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const INITIAL_PLANS: MaintenancePlan[] = [
  { id: 'mp-001', client: 'Apex Financial', website: 'apexfin.co.za', planType: 'Premium', monthlyCost: 2500, startDate: '2026-02-01', renewalDate: '2027-02-01', status: 'active' },
  { id: 'mp-002', client: 'StyleHaus Fashion', website: 'stylehaus.co.za', planType: 'Standard', monthlyCost: 1500, startDate: '2026-05-15', renewalDate: '2027-05-15', status: 'active' },
  { id: 'mp-003', client: 'Horizon Health Clinic', website: 'horizonhealth.co.za', planType: 'Premium', monthlyCost: 3000, startDate: '2025-12-01', renewalDate: '2026-12-01', status: 'expiring' },
  { id: 'mp-004', client: 'Pinnacle Properties', website: 'pinnacleprops.co.za', planType: 'Basic', monthlyCost: 800, startDate: '2025-10-01', renewalDate: '2026-10-01', status: 'expired' },
  { id: 'mp-005', client: 'Cape Craft Brews', website: 'capebrews.co.za', planType: 'Basic', monthlyCost: 800, startDate: '2026-08-01', renewalDate: '2027-08-01', status: 'active' },
  { id: 'mp-006', client: 'Luxe Brides', website: 'luxebrides.co.za', planType: 'Standard', monthlyCost: 1200, startDate: '2026-01-20', renewalDate: '2026-12-05', status: 'expiring' },
]

const INITIAL_RENEWALS: RenewalItem[] = [
  { id: 'rn-001', website: 'horizonhealth.co.za', client: 'Horizon Health', renewalType: 'maintenance', cost: 3000, renewalDate: '2026-12-01' },
  { id: 'rn-002', website: 'luxebrides.co.za', client: 'Luxe Brides', renewalType: 'domain', cost: 350, renewalDate: '2026-12-05' },
  { id: 'rn-003', website: 'apexfin.co.za', client: 'Apex Financial', renewalType: 'hosting', cost: 1200, renewalDate: '2027-01-15' },
  { id: 'rn-004', website: 'stylehaus.co.za', client: 'StyleHaus Fashion', renewalType: 'hosting', cost: 950, renewalDate: '2027-02-10' },
  { id: 'rn-005', website: 'capebrews.co.za', client: 'Cape Craft Brews', renewalType: 'domain', cost: 350, renewalDate: '2027-03-01' },
]

const PLAN_COLORS: Record<PlanType, string> = {
  Basic: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  Standard: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Premium: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const now = new Date()
  const target = new Date(dateStr)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function urgencyColor(days: number) {
  if (days < 7) return 'text-red-600 dark:text-red-400'
  if (days <= 30) return 'text-orange-600 dark:text-orange-400'
  return 'text-green-600 dark:text-green-400'
}

function urgencyBg(days: number) {
  if (days < 7) return 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800'
  if (days <= 30) return 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800'
  return 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
}

function StatusBadge({ status }: { status: PlanStatus }) {
  const cfg = {
    active: { label: 'Active', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', Icon: CheckCircle2 },
    expiring: { label: 'Expiring Soon', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', Icon: AlertTriangle },
    expired: { label: 'Expired', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', Icon: X },
  }[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
      <cfg.Icon size={11} />
      {cfg.label}
    </span>
  )
}

// ─── Add Plan Modal ───────────────────────────────────────────────────────────

interface AddPlanModalProps {
  onClose: () => void
  onAdd: (plan: MaintenancePlan) => void
}

function AddPlanModal({ onClose, onAdd }: AddPlanModalProps) {
  const [form, setForm] = useState({
    client: '',
    website: '',
    planType: 'Basic' as PlanType,
    monthlyCost: '',
    startDate: '',
    renewalPeriod: '12',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client || !form.website || !form.startDate) {
      toast.error('Please fill in all required fields.')
      return
    }
    const start = new Date(form.startDate)
    const renewal = new Date(start)
    renewal.setMonth(renewal.getMonth() + parseInt(form.renewalPeriod))

    onAdd({
      id: `mp-${Date.now()}`,
      client: form.client,
      website: form.website,
      planType: form.planType,
      monthlyCost: parseFloat(form.monthlyCost) || 0,
      startDate: form.startDate,
      renewalDate: renewal.toISOString().slice(0, 10),
      status: 'active',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Maintenance Plan</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {[
            { label: 'Client Name *', key: 'client', type: 'text', placeholder: 'e.g. Apex Financial' },
            { label: 'Website URL *', key: 'website', type: 'text', placeholder: 'e.g. example.co.za' },
            { label: 'Monthly Cost (ZAR)', key: 'monthlyCost', type: 'number', placeholder: '0.00' },
            { label: 'Start Date *', key: 'startDate', type: 'date', placeholder: '' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label}</label>
              <input
                type={f.type}
                placeholder={f.placeholder}
                value={(form as Record<string, string>)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan Type</label>
            <select
              value={form.planType}
              onChange={e => setForm(p => ({ ...p, planType: e.target.value as PlanType }))}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option>Basic</option>
              <option>Standard</option>
              <option>Premium</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Renewal Period</label>
            <select
              value={form.renewalPeriod}
              onChange={e => setForm(p => ({ ...p, renewalPeriod: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="1">Monthly</option>
              <option value="6">6 Months</option>
              <option value="12">Annual</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
              Add Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MaintenancePage() {
  const [plans, setPlans] = useState<MaintenancePlan[]>(INITIAL_PLANS)
  const [renewals] = useState<RenewalItem[]>(
    [...INITIAL_RENEWALS].sort((a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime())
  )
  const [activeTab, setActiveTab] = useState<'plans' | 'renewals'>('plans')
  const [showModal, setShowModal] = useState(false)
  const [sortField, setSortField] = useState<keyof MaintenancePlan>('renewalDate')
  const [sortAsc, setSortAsc] = useState(true)

  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const activePlans = plans.filter(p => p.status === 'active').length
  const expiringSoon = plans.filter(p => {
    const d = new Date(p.renewalDate)
    return d > now && d <= thirtyDaysFromNow
  }).length
  const expired = plans.filter(p => p.status === 'expired').length
  const mrr = plans.filter(p => p.status === 'active').reduce((s, p) => s + p.monthlyCost, 0)

  function handleSort(field: keyof MaintenancePlan) {
    if (sortField === field) setSortAsc(a => !a)
    else { setSortField(field); setSortAsc(true) }
  }

  const sortedPlans = [...plans].sort((a, b) => {
    const av = a[sortField] as string | number
    const bv = b[sortField] as string | number
    if (av < bv) return sortAsc ? -1 : 1
    if (av > bv) return sortAsc ? 1 : -1
    return 0
  })

  function deletePlan(id: string) {
    setPlans(p => p.filter(x => x.id !== id))
    toast.success('Plan removed.')
  }

  function SortIcon({ field }: { field: keyof MaintenancePlan }) {
    if (sortField !== field) return null
    return sortAsc ? <ChevronUp size={14} className="inline ml-1" /> : <ChevronDown size={14} className="inline ml-1" />
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Maintenance</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage maintenance plans and renewal schedules.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus size={16} /> Add Plan
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Plans', value: activePlans, icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Expiring Soon', value: expiringSoon, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
          { label: 'Expired', value: expired, icon: X, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Monthly Revenue', value: formatCurrency(mrr), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 ${s.bg} border border-gray-200 dark:border-gray-700`}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={16} className={s.color} />
              <span className="text-xs text-gray-500 dark:text-gray-400">{s.label}</span>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        {(['plans', 'renewals'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab === 'plans' ? 'Maintenance Plans' : 'Renewal Schedule'}
          </button>
        ))}
      </div>

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 text-left">
                  {[
                    { label: 'Client', field: 'client' as keyof MaintenancePlan },
                    { label: 'Website', field: 'website' as keyof MaintenancePlan },
                    { label: 'Plan', field: 'planType' as keyof MaintenancePlan },
                    { label: 'Monthly Cost', field: 'monthlyCost' as keyof MaintenancePlan },
                    { label: 'Start Date', field: 'startDate' as keyof MaintenancePlan },
                    { label: 'Renewal Date', field: 'renewalDate' as keyof MaintenancePlan },
                    { label: 'Status', field: 'status' as keyof MaintenancePlan },
                  ].map(col => (
                    <th
                      key={col.field}
                      onClick={() => handleSort(col.field)}
                      className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none whitespace-nowrap"
                    >
                      {col.label}
                      <SortIcon field={col.field} />
                    </th>
                  ))}
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {sortedPlans.map(plan => (
                  <tr key={plan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{plan.client}</td>
                    <td className="px-4 py-3 text-blue-600 dark:text-blue-400 whitespace-nowrap">{plan.website}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PLAN_COLORS[plan.planType]}`}>{plan.planType}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatCurrency(plan.monthlyCost)}/mo</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(plan.startDate)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(plan.renewalDate)}</td>
                    <td className="px-4 py-3"><StatusBadge status={plan.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deletePlan(plan.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Renewal Schedule Tab */}
      {activeTab === 'renewals' && (
        <div className="space-y-3">
          {renewals.map(r => {
            const days = daysUntil(r.renewalDate)
            const typeColors: Record<RenewalType, string> = {
              domain: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
              hosting: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
              maintenance: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
            }
            return (
              <div
                key={r.id}
                className={`flex items-center justify-between p-4 rounded-xl border ${urgencyBg(days)}`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center w-14 text-center">
                    <span className={`text-2xl font-bold ${urgencyColor(days)}`}>{days < 0 ? 0 : days}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">days</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{r.website}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{r.client}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${typeColors[r.renewalType]}`}>{r.renewalType}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(r.cost)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(r.renewalDate)}</p>
                  </div>
                  <div>
                    {days < 7 ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-red-600"><AlertTriangle size={12} /> Urgent</span>
                    ) : days <= 30 ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-orange-600"><Clock size={12} /> Soon</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-green-600"><CheckCircle2 size={12} /> OK</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <AddPlanModal
          onClose={() => setShowModal(false)}
          onAdd={plan => {
            setPlans(p => [...p, plan])
            setShowModal(false)
            toast.success('Maintenance plan added!')
          }}
        />
      )}
    </div>
  )
}
