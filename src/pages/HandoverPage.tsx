import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  CheckSquare,
  Square,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  Globe,
} from 'lucide-react'
import { demoProjects, demoClients } from '../data/demoData'
import { formatDate } from '../lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type HandoverStatus = 'pending' | 'in_progress' | 'completed'

interface ChecklistItem {
  id: string
  label: string
  checked: boolean
}

interface HandoverRecord {
  projectId: string
  status: HandoverStatus
  completionDate: string
  items: ChecklistItem[]
  expanded: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHECKLIST_TEMPLATE: Omit<ChecklistItem, 'checked'>[] = [
  { id: 'final_payment', label: 'Final payment received' },
  { id: 'website_tested', label: 'Website tested and approved' },
  { id: 'domain_transferred', label: 'Domain transferred to client' },
  { id: 'hosting_credentials', label: 'Hosting credentials provided' },
  { id: 'cms_training', label: 'CMS training completed' },
  { id: 'documentation', label: 'Documentation delivered' },
  { id: 'support_period', label: 'Support period explained' },
  { id: 'satisfaction_survey', label: 'Client satisfaction survey sent' },
  { id: 'analytics_access', label: 'Google Analytics access provided' },
  { id: 'ssl_verified', label: 'SSL certificate verified' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildInitialHandovers(): Record<string, HandoverRecord> {
  const eligibleProjects = demoProjects.filter(p =>
    ['review', 'testing', 'deployment'].includes(p.status)
  )
  const result: Record<string, HandoverRecord> = {}
  eligibleProjects.forEach(p => {
    result[p.id] = {
      projectId: p.id,
      status: 'pending',
      completionDate: p.deadline ?? new Date().toISOString(),
      expanded: false,
      items: CHECKLIST_TEMPLATE.map(t => ({ ...t, checked: false })),
    }
  })
  return result
}

function deriveStatus(items: ChecklistItem[]): HandoverStatus {
  const checked = items.filter(i => i.checked).length
  if (checked === 0) return 'pending'
  if (checked === items.length) return 'completed'
  return 'in_progress'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: HandoverStatus }) {
  const cfg = {
    pending: { label: 'Pending', cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', Icon: Clock },
    in_progress: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', Icon: AlertCircle },
    completed: { label: 'Completed', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', Icon: CheckCircle2 },
  }[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
      <cfg.Icon size={12} />
      {cfg.label}
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HandoverPage() {
  const [handovers, setHandovers] = useState<Record<string, HandoverRecord>>(buildInitialHandovers)

  const eligibleProjects = demoProjects.filter(p =>
    ['review', 'testing', 'deployment'].includes(p.status)
  )

  function toggleItem(projectId: string, itemId: string) {
    setHandovers(prev => {
      const record = prev[projectId]
      const updatedItems = record.items.map(item =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
      return {
        ...prev,
        [projectId]: {
          ...record,
          items: updatedItems,
          status: deriveStatus(updatedItems),
        },
      }
    })
  }

  function toggleExpanded(projectId: string) {
    setHandovers(prev => ({
      ...prev,
      [projectId]: { ...prev[projectId], expanded: !prev[projectId].expanded },
    }))
  }

  function completeHandover(projectId: string) {
    setHandovers(prev => ({
      ...prev,
      [projectId]: { ...prev[projectId], status: 'completed' },
    }))
    toast.success('Handover marked as complete!')
  }

  const stats = Object.values(handovers).reduce(
    (acc, h) => {
      acc[h.status]++
      return acc
    },
    { pending: 0, in_progress: 0, completed: 0 }
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Client Handover</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Track handover checklists for projects in review, testing, and deployment.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Pending', value: stats.pending, color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-800' },
          { label: 'In Progress', value: stats.in_progress, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Completed', value: stats.completed, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 ${s.bg} border border-gray-200 dark:border-gray-700`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Handover Cards */}
      {eligibleProjects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle2 size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No projects ready for handover</p>
          <p className="text-sm">Projects in review, testing, or deployment will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {eligibleProjects.map(project => {
            const client = demoClients.find(c => c.id === project.client_id)
            const handover = handovers[project.id]
            if (!handover) return null
            const checkedCount = handover.items.filter(i => i.checked).length
            const total = handover.items.length
            const pct = Math.round((checkedCount / total) * 100)
            const allChecked = checkedCount === total

            return (
              <div
                key={project.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between p-5 cursor-pointer" onClick={() => toggleExpanded(project.id)}>
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <Globe size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">{project.name}</h2>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1"><User size={12} /> {client?.company ?? client?.name ?? '—'}</span>
                        <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(handover.completionDate)}</span>
                        <span>{checkedCount}/{total} items</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <StatusBadge status={handover.status} />
                    {handover.expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="px-5 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 w-10 text-right">{pct}%</span>
                  </div>
                </div>

                {/* Checklist (expanded) */}
                {handover.expanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700 p-5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {handover.items.map(item => (
                        <button
                          key={item.id}
                          onClick={() => toggleItem(project.id, item.id)}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left w-full"
                        >
                          {item.checked ? (
                            <CheckSquare size={18} className="text-green-500 flex-shrink-0" />
                          ) : (
                            <Square size={18} className="text-gray-400 flex-shrink-0" />
                          )}
                          <span className={`text-sm ${item.checked ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Action */}
                    <div className="flex justify-end pt-2">
                      <button
                        disabled={!allChecked || handover.status === 'completed'}
                        onClick={() => completeHandover(project.id)}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                          allChecked && handover.status !== 'completed'
                            ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {handover.status === 'completed' ? '✓ Handover Complete' : 'Complete Handover'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
