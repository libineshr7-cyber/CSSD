import { useState, useMemo, useEffect } from 'react'
import {
  Plus, Search, Edit2, X, LayoutGrid, List,
  Calendar, ExternalLink, GitBranch, ChevronDown,
  Layers, Code2, Rocket, Paintbrush, RefreshCw,
  CheckCircle2, Clock, AlertTriangle, ShieldCheck,
  User, Users, DollarSign, FileText, ArrowRight,
  TrendingUp, Award, Check, Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate, formatCurrency } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type {
  Project,
  ProjectStatus,
  ProjectPriority,
  ProjectPipelineStage,
  ProjectActivityLogItem,
  Client,
  Quotation,
  Agreement
} from '../types/database'

// ─── 17-Stage Granular Pipeline Definition ────────────────────────────────────

export interface PipelineStageConfig {
  key: ProjectPipelineStage
  step: number
  label: string
  phase: string
  progress: number
  description: string
  statusGroup: ProjectStatus
}

export const PIPELINE_STAGES: PipelineStageConfig[] = [
  { key: 'project_created',          step: 1,  label: 'Project Created',          phase: 'Inception',    progress: 6,   statusGroup: 'planning',    description: 'Project initialized and assigned unique project number' },
  { key: 'advance_payment_verified', step: 2,  label: 'Advance Payment Verified', phase: 'Inception',    progress: 12,  statusGroup: 'planning',    description: '50% initial commitment verified against bank settlement' },
  { key: 'requirements_finalized',   step: 3,  label: 'Requirements Finalized',   phase: 'Inception',    progress: 18,  statusGroup: 'planning',    description: 'Technical PRD and functional scope signed off by client' },
  { key: 'ui_ux_design',             step: 4,  label: 'UI/UX Design',             phase: 'Design',       progress: 24,  statusGroup: 'design',      description: 'Wireframing, typography, and interactive Figma mockups' },
  { key: 'design_review',            step: 5,  label: 'Design Review',            phase: 'Design',       progress: 30,  statusGroup: 'design',      description: 'Internal creative review and design system alignment' },
  { key: 'design_approved',          step: 6,  label: 'Design Approved',          phase: 'Design',       progress: 36,  statusGroup: 'design',      description: 'Formal sign-off and approval obtained from client' },
  { key: 'frontend_development',     step: 7,  label: 'Frontend Development',     phase: 'Engineering',  progress: 42,  statusGroup: 'development', description: 'React, Tailwind, responsive UI layout implementation' },
  { key: 'backend_development',      step: 8,  label: 'Backend Development',      phase: 'Engineering',  progress: 48,  statusGroup: 'development', description: 'Business logic, authentication, and secure API endpoints' },
  { key: 'database_integration',     step: 9,  label: 'Database Integration',     phase: 'Engineering',  progress: 54,  statusGroup: 'development', description: 'PostgreSQL schema, RLS policies, indexes, and migrations' },
  { key: 'internal_testing',         step: 10, label: 'Internal Testing',         phase: 'Quality',      progress: 60,  statusGroup: 'testing',     description: 'Automated test suite, unit tests, and cross-browser checks' },
  { key: 'client_review',            step: 11, label: 'Client Review',            phase: 'Quality',      progress: 66,  statusGroup: 'review',      description: 'Staging environment walkthrough with client stakeholders' },
  { key: 'revisions',                step: 12, label: 'Revisions',                phase: 'Quality',      progress: 72,  statusGroup: 'development', description: 'Incorporating requested revisions and refinement feedback' },
  { key: 'final_qa',                 step: 13, label: 'Final QA & Audit',         phase: 'Quality',      progress: 78,  statusGroup: 'testing',     description: 'OWASP Top 10 security audit, performance, and SEO checks' },
  { key: 'final_payment',            step: 14, label: 'Final Payment Verified',   phase: 'Delivery',     progress: 85,  statusGroup: 'review',      description: 'Final 50% milestone settlement verified and receipt generated' },
  { key: 'deployment',               step: 15, label: 'Production Deployment',   phase: 'Delivery',     progress: 92,  statusGroup: 'deployment',  description: 'SSL certification, DNS configuration, and cloud release' },
  { key: 'handover',                 step: 16, label: 'Client Handover',          phase: 'Delivery',     progress: 96,  statusGroup: 'live',        description: 'Credentials transfer, admin training, and documentation delivery' },
  { key: 'completed',                step: 17, label: 'Project Completed',        phase: 'Delivery',     progress: 100, statusGroup: 'live',        description: 'Warranty period initiated and project transitioned to maintenance' },
]

export const STAGE_MAP = Object.fromEntries(PIPELINE_STAGES.map(s => [s.key, s]))

const PRIORITY_CONFIG: Record<ProjectPriority, { badge: string; label: string; border: string }> = {
  urgent: { badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',     label: 'Urgent',  border: 'border-l-rose-500' },
  high:   { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   label: 'High',    border: 'border-l-amber-500' },
  medium: { badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',     label: 'Medium',  border: 'border-l-blue-500' },
  low:    { badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',   label: 'Low',     border: 'border-l-slate-500' },
}

const KANBAN_PHASES = [
  { id: 'Inception',   title: '1. Inception & Scope',       icon: Layers,     color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  { id: 'Design',      title: '2. UI/UX Design & Approval', icon: Paintbrush, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 'Engineering', title: '3. Core Development',        icon: Code2,      color: 'text-cyan-400',   bg: 'bg-cyan-500/10' },
  { id: 'Quality',     title: '4. Testing & Verification',  icon: ShieldCheck,color: 'text-amber-400',  bg: 'bg-amber-500/10' },
  { id: 'Delivery',    title: '5. Release & Handover',      icon: Rocket,     color: 'text-emerald-400',bg: 'bg-emerald-500/10' },
]

export default function ProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [loading, setLoading] = useState(false)

  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  // Form State
  const [clientId, setClientId] = useState('')
  const [quotationId, setQuotationId] = useState('')
  const [agreementId, setAgreementId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [deadline, setDeadline] = useState('')
  const [projectManager, setProjectManager] = useState('CapeSecure Lead Architect')
  const [priority, setPriority] = useState<ProjectPriority>('medium')
  const [techStackInput, setTechStackInput] = useState('React, TypeScript, Tailwind, Supabase, Node.js')
  const [teamMembersInput, setTeamMembersInput] = useState('Lead Architect, Full-Stack Dev, UI Designer, QA Specialist')

  // Load live data from Supabase
  const loadData = async () => {
    setLoading(true)
    try {
      const [
        { data: pData },
        { data: cData },
        { data: qData },
        { data: aData },
      ] = await Promise.all([
        (supabase as any).from('projects').select('*').order('created_at', { ascending: false }),
        (supabase as any).from('clients').select('*').order('name', { ascending: true }),
        (supabase as any).from('quotations').select('*').order('created_at', { ascending: false }),
        (supabase as any).from('agreements').select('*').order('created_at', { ascending: false }),
      ])

      if (pData) setProjects(pData as Project[])
      if (cData) setClients(cData as Client[])
      if (qData) setQuotations(qData as Quotation[])
      if (aData) setAgreements(aData as Agreement[])
    } catch (err) {
      console.error('Error fetching projects data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('capesecure-projects-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients])
  const quotationMap = useMemo(() => Object.fromEntries(quotations.map(q => [q.id, q])), [quotations])
  const agreementMap = useMemo(() => Object.fromEntries(agreements.map(a => [a.id, a])), [agreements])

  // Auto-fill budget and client when quotation is chosen
  const handleQuotationSelect = (qId: string) => {
    setQuotationId(qId)
    if (!qId) return
    const q = quotations.find(item => item.id === qId)
    if (q) {
      if (q.client_id) setClientId(q.client_id)
      if (q.total) setBudget(String(q.total))
      if (!name) setName(q.title)
    }
  }

  // Generate sequential project ID: CS-PRJ-2026-001
  const generateNextProjectNumber = () => {
    const year = new Date().getFullYear()
    const nextSeq = String(projects.length + 1).padStart(3, '0')
    return `CS-PRJ-${year}-${nextSeq}`
  }

  // Handle Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Project title is required')
      return
    }
    if (!clientId) {
      toast.error('Please select a client for this project')
      return
    }

    const nextProjectNumber = generateNextProjectNumber()
    const nowIso = new Date().toISOString()
    const currentUserEmail = user?.email || 'Authorized Administrator'

    const initialStageConfig = PIPELINE_STAGES[0] // 'project_created'
    const techStack = techStackInput.split(',').map(s => s.trim()).filter(Boolean)
    const teamMembers = teamMembersInput.split(',').map(s => s.trim()).filter(Boolean)

    const initialActivity: ProjectActivityLogItem[] = [
      {
        id: `act-${Date.now()}`,
        action: 'Project Initialized',
        performed_by: currentUserEmail,
        timestamp: nowIso,
        details: `Created as ${nextProjectNumber} with budget ₹${Number(budget || 0).toLocaleString('en-IN')}`,
        new_stage: initialStageConfig.key
      }
    ]

    const newProject: Partial<Project> = {
      project_number: nextProjectNumber,
      client_id: clientId,
      quotation_id: quotationId || null,
      agreement_id: agreementId || null,
      name: name.trim(),
      description: description.trim() || null,
      budget: Number(budget) || 0,
      status: initialStageConfig.statusGroup,
      pipeline_stage: initialStageConfig.key,
      priority,
      start_date: startDate ? new Date(startDate).toISOString() : null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      expected_delivery_date: deadline ? new Date(deadline).toISOString() : null,
      project_manager: projectManager.trim() || 'CapeSecure Project Lead',
      development_team: teamMembers,
      tech_stack: techStack,
      progress: initialStageConfig.progress,
      activity_log: initialActivity,
      completed_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    }

    try {
      const { data, error } = await (supabase as any)
        .from('projects')
        .insert([newProject])
        .select()
        .single()

      if (error) {
        console.warn('Supabase insert project error, falling back locally:', error)
        const localProj: Project = {
          id: `proj-${Date.now()}`,
          ...(newProject as any)
        }
        setProjects([localProj, ...projects])
      } else if (data) {
        setProjects([data as Project, ...projects])
      }

      toast.success(`Project ${nextProjectNumber} created successfully!`)
      setShowCreateModal(false)
      resetForm()
    } catch (err: any) {
      toast.error(`Error saving project: ${err.message}`)
    }
  }

  // Handle Advance Stage
  const handleAdvanceStage = async (project: Project) => {
    const currentStageKey = project.pipeline_stage || 'project_created'
    const currentIndex = PIPELINE_STAGES.findIndex(s => s.key === currentStageKey)
    if (currentIndex >= PIPELINE_STAGES.length - 1) {
      toast.success('Project is already in Completed stage!')
      return
    }

    const nextStage = PIPELINE_STAGES[currentIndex + 1]
    const nowIso = new Date().toISOString()
    const currentUserEmail = user?.email || 'Authorized Administrator'

    const newActivityItem: ProjectActivityLogItem = {
      id: `act-${Date.now()}`,
      action: `Stage Advanced: ${nextStage.label}`,
      performed_by: currentUserEmail,
      timestamp: nowIso,
      previous_stage: currentStageKey,
      new_stage: nextStage.key,
      details: nextStage.description
    }

    const updatedActivity = [...(project.activity_log || []), newActivityItem]
    const isCompleted = nextStage.key === 'completed'

    const updates = {
      pipeline_stage: nextStage.key,
      progress: nextStage.progress,
      status: nextStage.statusGroup,
      completed_at: isCompleted ? nowIso : project.completed_at,
      activity_log: updatedActivity,
      updated_at: nowIso
    }

    try {
      await (supabase as any).from('projects').update(updates).eq('id', project.id)
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, ...updates } : p))
      if (selectedProject?.id === project.id) {
        setSelectedProject(prev => prev ? { ...prev, ...updates } : null)
      }
      toast.success(`Advanced to Stage ${nextStage.step}/17: ${nextStage.label}!`)
    } catch (err: any) {
      toast.error(`Failed to advance stage: ${err.message}`)
    }
  }

  // Handle Set Specific Stage
  const handleSetSpecificStage = async (project: Project, targetStageKey: ProjectPipelineStage) => {
    const targetStage = STAGE_MAP[targetStageKey]
    if (!targetStage) return

    const nowIso = new Date().toISOString()
    const currentUserEmail = user?.email || 'Authorized Administrator'

    const newActivityItem: ProjectActivityLogItem = {
      id: `act-${Date.now()}`,
      action: `Stage Set: ${targetStage.label}`,
      performed_by: currentUserEmail,
      timestamp: nowIso,
      previous_stage: project.pipeline_stage,
      new_stage: targetStage.key,
      details: `Manually transitioned to ${targetStage.label}`
    }

    const updatedActivity = [...(project.activity_log || []), newActivityItem]
    const isCompleted = targetStage.key === 'completed'

    const updates = {
      pipeline_stage: targetStage.key,
      progress: targetStage.progress,
      status: targetStage.statusGroup,
      completed_at: isCompleted ? nowIso : (project.completed_at && !isCompleted ? null : project.completed_at),
      activity_log: updatedActivity,
      updated_at: nowIso
    }

    try {
      await (supabase as any).from('projects').update(updates).eq('id', project.id)
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, ...updates } : p))
      if (selectedProject?.id === project.id) {
        setSelectedProject(prev => prev ? { ...prev, ...updates } : null)
      }
      toast.success(`Updated to Stage ${targetStage.step}/17: ${targetStage.label}!`)
    } catch (err: any) {
      toast.error(`Failed to update stage: ${err.message}`)
    }
  }

  const resetForm = () => {
    setClientId('')
    setQuotationId('')
    setAgreementId('')
    setName('')
    setDescription('')
    setBudget('')
    setDeadline('')
    setPriority('medium')
  }

  // Filtered projects
  const filtered = useMemo(() => {
    return projects.filter(p => {
      const client = clientMap[p.client_id]
      const currentStageConfig = STAGE_MAP[p.pipeline_stage || 'project_created']
      const currentPhase = currentStageConfig?.phase || 'Inception'

      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.project_number?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (client?.name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (client?.business_name?.toLowerCase().includes(search.toLowerCase()) ?? false)

      const matchPhase = phaseFilter === 'all' || currentPhase === phaseFilter
      const matchClient = clientFilter === 'all' || p.client_id === clientFilter

      return matchSearch && matchPhase && matchClient
    })
  }, [projects, search, phaseFilter, clientFilter, clientMap])

  // Metrics
  const metrics = useMemo(() => {
    const totalProjects = projects.length
    const activeProjects = projects.filter(p => p.status !== 'cancelled' && p.status !== 'live').length
    const completedProjects = projects.filter(p => p.pipeline_stage === 'completed' || p.status === 'live').length
    const totalCommittedBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0)
    return { totalProjects, activeProjects, completedProjects, totalCommittedBudget }
  }, [projects])

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Project Management &amp; Delivery Pipeline
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            Connected to client, quotation, agreement, and payment records across 17 granular lifecycle stages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="btn-secondary"
            title="Refresh from Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <div className="flex bg-slate-100 dark:bg-[#0e1526] border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setView('kanban')}
              className={`p-1.5 rounded-md transition-colors ${view === 'kanban' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView('table')}
              className={`p-1.5 rounded-md transition-colors ${view === 'table' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}
              title="Detailed Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <Plus className="w-3.5 h-3.5" /> <span>Create Project</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider">Active Pipeline</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">{metrics.activeProjects}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">In engineering &amp; verification</span>
        </div>
        <div className="bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider">Completed Projects</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{metrics.completedProjects}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Successfully handed over</span>
        </div>
        <div className="bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider">Contract Budget</span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">{formatCurrency(metrics.totalCommittedBudget)}</p>
          <span className="text-[11px] text-slate-400 mt-1 block font-mono">100% committed value</span>
        </div>
        <div className="bg-white dark:bg-[#0e1526] border border-slate-200/90 dark:border-slate-800/90 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider">Granular Stages</span>
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">17 Stages</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Milestone gate pipeline</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search project number, title, client, or team member..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-[#0e1526] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:ring-1.5 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
          />
        </div>
        <select
          value={phaseFilter}
          onChange={e => setPhaseFilter(e.target.value)}
          className="px-3 py-1.5 bg-white dark:bg-[#0e1526] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 text-xs sm:w-48 focus:outline-none shadow-xs"
        >
          <option value="all">All Lifecycle Phases</option>
          <option value="Inception">1. Inception &amp; Scope</option>
          <option value="Design">2. UI/UX Design</option>
          <option value="Engineering">3. Core Development</option>
          <option value="Quality">4. Testing &amp; Review</option>
          <option value="Delivery">5. Release &amp; Handover</option>
        </select>
        <select
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
          className="px-3 py-1.5 bg-white dark:bg-[#0e1526] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 text-xs sm:w-48 focus:outline-none shadow-xs"
        >
          <option value="all">All Clients</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>
              {c.business_name || c.name}
            </option>
          ))}
        </select>
      </div>

      {/* ─── KANBAN BOARD VIEW ──────────────────────────────────────────────── */}
      {view === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {KANBAN_PHASES.map(phase => {
            const PhaseIcon = phase.icon
            const phaseProjects = filtered.filter(p => {
              const stageCfg = STAGE_MAP[p.pipeline_stage || 'project_created']
              return (stageCfg?.phase || 'Inception') === phase.id
            })

            return (
              <div key={phase.id} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col min-w-[260px] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${phase.bg} ${phase.color}`}>
                      <PhaseIcon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-200">{phase.title}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                    {phaseProjects.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {phaseProjects.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500 italic">
                      No active projects in this phase.
                    </div>
                  ) : (
                    phaseProjects.map(proj => {
                      const client = clientMap[proj.client_id]
                      const stageCfg = STAGE_MAP[proj.pipeline_stage || 'project_created'] || PIPELINE_STAGES[0]
                      const priCfg = PRIORITY_CONFIG[proj.priority] || PRIORITY_CONFIG.medium

                      return (
                        <div
                          key={proj.id}
                          onClick={() => setSelectedProject(proj)}
                          className={`bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl cursor-pointer transition-all shadow-md space-y-3 border-l-4 ${priCfg.border}`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-[11px] font-mono font-bold text-blue-400">
                              {proj.project_number || 'CS-PRJ-2026-XXX'}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${priCfg.badge}`}>
                              {priCfg.label}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-sm font-bold text-slate-100 leading-tight">
                              {proj.name}
                            </h4>
                            <p className="text-xs text-slate-400 mt-0.5 truncate">
                              {client?.business_name || client?.name || 'Direct Client'}
                            </p>
                          </div>

                          {/* 17-Stage Step Indicator */}
                          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-blue-400 font-semibold truncate">
                                Stage {stageCfg.step}/17: {stageCfg.label}
                              </span>
                              <span className="font-mono text-slate-400 text-[10px]">
                                {stageCfg.progress}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${stageCfg.progress}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
                            <span className="font-semibold text-slate-200">
                              {formatCurrency(proj.budget || 0)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAdvanceStage(proj)
                              }}
                              className="px-2 py-1 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 border border-blue-500/20"
                              title="Advance to next stage"
                            >
                              Advance <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── TABLE VIEW ─────────────────────────────────────────────────────── */}
      {view === 'table' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/90 border-b border-slate-800 text-xs uppercase font-medium text-slate-400">
                <tr>
                  <th className="text-left px-4 py-3">Project #</th>
                  <th className="text-left px-4 py-3">Project Title</th>
                  <th className="text-left px-4 py-3">Client</th>
                  <th className="text-left px-4 py-3">Pipeline Stage (1-17)</th>
                  <th className="text-right px-4 py-3">Budget (₹)</th>
                  <th className="text-left px-4 py-3">Project Manager</th>
                  <th className="text-left px-4 py-3">Deadline</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-500">
                      No matching projects found.
                    </td>
                  </tr>
                ) : (
                  filtered.map(proj => {
                    const client = clientMap[proj.client_id]
                    const stageCfg = STAGE_MAP[proj.pipeline_stage || 'project_created'] || PIPELINE_STAGES[0]
                    const priCfg = PRIORITY_CONFIG[proj.priority] || PRIORITY_CONFIG.medium

                    return (
                      <tr
                        key={proj.id}
                        onClick={() => setSelectedProject(proj)}
                        className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-400">
                          {proj.project_number || 'CS-PRJ-2026-XXX'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-100">{proj.name}</div>
                          {proj.description && (
                            <div className="text-xs text-slate-400 truncate max-w-xs">{proj.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-200">{client?.business_name || client?.name || '—'}</div>
                          <div className="text-xs text-slate-500">{client?.name}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20 whitespace-nowrap">
                              {stageCfg.step}/17 {stageCfg.label}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {stageCfg.progress}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-100">
                          {formatCurrency(proj.budget || 0)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-300">
                          {proj.project_manager || 'Lead Architect'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {formatDate(proj.expected_delivery_date || proj.deadline)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => handleAdvanceStage(proj)}
                              className="px-2.5 py-1 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1 border border-blue-500/20"
                              title="Advance to next pipeline stage"
                            >
                              Advance <ArrowRight className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setSelectedProject(proj)}
                              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                              title="View Project Detail & Stepper"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* ─── PROJECT DETAIL & 17-STAGE STEPPER MODAL ───────────────────────── */}
      {selectedProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedProject(null)}
        >
          <div
            className="bg-slate-900 rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                    {selectedProject.project_number || 'CS-PRJ-2026-XXX'}
                  </span>
                  <h2 className="text-xl font-bold text-slate-100">{selectedProject.name}</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${(PRIORITY_CONFIG[selectedProject.priority] || PRIORITY_CONFIG.medium).badge}`}>
                    {(PRIORITY_CONFIG[selectedProject.priority] || PRIORITY_CONFIG.medium).label} Priority
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Client: <strong className="text-slate-200">{clientMap[selectedProject.client_id]?.business_name || clientMap[selectedProject.client_id]?.name}</strong>
                  {selectedProject.description && ` • ${selectedProject.description}`}
                </p>
              </div>
              <button onClick={() => setSelectedProject(null)} className="text-slate-400 hover:text-slate-200 p-1.5">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-[11px] font-medium text-slate-400 block uppercase">Project Budget</span>
                <span className="text-base font-bold text-blue-400">{formatCurrency(selectedProject.budget || 0)}</span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 block uppercase">Project Manager</span>
                <span className="text-xs font-semibold text-slate-200 truncate block">{selectedProject.project_manager || 'Lead Architect'}</span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 block uppercase">Start Date</span>
                <span className="text-xs font-mono text-slate-300">{formatDate(selectedProject.start_date)}</span>
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 block uppercase">Target Delivery</span>
                <span className="text-xs font-mono text-slate-300">{formatDate(selectedProject.expected_delivery_date || selectedProject.deadline)}</span>
              </div>
            </div>

            {/* ─── 17-Stage Visual Stepper Timeline ─────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    17-Stage Milestone Delivery Gate
                  </h3>
                  <p className="text-xs text-slate-400">Current Progress: {selectedProject.progress}% complete</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedProject.pipeline_stage || 'project_created'}
                    onChange={e => handleSetSpecificStage(selectedProject, e.target.value as ProjectPipelineStage)}
                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PIPELINE_STAGES.map(s => (
                      <option key={s.key} value={s.key}>
                        Stage {s.step}: {s.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAdvanceStage(selectedProject)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow transition-all"
                  >
                    Advance <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Stepper Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                {PIPELINE_STAGES.map(stage => {
                  const currentStageCfg = STAGE_MAP[selectedProject.pipeline_stage || 'project_created']
                  const isCurrent = stage.key === currentStageCfg?.key
                  const isPast = stage.step < (currentStageCfg?.step || 1)

                  return (
                    <div
                      key={stage.key}
                      onClick={() => handleSetSpecificStage(selectedProject, stage.key)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                        isCurrent
                          ? 'bg-blue-600/20 border-blue-500 text-blue-100 shadow-md ring-1 ring-blue-500'
                          : isPast
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200 hover:bg-emerald-900/30'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                        isCurrent
                          ? 'bg-blue-500 text-white'
                          : isPast
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isPast ? <Check className="w-3 h-3" /> : stage.step}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{stage.label}</div>
                        <div className="text-[10px] text-slate-400 truncate">{stage.phase}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Development Team & Tech Stack */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan-400" /> Development Team Roster
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedProject.development_team && selectedProject.development_team.length > 0)
                    ? selectedProject.development_team.map((t, idx) => (
                        <span key={idx} className="px-2 py-1 bg-slate-800 text-slate-200 rounded-lg text-xs border border-slate-700">
                          {t}
                        </span>
                      ))
                    : <span className="text-xs text-slate-500">Core Engineering Team</span>
                  }
                </div>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-purple-400" /> Technology Architecture
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProject.tech_stack?.map((tech, idx) => (
                    <span key={idx} className="px-2 py-1 bg-purple-500/10 text-purple-300 rounded-lg text-xs border border-purple-500/20">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Activity Log Stream */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Milestone Activity &amp; Stage Promotion Log
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(!selectedProject.activity_log || selectedProject.activity_log.length === 0) ? (
                  <div className="p-3 bg-slate-950/40 rounded-xl text-xs text-slate-500 text-center">
                    Project initialized on {formatDate(selectedProject.created_at)}.
                  </div>
                ) : (
                  selectedProject.activity_log.map((act, i) => (
                    <div key={act.id || i} className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{act.action}</span>
                        <span className="text-[11px] font-mono text-slate-400">{formatDate(act.timestamp)}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Officer: <span className="text-slate-300">{act.performed_by}</span>
                        {act.details && ` • ${act.details}`}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors"
              >
                Close Project Overview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CREATE PROJECT MODAL ──────────────────────────────────────────── */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Initialize New Project</h3>
                <p className="text-xs text-slate-400">Creates a tracked project with unique ID linked to client &amp; quotation</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Link to Approved Quotation</label>
                  <select
                    value={quotationId}
                    onChange={e => handleQuotationSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None / Custom Project</option>
                    {quotations.map(q => (
                      <option key={q.id} value={q.id}>
                        {q.quote_number} — {q.title} ({formatCurrency(q.total)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Client *</label>
                  <select
                    required
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.business_name || c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Project Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise E-Commerce Platform & Payment Gateway"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Project Description &amp; Scope</label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of project scope, objectives and deliverables..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Project Budget (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 75000"
                    value={budget}
                    onChange={e => setBudget(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as ProjectPriority)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Project Manager</label>
                  <input
                    type="text"
                    value={projectManager}
                    onChange={e => setProjectManager(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Agreement Reference (Optional)</label>
                  <select
                    value={agreementId}
                    onChange={e => setAgreementId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None</option>
                    {agreements.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.agreement_number} — {a.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Development Team Members (comma-separated)</label>
                <input
                  type="text"
                  value={teamMembersInput}
                  onChange={e => setTeamMembersInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Technology Stack (comma-separated)</label>
                <input
                  type="text"
                  value={techStackInput}
                  onChange={e => setTechStackInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
                >
                  <Plus className="w-4 h-4" /> Create Project Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
