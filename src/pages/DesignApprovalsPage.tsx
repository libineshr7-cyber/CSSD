import React, { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  Plus, X, Paintbrush, Eye, CheckCircle, RotateCcw, ChevronDown,
  Calendar, User, MessageSquare, FileImage, Clock, ExternalLink,
  CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, LayoutGrid,
  List, Check, Sparkles, Send, History, ArrowRight, Tag
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getClients } from '../lib/clientStore'
import { formatDate } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import type {
  Project,
  Client,
  DesignApproval,
  DesignStage,
  DesignApprovalStatus,
  ProjectRevision,
  RevisionStatus,
  RevisionPriority
} from '../types/database'

const DESIGN_STAGES: DesignStage[] = ['Wireframe', 'Mockup', 'Prototype', 'Final']

const STAGE_CONFIG: Record<DesignStage, { badge: string; color: string }> = {
  Wireframe: { badge: 'bg-slate-500/10 text-slate-300 border-slate-500/20',  color: 'text-slate-400' },
  Mockup:    { badge: 'bg-purple-500/10 text-purple-300 border-purple-500/20', color: 'text-purple-400' },
  Prototype: { badge: 'bg-blue-500/10 text-blue-300 border-blue-500/20',     color: 'text-blue-400' },
  Final:     { badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', color: 'text-emerald-400' },
}

const STATUS_CONFIG: Record<DesignApprovalStatus, { badge: string; label: string }> = {
  pending:            { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   label: 'Pending Review' },
  approved:           { badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Approved & Signed Off' },
  revision_requested: { badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',     label: 'Revision Requested' },
}

const REVISION_STATUS_CONFIG: Record<RevisionStatus, { badge: string; label: string }> = {
  pending:     { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   label: 'Pending' },
  in_progress: { badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',     label: 'In Progress' },
  review:      { badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20', label: 'In Review' },
  resolved:    { badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', label: 'Resolved' },
}

export default function DesignApprovalsPage() {
  const { user } = useAuth()
  const [approvals, setApprovals] = useState<DesignApproval[]>([])
  const [revisions, setRevisions] = useState<ProjectRevision[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)

  const [activeTab, setActiveTab] = useState<'approvals' | 'revisions'>('approvals')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [view, setView] = useState<'grid' | 'table'>('grid')

  // Modals
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [previewItem, setPreviewItem] = useState<DesignApproval | null>(null)
  const [revisionModalItem, setRevisionModalItem] = useState<DesignApproval | null>(null)
  const [historyModalItem, setHistoryModalItem] = useState<DesignApproval | null>(null)

  // Submit Design Form
  const [projectId, setProjectId] = useState('')
  const [title, setTitle] = useState('')
  const [stage, setStage] = useState<DesignStage>('Mockup')
  const [previewUrl, setPreviewUrl] = useState('')
  const [figmaUrl, setFigmaUrl] = useState('')
  const [description, setDescription] = useState('')

  // Revision Form State
  const [requestedChanges, setRequestedChanges] = useState('')
  const [assignedPerson, setAssignedPerson] = useState('Senior UI/UX Designer')
  const [revisionPriority, setRevisionPriority] = useState<RevisionPriority>('medium')
  const [revisionDeadline, setRevisionDeadline] = useState('')

  // Approve Form State
  const [approverName, setApproverName] = useState('')
  const [approvalFeedback, setApprovalFeedback] = useState('')
  const [showApproveConfirm, setShowApproveConfirm] = useState(false)

  // Load Data
  const loadData = async () => {
    setLoading(true)
    try {
      const [
        { data: aData },
        { data: rData },
        { data: pData },
        cList,
      ] = await Promise.all([
        (supabase as any).from('design_approvals').select('*').order('created_at', { ascending: false }).catch(() => ({ data: [] })),
        (supabase as any).from('project_revisions').select('*').order('created_at', { ascending: false }).catch(() => ({ data: [] })),
        (supabase as any).from('projects').select('*').order('name', { ascending: true }).catch(() => ({ data: [] })),
        getClients(),
      ])

      if (aData) setApprovals(aData as DesignApproval[])
      if (rData) setRevisions(rData as ProjectRevision[])
      if (pData) setProjects(pData as Project[])
      if (cList) setClients(cList as Client[])
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('capesecure-designs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'design_approvals' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_revisions' }, () => loadData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const projectMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects])
  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients])

  // Submit New Design Preview
  const handleSubmitDesign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId || !title.trim()) {
      toast.error('Please choose a project and enter design title')
      return
    }

    const project = projectMap[projectId]
    const nowIso = new Date().toISOString()
    const currentUser = user?.email || 'Design Architect'

    const initialHistory = [
      {
        action: 'Design Uploaded for Client Approval',
        by: currentUser,
        timestamp: nowIso,
        feedback: 'Initial design preview submitted for verification'
      }
    ]

    const newApproval: Partial<DesignApproval> = {
      project_id: projectId,
      client_id: project?.client_id || null,
      title: title.trim(),
      stage,
      preview_url: previewUrl.trim() || 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80',
      figma_url: figmaUrl.trim() || null,
      description: description.trim() || null,
      status: 'pending',
      version: 1,
      approval_history: initialHistory,
      created_at: nowIso,
      updated_at: nowIso,
    }

    try {
      const { data, error } = await (supabase as any)
        .from('design_approvals')
        .insert([newApproval])
        .select()
        .single()

      if (!error && data) {
        setApprovals([data as DesignApproval, ...approvals])
      } else {
        setApprovals([{ id: `da-${Date.now()}`, ...newApproval } as DesignApproval, ...approvals])
      }

      toast.success(`Design preview "${title}" submitted for client review!`)
      setShowSubmitModal(false)
      resetForm()
    } catch (err: any) {
      toast.error('Failed to submit design')
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setPreviewUrl('')
    setFigmaUrl('')
  }

  // Handle Client Approval
  const handleApproveDesign = async (approval: DesignApproval) => {
    const approver = approverName.trim() || (user?.email ? `Authorized Signatory (${user.email})` : 'Client Authorized Representative')
    const nowIso = new Date().toISOString()

    const historyEntry = {
      action: 'Design Formally Approved & Signed Off',
      by: approver,
      timestamp: nowIso,
      feedback: approvalFeedback.trim() || 'Approved all components and visual aesthetics'
    }

    const updatedHistory = [...(approval.approval_history || []), historyEntry]

    const updates = {
      status: 'approved' as DesignApprovalStatus,
      approved_by: approver,
      approved_at: nowIso,
      client_feedback: approvalFeedback.trim() || 'Approved',
      approval_history: updatedHistory,
      updated_at: nowIso
    }

    setApprovals(prev => prev.map(a => a.id === approval.id ? { ...a, ...updates } : a))
    if (previewItem?.id === approval.id) {
      setPreviewItem(prev => prev ? { ...prev, ...updates } : null)
    }

    try {
      await (supabase as any).from('design_approvals').update(updates).eq('id', approval.id)

      // Promote Project Pipeline stage to 'design_approved' if applicable
      const proj = projectMap[approval.project_id]
      if (proj && (proj.pipeline_stage === 'ui_ux_design' || proj.pipeline_stage === 'design_review')) {
        await (supabase as any).from('projects').update({
          pipeline_stage: 'design_approved',
          progress: 36,
          updated_at: nowIso
        }).eq('id', proj.id)
      }

      toast.success('Design approved! Project pipeline updated to Design Approved.')
      setShowApproveConfirm(false)
      setApprovalFeedback('')
    } catch (_) {}
  }

  // Handle Request Revision
  const handleRequestRevision = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!revisionModalItem || !requestedChanges.trim()) return

    const nowIso = new Date().toISOString()
    const currentUser = user?.email || 'Client Representative'
    const newVersion = (revisionModalItem.version || 1) + 1

    const historyEntry = {
      action: `Revision Requested (Rev ${newVersion})`,
      by: currentUser,
      timestamp: nowIso,
      feedback: requestedChanges.trim()
    }

    const updatedHistory = [...(revisionModalItem.approval_history || []), historyEntry]

    // 1. Update Design Approval
    const approvalUpdates = {
      status: 'revision_requested' as DesignApprovalStatus,
      revision_requested_at: nowIso,
      version: newVersion,
      client_feedback: requestedChanges.trim(),
      approval_history: updatedHistory,
      updated_at: nowIso
    }

    setApprovals(prev => prev.map(a => a.id === revisionModalItem.id ? { ...a, ...approvalUpdates } : a))

    // 2. Insert into project_revisions table
    const newRevision: Partial<ProjectRevision> = {
      project_id: revisionModalItem.project_id,
      design_approval_id: revisionModalItem.id,
      revision_number: newVersion,
      requested_changes: requestedChanges.trim(),
      assigned_person: assignedPerson.trim() || 'UI/UX Designer',
      requested_by: currentUser,
      status: 'pending',
      priority: revisionPriority,
      request_date: new Date().toISOString().slice(0, 10),
      completion_deadline: revisionDeadline || null,
      created_at: nowIso,
      updated_at: nowIso
    }

    try {
      await (supabase as any).from('design_approvals').update(approvalUpdates).eq('id', revisionModalItem.id)
      const { data: revData } = await (supabase as any).from('project_revisions').insert([newRevision]).select().single()
      if (revData) {
        setRevisions([revData as ProjectRevision, ...revisions])
      } else {
        setRevisions([{ id: `rev-${Date.now()}`, ...newRevision } as ProjectRevision, ...revisions])
      }

      toast.success(`Revision request Rev-${newVersion} logged and assigned to ${assignedPerson}!`)
      setRevisionModalItem(null)
      setRequestedChanges('')
    } catch (_) {}
  }

  // Resolve a Revision
  const handleResolveRevision = async (rev: ProjectRevision) => {
    const nowIso = new Date().toISOString()
    const updates = {
      status: 'resolved' as RevisionStatus,
      resolved_date: nowIso,
      resolution_notes: 'Changes applied and ready for client re-evaluation',
      updated_at: nowIso
    }

    setRevisions(prev => prev.map(r => r.id === rev.id ? { ...r, ...updates } : r))

    try {
      await (supabase as any).from('project_revisions').update(updates).eq('id', rev.id)
      toast.success(`Revision Rev-${rev.revision_number} marked as Resolved!`)
    } catch (_) {}
  }

  // Filtered Approvals
  const filteredApprovals = useMemo(() => {
    return approvals.filter(a => {
      const matchStatus = statusFilter === 'all' || a.status === statusFilter
      const matchProj = projectFilter === 'all' || a.project_id === projectFilter
      return matchStatus && matchProj
    })
  }, [approvals, statusFilter, projectFilter])

  return (
    <div className="space-y-6 animate-fade-in p-6 bg-slate-950 text-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Paintbrush className="w-7 h-7 text-purple-400" />
            Design Approvals &amp; Revision Management
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Upload UI/UX previews, track client sign-offs, manage design iterations, and maintain immutable revision history
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors border border-slate-800"
            title="Refresh from Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Submit Design Preview
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 w-fit">
        <button
          onClick={() => setActiveTab('approvals')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'approvals'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
          }`}
        >
          <Paintbrush size={15} />
          Design Approvals ({approvals.length})
        </button>
        <button
          onClick={() => setActiveTab('revisions')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'revisions'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
          }`}
        >
          <RotateCcw size={15} />
          Revision Management ({revisions.length})
        </button>
      </div>

      {/* ─── TAB 1: DESIGN APPROVALS ────────────────────────────────────────── */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-sm sm:w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Approval Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved &amp; Signed Off</option>
              <option value="revision_requested">Revision Requested</option>
            </select>
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-sm sm:w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.project_number ? `${p.project_number} — ${p.name}` : p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Grid View */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApprovals.length === 0 ? (
              <div className="col-span-3 py-16 text-center text-slate-500 bg-slate-900/60 border border-slate-800 rounded-2xl">
                <Paintbrush className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                No design approvals match the selected filter.
              </div>
            ) : (
              filteredApprovals.map(item => {
                const proj = projectMap[item.project_id]
                const client = clientMap[item.client_id || (proj?.client_id ?? '')]
                const stageCfg = STAGE_CONFIG[item.stage] || STAGE_CONFIG.Mockup
                const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending

                return (
                  <div
                    key={item.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all shadow-xl flex flex-col"
                  >
                    {/* Visual Preview Banner */}
                    <div className="relative h-44 bg-slate-950 flex items-center justify-center overflow-hidden group">
                      {item.preview_url ? (
                        <img
                          src={item.preview_url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                          <Paintbrush className="w-10 h-10 text-slate-600" />
                          <span className="text-xs font-medium">{item.stage} Preview</span>
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${stageCfg.badge}`}>
                          {item.stage} • v{item.version || 1}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusCfg.badge}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <span className="text-[11px] font-mono font-bold text-blue-400 block mb-1">
                          {proj?.project_number ? `${proj.project_number} • ${proj.name}` : (proj?.name || 'Project Design')}
                        </span>
                        <h3 className="text-base font-bold text-slate-100 leading-snug">{item.title}</h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {item.description || 'Interactive prototype ready for formal review & revision feedback.'}
                        </p>
                      </div>

                      {/* Client Feedback quote if exists */}
                      {item.client_feedback && (
                        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Feedback / Notes</span>
                          <p className="text-slate-300 italic">"{item.client_feedback}"</p>
                          {item.approved_by && (
                            <span className="text-[10px] text-emerald-400 block mt-0.5">
                              Approved by {item.approved_by} on {formatDate(item.approved_at || '')}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                        <button
                          onClick={() => setPreviewItem(item)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" /> View &amp; Review
                        </button>
                        <div className="flex items-center gap-1.5">
                          {item.status !== 'approved' && (
                            <button
                              onClick={() => {
                                setRevisionModalItem(item)
                                setRequestedChanges('')
                              }}
                              className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg text-xs font-medium border border-amber-500/20 flex items-center gap-1 transition-colors"
                              title="Request specific design changes"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Request Revision
                            </button>
                          )}
                          <button
                            onClick={() => setHistoryModalItem(item)}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                            title="View audit & sign-off history"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: REVISION MANAGEMENT ─────────────────────────────────────── */}
      {activeTab === 'revisions' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                Comprehensive Design Revision Ledger
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Track revision numbers, requested changes, assigned specialists, dates and resolution status
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
              {revisions.length} Total Iterations Logged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/90 border-b border-slate-800 text-xs uppercase font-medium text-slate-400">
                <tr>
                  <th className="text-left px-4 py-3">Rev #</th>
                  <th className="text-left px-4 py-3">Project Title</th>
                  <th className="text-left px-4 py-3">Requested Changes &amp; Feedback</th>
                  <th className="text-left px-4 py-3">Assigned Person</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Priority</th>
                  <th className="text-left px-4 py-3">Requested Date</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {revisions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-500">
                      No design revisions logged yet.
                    </td>
                  </tr>
                ) : (
                  revisions.map(rev => {
                    const proj = projectMap[rev.project_id]
                    const statusCfg = REVISION_STATUS_CONFIG[rev.status] || REVISION_STATUS_CONFIG.pending

                    return (
                      <tr key={rev.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-xs text-amber-400">
                          REV-{String(rev.revision_number).padStart(2, '0')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-200">{proj?.name || 'Project Design'}</div>
                          <div className="text-[11px] font-mono text-slate-500">{proj?.project_number}</div>
                        </td>
                        <td className="px-4 py-3 max-w-sm text-xs text-slate-300">
                          <p className="line-clamp-2">{rev.requested_changes}</p>
                          {rev.resolution_notes && (
                            <span className="text-[11px] text-emerald-400 block mt-1">
                              ✓ {rev.resolution_notes}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-300">
                          {rev.assigned_person || 'UI/UX Specialist'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusCfg.badge}`}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold uppercase text-slate-400">
                            {rev.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                          {formatDate(rev.request_date)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {rev.status !== 'resolved' ? (
                            <button
                              onClick={() => handleResolveRevision(rev)}
                              className="px-2.5 py-1 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg text-xs font-semibold transition-colors border border-emerald-500/20"
                            >
                              Mark Resolved
                            </button>
                          ) : (
                            <span className="text-xs text-emerald-400 font-medium flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                            </span>
                          )}
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

      {/* ─── PREVIEW & SIGN-OFF MODAL ──────────────────────────────────────── */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="bg-slate-900 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-800 space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${(STAGE_CONFIG[previewItem.stage] || STAGE_CONFIG.Mockup).badge}`}>
                    {previewItem.stage} • v{previewItem.version || 1}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${(STATUS_CONFIG[previewItem.status] || STATUS_CONFIG.pending).badge}`}>
                    {(STATUS_CONFIG[previewItem.status] || STATUS_CONFIG.pending).label}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-100 mt-1">{previewItem.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Project: <strong className="text-slate-200">{projectMap[previewItem.project_id]?.name}</strong>
                </p>
              </div>
              <button onClick={() => setPreviewItem(null)} className="text-slate-400 hover:text-slate-200 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mockup Display */}
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center max-h-96">
              <img
                src={previewItem.preview_url}
                alt={previewItem.title}
                className="max-h-96 w-full object-contain"
              />
            </div>

            {/* Prototype link & description */}
            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400">{previewItem.description || 'Full interactive Figma / design mockup prototype'}</span>
              {previewItem.figma_url && (
                <a
                  href={previewItem.figma_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-600/10 hover:bg-purple-600 text-purple-300 hover:text-white rounded-lg font-semibold transition-colors border border-purple-500/20"
                >
                  Open in Figma <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Client Approval Confirmation Drawer */}
            {previewItem.status !== 'approved' && (
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Formal Client Approval &amp; Milestone Sign-off
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Approver Full Name / Designation *"
                    value={approverName}
                    onChange={e => setApproverName(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Approval comments / sign-off notes"
                    value={approvalFeedback}
                    onChange={e => setApprovalFeedback(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleApproveDesign(previewItem)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
                  >
                    <CheckCircle className="w-4 h-4" /> Sign Off &amp; Approve Design
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  setRevisionModalItem(previewItem)
                  setPreviewItem(null)
                }}
                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-amber-500/20 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Request Revisions Instead
              </button>
              <button
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── REQUEST REVISION MODAL ────────────────────────────────────────── */}
      {revisionModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setRevisionModalItem(null)}
        >
          <div
            className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-amber-500/30 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-400" /> Request Design Revisions
              </h3>
              <button onClick={() => setRevisionModalItem(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-400">
              Target Design: <strong className="text-slate-200">{revisionModalItem.title}</strong> (Current v{revisionModalItem.version || 1})
            </div>

            <form onSubmit={handleRequestRevision} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Requested Changes &amp; Feedback *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail the specific UI adjustments, color modifications, typography changes, or feature updates required..."
                  value={requestedChanges}
                  onChange={e => setRequestedChanges(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Assign To Specialist</label>
                  <input
                    type="text"
                    value={assignedPerson}
                    onChange={e => setAssignedPerson(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Revision Priority</label>
                  <select
                    value={revisionPriority}
                    onChange={e => setRevisionPriority(e.target.value as RevisionPriority)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Target Completion Deadline</label>
                <input
                  type="date"
                  value={revisionDeadline}
                  onChange={e => setRevisionDeadline(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRevisionModalItem(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-amber-600/20 transition-all"
                >
                  <Send className="w-3.5 h-3.5" /> Submit Revision Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── AUDIT & SIGN-OFF HISTORY MODAL ────────────────────────────────── */}
      {historyModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setHistoryModalItem(null)}
        >
          <div
            className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" /> Design Approval History
              </h3>
              <button onClick={() => setHistoryModalItem(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-400">
              Audit log for <strong className="text-slate-200">{historyModalItem.title}</strong>
            </div>

            <div className="space-y-2.5">
              {(!historyModalItem.approval_history || historyModalItem.approval_history.length === 0) ? (
                <p className="text-xs text-slate-500 italic">No previous events recorded.</p>
              ) : (
                historyModalItem.approval_history.map((h, idx) => (
                  <div key={idx} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-200">{h.action}</span>
                      <span className="font-mono text-slate-500">{formatDate(h.timestamp)}</span>
                    </div>
                    <div className="text-slate-400">
                      By: <span className="text-slate-300 font-medium">{h.by}</span>
                    </div>
                    {h.feedback && (
                      <div className="text-slate-300 bg-slate-900/80 p-2 rounded text-[11px] mt-1 border border-slate-800">
                        {h.feedback}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setHistoryModalItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SUBMIT DESIGN MODAL ────────────────────────────────────────────── */}
      {showSubmitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowSubmitModal(false)}
        >
          <div
            className="bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Submit Design for Client Approval</h3>
                <p className="text-xs text-slate-400">Upload wireframes, mockups, or interactive Figma prototypes</p>
              </div>
              <button onClick={() => setShowSubmitModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDesign} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Project *</label>
                <select
                  required
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.project_number ? `${p.project_number} — ${p.name}` : p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Design Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Primary Dashboard, Navigation System & Theme Palette"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Deliverable Stage</label>
                  <select
                    value={stage}
                    onChange={e => setStage(e.target.value as DesignStage)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {DESIGN_STAGES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Figma / Live Prototype URL</label>
                  <input
                    type="url"
                    placeholder="https://figma.com/file/..."
                    value={figmaUrl}
                    onChange={e => setFigmaUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Preview Image / Mockup URL</label>
                <input
                  type="url"
                  placeholder="https://... image banner"
                  value={previewUrl}
                  onChange={e => setPreviewUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Scope &amp; Design Notes</label>
                <textarea
                  rows={2}
                  placeholder="Key design objectives, typography choices, and interaction guidelines..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
                >
                  <Plus className="w-4 h-4" /> Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
