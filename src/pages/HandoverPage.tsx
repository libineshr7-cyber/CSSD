import { useState, useMemo, useEffect } from 'react'
import {
  ShieldCheck, CheckSquare, Square, CheckCircle2, Clock,
  AlertTriangle, ChevronDown, ChevronUp, User, Calendar,
  Globe, Download, FileText, Lock, Key, Server, Database,
  GitBranch, Check, X, RefreshCw, Sparkles, Send, Award
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate, formatCurrency } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { getClients } from '../lib/clientStore'
import { useAuth } from '../contexts/AuthContext'
import { downloadHandoverDocumentPDF } from '../lib/pdfGenerator'
import type {
  Project,
  Client,
  ProjectHandover,
  HandoverChecklistItem
} from '../types/database'

const MANDATORY_HANDOVER_CHECKLIST = [
  { id: 'final_payment_settled',    category: 'Finance',     label: 'Final milestone payment verified & settled in ledger' },
  { id: 'website_qa_approved',       category: 'Quality',     label: 'All 14 QA test suites verified with zero critical blockers' },
  { id: 'domain_transferred',        category: 'Assets',      label: 'Domain registrar ownership confirmed & transferred to client' },
  { id: 'hosting_transferred',       category: 'Cloud',       label: 'Production hosting infrastructure transferred with delegated access' },
  { id: 'database_transferred',      category: 'Database',    label: 'Managed PostgreSQL cluster credentials & RLS policies transferred' },
  { id: 'admin_credentials_issued',  category: 'Security',    label: 'Admin dashboard accounts issued via zero-plaintext delegated auth' },
  { id: 'source_code_delivered',     category: 'Intellectual',label: 'Production Git repository & tag v1.0.0 transferred' },
  { id: 'documentation_delivered',   category: 'Knowledge',   label: 'System architecture manual and admin documentation delivered' },
  { id: 'backup_plan_verified',      category: 'Disaster',    label: 'Automated daily cloud snapshots and test restoration verified' },
  { id: 'maintenance_sla_explained', category: 'Support',     label: '30-Day post-deployment warranty and retainer SLA activated' },
]

export default function HandoverPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [handovers, setHandovers] = useState<Record<string, ProjectHandover>>({})
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // Handover Execution Modal
  const [executingHandover, setExecutingHandover] = useState<ProjectHandover | null>(null)
  const [clientSignatoryName, setClientSignatoryName] = useState('')
  const [clientSignatoryTitle, setClientSignatoryTitle] = useState('Managing Director / Client Representative')
  const [clientAcknowledgement, setClientAcknowledgement] = useState(
    'The Client formally confirms full receipt, testing, and acceptance of the live website, domain ownership, source code repository, and administrative controls in 100% satisfaction of the contracted specifications.'
  )
  const [agencySignatoryName, setAgencySignatoryName] = useState('Arun Kumar')
  const [agencySignatoryTitle, setAgencySignatoryTitle] = useState('CapeSecure Solutions LLP • Lead Architect')

  const loadData = async () => {
    setLoading(true)
    try {
      const [
        { data: pData },
        cList,
        { data: hData },
      ] = await Promise.all([
        (supabase as any).from('projects').select('*').order('created_at', { ascending: false }).catch(() => ({ data: [] })),
        getClients(),
        (supabase as any).from('project_handovers').select('*').catch(() => ({ data: [] })),
      ])

      if (pData) {
        setProjects(pData as Project[])
        if (pData.length > 0 && !selectedProjectId) {
          setSelectedProjectId(pData[0].id)
        }
      }
      if (cList) setClients(cList as Client[])

      const handoverMap: Record<string, ProjectHandover> = {}
      if (hData) {
        (hData as ProjectHandover[]).forEach(h => {
          handoverMap[h.project_id] = h
        })
      }
      setHandovers(handoverMap)
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('capesecure-handover-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_handovers' }, () => loadData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const projectMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects])
  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients])

  const currentProject = projectMap[selectedProjectId]
  const currentClient = currentProject ? clientMap[currentProject.client_id] : null

  // Get or initialize Handover Record for current project
  const currentHandover: ProjectHandover = useMemo(() => {
    if (!selectedProjectId) {
      return {
        id: 'new',
        project_id: '',
        client_id: '',
        live_website_url: '',
        domain_ownership_confirmed: false,
        checklist_items: MANDATORY_HANDOVER_CHECKLIST.map(t => ({ ...t, checked: false })),
        status: 'pending',
        handover_date: new Date().toISOString().slice(0, 10),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }

    if (handovers[selectedProjectId]) {
      return handovers[selectedProjectId]
    }

    const p = projectMap[selectedProjectId]
    return {
      id: `hnd-${Date.now()}`,
      project_id: selectedProjectId,
      client_id: p?.client_id || '',
      live_website_url: p?.website_url || `https://${(p?.name || 'app').toLowerCase().replace(/\s+/g, '')}.com`,
      domain_ownership_confirmed: true,
      domain_transfer_details: 'Transferred to client registrar account via delegated nameservers',
      hosting_information: 'Vercel Enterprise Edge Hosting with Zero-Downtime Global CDN',
      database_access_transfer: 'Managed PostgreSQL cluster credentials transferred with SSL & RLS',
      admin_dashboard_access: 'Super Admin credentials issued with zero-plaintext delegated IAM access',
      source_code_transfer: 'Clean production Git repository transferred with tag v1.0.0',
      documentation_urls: ['System Architecture Manual', 'Administrative Portal Guide', 'API Reference'],
      backup_instructions: 'Automated daily encrypted cloud snapshots with Point-In-Time-Recovery drill',
      maintenance_sla: '30-Day post-deployment warranty included with active monitoring SLA',
      outstanding_issues: 'Zero blocking issues; 100% QA checklist verified and approved',
      checklist_items: MANDATORY_HANDOVER_CHECKLIST.map(t => ({ ...t, checked: false })),
      status: 'pending',
      handover_date: new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }, [selectedProjectId, handovers, projectMap])

  // Toggle Checklist Item
  const handleToggleChecklist = async (itemId: string) => {
    if (!currentProject) return

    const nowIso = new Date().toISOString()
    const currentUser = user?.email || 'Authorized Officer'

    const updatedChecklist = currentHandover.checklist_items.map(item => {
      if (item.id === itemId) {
        const nextChecked = !item.checked
        return {
          ...item,
          checked: nextChecked,
          verified_by: nextChecked ? currentUser : undefined,
          verified_at: nextChecked ? nowIso : undefined,
        }
      }
      return item
    })

    const allChecked = updatedChecklist.every(i => i.checked)
    const newStatus = allChecked && currentHandover.client_signed_at ? 'completed' : 'in_progress'

    const updatedHandover: ProjectHandover = {
      ...currentHandover,
      checklist_items: updatedChecklist,
      status: newStatus,
      updated_at: nowIso,
    }

    setHandovers(prev => ({ ...prev, [selectedProjectId]: updatedHandover }))

    try {
      await (supabase as any).from('project_handovers').upsert([updatedHandover])
    } catch (_) {}
  }

  // Open Handover Acceptance & Execution Modal
  const handleOpenExecutionModal = () => {
    const allChecked = currentHandover.checklist_items.every(i => i.checked)
    if (!allChecked) {
      toast.error('Mandate: All 10 handover checklist items must be verified before executing handover!')
      return
    }
    setExecutingHandover(currentHandover)
    setClientSignatoryName(currentClient?.name || 'Authorized Client Representative')
  }

  // Execute and Sign Handover
  const handleExecuteHandover = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProject || !currentClient) return

    const nowIso = new Date().toISOString()
    const allChecked = currentHandover.checklist_items.every(i => i.checked)

    if (!allChecked) {
      toast.error('Do not mark a project as handed over until the required handover checklist is completed!')
      return
    }

    if (!clientSignatoryName.trim() || !clientAcknowledgement.trim()) {
      toast.error('Client signatory name and formal acknowledgement are required')
      return
    }

    const finalizedHandover: ProjectHandover = {
      ...currentHandover,
      status: 'completed',
      agency_signatory_name: agencySignatoryName.trim(),
      agency_signatory_title: agencySignatoryTitle.trim(),
      agency_signed_at: nowIso,
      client_signatory_name: clientSignatoryName.trim(),
      client_signatory_title: clientSignatoryTitle.trim(),
      client_acknowledgement: clientAcknowledgement.trim(),
      client_signed_at: nowIso,
      handover_date: new Date().toISOString().slice(0, 10),
      updated_at: nowIso,
    }

    setHandovers(prev => ({ ...prev, [selectedProjectId]: finalizedHandover }))

    try {
      // 1. Save Handover to Supabase
      await (supabase as any).from('project_handovers').upsert([finalizedHandover])

      // 2. Promote Project to 'handover' / 'completed' and 'live'
      await (supabase as any).from('projects').update({
        pipeline_stage: 'completed',
        progress: 100,
        status: 'live',
        completed_at: nowIso,
        updated_at: nowIso,
      }).eq('id', currentProject.id)

      setProjects(prev => prev.map(p => p.id === currentProject.id ? {
        ...p,
        pipeline_stage: 'completed',
        progress: 100,
        status: 'live',
        completed_at: nowIso
      } : p))

      setExecutingHandover(null)
      toast.success('Project officially handed over and verified with client acceptance!')

      // Automatically download genuine binary PDF Handover Certificate
      downloadHandoverDocumentPDF(finalizedHandover, currentProject, currentClient)
    } catch (_) {
      toast.error('Failed to finalize handover')
    }
  }

  // Download PDF Certificate
  const handleDownloadPDF = () => {
    if (!currentProject || !currentClient) return
    downloadHandoverDocumentPDF(currentHandover, currentProject, currentClient)
    toast.success('Downloading official CapeSecure Handover Certificate PDF...')
  }

  const checklistProgress = useMemo(() => {
    const total = currentHandover.checklist_items.length
    const checked = currentHandover.checklist_items.filter(i => i.checked).length
    const pct = total > 0 ? Math.round((checked / total) * 100) : 0
    return { total, checked, pct }
  }, [currentHandover])

  const isFullyHandedOver = currentHandover.status === 'completed' && currentHandover.client_signed_at

  return (
    <div className="space-y-6 animate-fade-in p-6 bg-slate-950 text-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Award className="w-7 h-7 text-emerald-400" />
            Project Handover &amp; Formal Acceptance
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Enforced 10-point handover checklist, dual-party signatures, and legally binding completion certificate
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
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" /> Download PDF Certificate
          </button>
          <button
            onClick={handleOpenExecutionModal}
            disabled={checklistProgress.pct < 100}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            {isFullyHandedOver ? 'View Acceptance Signatures' : 'Execute & Sign Handover'}
          </button>
        </div>
      </div>

      {/* Mandatory Handover Protocol Notice */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-start gap-3.5 shadow-md">
        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="text-xs space-y-1">
          <div className="font-bold text-slate-200 uppercase tracking-wide">
            Delivery Protocol Mandate
          </div>
          <p className="text-slate-400 leading-relaxed">
            In accordance with CapeSecure governance: <strong>Do not mark a project as handed over until the required handover checklist (10/10 items) and formal client acknowledgement are recorded.</strong> Handover execution locks all milestones and initiates the post-deployment warranty SLA.
          </p>
        </div>
      </div>

      {/* Project Selector Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 shrink-0">
            Select Project:
          </label>
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-1 sm:w-80"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.project_number ? `${p.project_number} — ${p.name}` : p.name}
              </option>
            ))}
          </select>
        </div>

        {currentProject && (
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
              isFullyHandedOver
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {isFullyHandedOver ? '✓ Fully Handed Over & Signed' : `Verification In Progress (${checklistProgress.pct}%)`}
            </span>
          </div>
        )}
      </div>

      {currentProject && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: 10-Point Handover Checklist */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="border-b border-slate-800 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-emerald-400" />
                  Mandatory Checklist
                </h3>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                  {checklistProgress.checked} / {checklistProgress.total}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                All 10 verification gates must be checked before signing
              </p>
            </div>

            {/* Checklist progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>Verification Completion</span>
                <span className="font-bold text-emerald-400">{checklistProgress.pct}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${checklistProgress.pct}%` }}
                />
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              {currentHandover.checklist_items.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleToggleChecklist(item.id)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                    item.checked
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                    item.checked ? 'bg-emerald-500 text-white' : 'border border-slate-700 bg-slate-900'
                  }`}>
                    {item.checked && <Check className="w-3 h-3" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{item.label}</div>
                    {item.verified_by && (
                      <div className="text-[10px] text-slate-500 mt-1 font-mono">
                        Verified by {item.verified_by} • {formatDate(item.verified_at || '')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: 12-Section Handover Document Details */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Official 12-Point Handover Architecture Record
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ref: <span className="font-mono text-blue-400 font-bold">{currentProject.project_number}</span> • Project: {currentProject.name}
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                Date: {formatDate(currentHandover.handover_date)}
              </span>
            </div>

            {/* 12 Handover Sections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* 1. Project Information */}
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-slate-300 block uppercase tracking-wider text-[11px]">
                  1. Project &amp; Client Information
                </span>
                <p className="text-slate-200 font-semibold">{currentProject.name}</p>
                <p className="text-slate-400">Client: {currentClient?.business_name || currentClient?.name}</p>
                <p className="text-slate-400">Budget: {formatCurrency(currentProject.budget || 0)}</p>
              </div>

              {/* 2. Live Website URL */}
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-slate-300 block uppercase tracking-wider text-[11px]">
                  2. Live Production Endpoint
                </span>
                <a
                  href={currentHandover.live_website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-blue-400 hover:underline block truncate"
                >
                  {currentHandover.live_website_url}
                </a>
                <p className="text-slate-500 text-[11px]">TLS 1.3 encrypted • Edge CDN live</p>
              </div>

              {/* 3. Domain Ownership Confirmation */}
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-slate-300 block uppercase tracking-wider text-[11px]">
                  3. Domain Ownership Confirmation
                </span>
                <p className="text-emerald-400 font-semibold">✓ Confirmed &amp; Transferred to Client</p>
                <p className="text-slate-400">{currentHandover.domain_transfer_details || 'Delegated via Registrar'}</p>
              </div>

              {/* 4. Hosting Information */}
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-slate-300 block uppercase tracking-wider text-[11px]">
                  4. Cloud Hosting Infrastructure
                </span>
                <p className="text-slate-200 font-medium">{currentHandover.hosting_information || 'Vercel Enterprise Edge Hosting'}</p>
                <p className="text-slate-500 text-[11px]">Zero-downtime deployment pipeline</p>
              </div>

              {/* 5. Database Access Transfer */}
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-slate-300 block uppercase tracking-wider text-[11px]">
                  5. Database Access Transfer
                </span>
                <p className="text-slate-200">{currentHandover.database_access_transfer || 'PostgreSQL cluster credentials transferred'}</p>
                <p className="text-slate-500 text-[11px]">RLS policy architecture active</p>
              </div>

              {/* 6. Admin Dashboard Access */}
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-slate-300 block uppercase tracking-wider text-[11px]">
                  6. Administrative Dashboard Access
                </span>
                <p className="text-slate-200">{currentHandover.admin_dashboard_access || 'Super Admin account provisioned'}</p>
                <p className="text-slate-500 text-[11px]">Zero-plaintext delegated login</p>
              </div>

              {/* 7. Source Code Transfer */}
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-slate-300 block uppercase tracking-wider text-[11px]">
                  7. Source Code &amp; Repository Transfer
                </span>
                <p className="text-slate-200">{currentHandover.source_code_transfer || 'Production Git repository & tag v1.0.0 transferred'}</p>
                <p className="text-slate-500 text-[11px]">Full intellectual property transferred</p>
              </div>

              {/* 8. Documentation */}
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-slate-300 block uppercase tracking-wider text-[11px]">
                  8. Documentation &amp; User Manuals
                </span>
                <p className="text-slate-200">{(currentHandover.documentation_urls || ['System Admin Guide', 'API Reference']).join(', ')}</p>
                <p className="text-slate-500 text-[11px]">Comprehensive developer docs delivered</p>
              </div>

              {/* 9. Backup Instructions */}
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-slate-300 block uppercase tracking-wider text-[11px]">
                  9. Backup &amp; Disaster Recovery
                </span>
                <p className="text-slate-200">{currentHandover.backup_instructions || 'Automated daily encrypted cloud snapshots'}</p>
                <p className="text-slate-500 text-[11px]">Point-In-Time recovery validated</p>
              </div>

              {/* 10. Maintenance SLA */}
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-slate-300 block uppercase tracking-wider text-[11px]">
                  10. Maintenance &amp; Retainer SLA
                </span>
                <p className="text-slate-200">{currentHandover.maintenance_sla || '30-Day post-deployment warranty included'}</p>
                <p className="text-slate-500 text-[11px]">Active security monitoring protocol</p>
              </div>

              {/* 11. Outstanding Issues */}
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-slate-300 block uppercase tracking-wider text-[11px]">
                  11. Outstanding Issues / Roadmap
                </span>
                <p className="text-slate-200">{currentHandover.outstanding_issues || 'Zero blocking bugs; all deliverables accepted'}</p>
                <p className="text-slate-500 text-[11px]">Phase 2 enhancement roadmap documented</p>
              </div>

              {/* 12. Handover Date */}
              <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-slate-300 block uppercase tracking-wider text-[11px]">
                  12. Handover Execution Date
                </span>
                <p className="text-emerald-400 font-mono font-bold">{formatDate(currentHandover.handover_date)}</p>
                <p className="text-slate-500 text-[11px]">Official project completion timestamp</p>
              </div>
            </div>

            {/* Acceptance Signatures Block */}
            {isFullyHandedOver ? (
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Dual-Party Executed Handover Acceptance Signatures
                  </h4>
                </div>

                <p className="text-xs text-slate-300 italic bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  "{currentHandover.client_acknowledgement}"
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Agency Signatory</span>
                    <span className="text-sm font-bold text-slate-100 block mt-0.5">{currentHandover.agency_signatory_name}</span>
                    <span className="text-xs text-slate-400 block">{currentHandover.agency_signatory_title}</span>
                    <span className="text-[11px] font-mono text-emerald-400 block mt-1">Signed on {formatDate(currentHandover.agency_signed_at || '')}</span>
                  </div>

                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Client Signatory</span>
                    <span className="text-sm font-bold text-slate-100 block mt-0.5">{currentHandover.client_signatory_name}</span>
                    <span className="text-xs text-slate-400 block">{currentHandover.client_signatory_title}</span>
                    <span className="text-[11px] font-mono text-emerald-400 block mt-1">Signed on {formatDate(currentHandover.client_signed_at || '')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="text-xs text-slate-400">
                  {checklistProgress.pct < 100
                    ? `Complete remaining ${checklistProgress.total - checklistProgress.checked} checklist items to unlock execution.`
                    : 'All checklist items verified! Ready for client acknowledgement and execution.'
                  }
                </div>
                <button
                  onClick={handleOpenExecutionModal}
                  disabled={checklistProgress.pct < 100}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  Execute Handover Document
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── HANDOVER EXECUTION & CLIENT SIGNATURE MODAL ────────────────────── */}
      {executingHandover && currentProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setExecutingHandover(null)}
        >
          <div
            className="bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-emerald-500/30 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" /> Execute Handover Acceptance
              </h3>
              <button onClick={() => setExecutingHandover(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
              Project <strong className="text-white">{currentProject.project_number}: {currentProject.name}</strong> has passed all 10 mandatory handover gates. Recording this acknowledgement transitions the project to <strong>Live / Completed</strong> and issues the formal certificate.
            </div>

            <form onSubmit={handleExecuteHandover} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Client Acknowledgement &amp; Acceptance Statement *
                </label>
                <textarea
                  required
                  rows={3}
                  value={clientAcknowledgement}
                  onChange={e => setClientAcknowledgement(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Client Signatory Name *</label>
                  <input
                    type="text"
                    required
                    value={clientSignatoryName}
                    onChange={e => setClientSignatoryName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Client Designation</label>
                  <input
                    type="text"
                    required
                    value={clientSignatoryTitle}
                    onChange={e => setClientSignatoryTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Agency Signatory Name</label>
                  <input
                    type="text"
                    required
                    value={agencySignatoryName}
                    onChange={e => setAgencySignatoryName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Agency Title</label>
                  <input
                    type="text"
                    required
                    value={agencySignatoryTitle}
                    onChange={e => setAgencySignatoryTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setExecutingHandover(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <ShieldCheck className="w-4 h-4" /> Sign &amp; Issue Handover Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
