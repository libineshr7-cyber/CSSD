import React, { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Plus, X, Paintbrush, Eye, CheckCircle, RotateCcw, ChevronDown,
  Calendar, User, MessageSquare, FileImage, Clock
} from 'lucide-react'
import { demoProjects } from '../data/demoData'

// ─── Types ───────────────────────────────────────────────────────────────────

type ApprovalStatus = 'pending' | 'approved' | 'revision_requested'
type DesignStage = 'Wireframe' | 'Mockup' | 'Prototype' | 'Final'

interface DesignApproval {
  id: string
  projectId: string
  projectName: string
  clientName: string
  stage: DesignStage
  submittedDate: string
  reviewer: string
  comments: string
  status: ApprovalStatus
  fileUrl?: string
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const INITIAL_APPROVALS: DesignApproval[] = [
  {
    id: 'da-001', projectId: 'proj-001', projectName: 'Apex Financial Dashboard',
    clientName: 'David Chen', stage: 'Wireframe', submittedDate: '2026-11-05T09:00:00Z',
    reviewer: 'Sarah K.', comments: 'Layout looks good. Navigation needs to be clearer.',
    status: 'approved',
  },
  {
    id: 'da-002', projectId: 'proj-001', projectName: 'Apex Financial Dashboard',
    clientName: 'David Chen', stage: 'Mockup', submittedDate: '2026-11-14T10:30:00Z',
    reviewer: 'Sarah K.', comments: 'Colours need to be darker for the sidebar.',
    status: 'revision_requested',
  },
  {
    id: 'da-003', projectId: 'proj-002', projectName: 'StyleHaus E-Commerce',
    clientName: 'Amanda Steyn', stage: 'Wireframe', submittedDate: '2026-11-10T08:00:00Z',
    reviewer: 'Mark D.', comments: 'Awaiting client review.',
    status: 'pending',
  },
  {
    id: 'da-004', projectId: 'proj-002', projectName: 'StyleHaus E-Commerce',
    clientName: 'Amanda Steyn', stage: 'Mockup', submittedDate: '2026-11-18T11:00:00Z',
    reviewer: 'Mark D.', comments: 'Product card design needs more spacing.',
    status: 'pending',
  },
  {
    id: 'da-005', projectId: 'proj-003', projectName: 'Horizon Health Portal',
    clientName: 'Nomvula Dlamini', stage: 'Prototype', submittedDate: '2026-11-20T14:00:00Z',
    reviewer: 'Priya N.', comments: 'All interactions approved. Ready for final design.',
    status: 'approved',
  },
]

// ─── Constants ───────────────────────────────────────────────────────────────

const DESIGN_STAGES: DesignStage[] = ['Wireframe', 'Mockup', 'Prototype', 'Final']

type TabKey = 'pending' | 'approved' | 'revision_requested' | 'all'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending', label: 'Pending Approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'revision_requested', label: 'Revision Requested' },
  { key: 'all', label: 'All' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: ApprovalStatus) {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-700'
    case 'approved': return 'bg-green-100 text-green-700'
    case 'revision_requested': return 'bg-red-100 text-red-700'
  }
}

function statusLabel(status: ApprovalStatus) {
  switch (status) {
    case 'pending': return 'Pending'
    case 'approved': return 'Approved'
    case 'revision_requested': return 'Revision Requested'
  }
}

function stageColor(stage: DesignStage) {
  switch (stage) {
    case 'Wireframe': return 'bg-gray-100 text-gray-700'
    case 'Mockup': return 'bg-purple-100 text-purple-700'
    case 'Prototype': return 'bg-blue-100 text-blue-700'
    case 'Final': return 'bg-green-100 text-green-700'
  }
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Approval Card ────────────────────────────────────────────────────────────

function ApprovalCard({
  item,
  onApprove,
  onRevision,
}: {
  item: DesignApproval
  onApprove: (id: string) => void
  onRevision: (id: string) => void
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Preview placeholder */}
      <div className="h-40 bg-gray-100 flex flex-col items-center justify-center gap-2 border-b border-gray-200">
        <Paintbrush className="w-10 h-10 text-gray-300" />
        <span className="text-xs text-gray-400 font-medium">{item.stage} Preview</span>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 leading-tight">{item.projectName}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{item.clientName}</p>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${statusBadge(item.status)}`}>
            {statusLabel(item.status)}
          </span>
        </div>

        {/* Stage badge */}
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full self-start ${stageColor(item.stage)}`}>
          <FileImage className="w-3.5 h-3.5" />
          {item.stage}
        </span>

        {/* Meta */}
        <div className="space-y-1.5 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            Submitted {fmt(item.submittedDate)}
          </div>
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 flex-shrink-0" />
            Reviewer: {item.reviewer}
          </div>
          {item.comments && (
            <div className="flex items-start gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-2">{item.comments}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => onApprove(item.id)}
            disabled={item.status === 'approved'}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Approve
          </button>
          <button
            onClick={() => onRevision(item.id)}
            disabled={item.status === 'revision_requested'}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium hover:bg-orange-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Request Revision
          </button>
          <button
            onClick={() => toast('File viewer coming soon.')}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
            title="View File"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DesignApprovalsPage() {
  const [approvals, setApprovals] = useState<DesignApproval[]>(INITIAL_APPROVALS)
  const [activeTab, setActiveTab] = useState<TabKey>('pending')
  const [showModal, setShowModal] = useState(false)

  // Form
  const [form, setForm] = useState({
    projectId: '',
    stage: '' as DesignStage | '',
    reviewer: '',
    comments: '',
  })

  const filtered = approvals.filter(a => activeTab === 'all' || a.status === activeTab)

  function handleApprove(id: string) {
    setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' } : a))
    toast.success('Design approved!')
  }

  function handleRevision(id: string) {
    setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'revision_requested' } : a))
    toast('Revision requested.', { icon: '🔄' })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.projectId || !form.stage) {
      toast.error('Please select a project and design stage.')
      return
    }
    const project = demoProjects.find(p => p.id === form.projectId)
    const newApproval: DesignApproval = {
      id: `da-${Date.now()}`,
      projectId: form.projectId,
      projectName: project?.name || '',
      clientName: 'Client',
      stage: form.stage as DesignStage,
      submittedDate: new Date().toISOString(),
      reviewer: form.reviewer || 'Unassigned',
      comments: form.comments,
      status: 'pending',
    }
    setApprovals(prev => [newApproval, ...prev])
    toast.success('Design submitted for approval!')
    setShowModal(false)
    setForm({ projectId: '', stage: '', reviewer: '', comments: '' })
  }

  const tabCounts: Record<TabKey, number> = {
    pending: approvals.filter(a => a.status === 'pending').length,
    approved: approvals.filter(a => a.status === 'approved').length,
    revision_requested: approvals.filter(a => a.status === 'revision_requested').length,
    all: approvals.length,
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Design Approvals</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and approve design deliverables</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Submit for Approval
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6 w-fit flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs text-gray-400">({tabCounts[tab.key]})</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4">
            <Paintbrush className="w-8 h-8 text-purple-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No designs here</h3>
          <p className="text-sm text-gray-500">Submit a design for approval to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(item => (
            <ApprovalCard key={item.id} item={item} onApprove={handleApprove} onRevision={handleRevision} />
          ))}
        </div>
      )}

      {/* ── Submit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Submit Design for Approval</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select
                    value={form.projectId}
                    onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select project…</option>
                    {demoProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Design Stage <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select
                    value={form.stage}
                    onChange={e => setForm(f => ({ ...f, stage: e.target.value as DesignStage }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select stage…</option>
                    {DESIGN_STAGES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reviewer</label>
                <input
                  type="text"
                  value={form.reviewer}
                  onChange={e => setForm(f => ({ ...f, reviewer: e.target.value }))}
                  placeholder="e.g. Sarah K."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comments / Notes</label>
                <textarea
                  value={form.comments}
                  onChange={e => setForm(f => ({ ...f, comments: e.target.value }))}
                  rows={3}
                  placeholder="Add any context or notes for the reviewer…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
