import { useState, useMemo, useEffect } from 'react'
import {
  Plus, Search, Edit2, X, LayoutGrid, List,
  Calendar, ExternalLink, GitBranch, ChevronDown,
  Layers, Code2, Rocket, Paintbrush, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '../lib/utils'
import { supabase } from '../lib/supabase'
import type { Project, ProjectStatus, ProjectPriority, Client } from '../types/database'

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<ProjectPriority, { badge: string; label: string; border: string }> = {
  urgent: { badge: 'bg-red-500/10 text-red-400 border-red-500/20',       label: 'Urgent',  border: 'border-l-red-500' },
  high:   { badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20', label: 'High',  border: 'border-l-orange-500' },
  medium: { badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',     label: 'Medium', border: 'border-l-blue-500' },
  low:    { badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',   label: 'Low',   border: 'border-l-slate-500' },
}

const STATUS_CONFIG: Record<ProjectStatus, { badge: string; label: string; dot: string }> = {
  planning:    { badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',     dot: 'bg-slate-500',   label: 'Planning' },
  design:      { badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',  dot: 'bg-purple-500',  label: 'Design' },
  development: { badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',        dot: 'bg-blue-500',    label: 'Development' },
  review:      { badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',  dot: 'bg-yellow-500',  label: 'Review' },
  testing:     { badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',  dot: 'bg-orange-500',  label: 'Testing' },
  deployment:  { badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',        dot: 'bg-cyan-500',    label: 'Deployment' },
  live:        { badge: 'bg-green-500/10 text-green-400 border-green-500/20',     dot: 'bg-green-500',   label: 'Live' },
  maintenance: { badge: 'bg-teal-500/10 text-teal-400 border-teal-500/20',        dot: 'bg-teal-500',    label: 'Maintenance' },
  paused:      { badge: 'bg-slate-600/10 text-slate-400 border-slate-600/20',     dot: 'bg-slate-600',   label: 'Paused' },
  cancelled:   { badge: 'bg-red-500/10 text-red-400 border-red-500/20',           dot: 'bg-red-500',     label: 'Cancelled' },
}

const KANBAN_COLUMNS: { status: ProjectStatus; label: string; icon: React.ReactNode }[] = [
  { status: 'planning',    label: 'Planning',    icon: <Layers className="w-3.5 h-3.5" /> },
  { status: 'design',      label: 'Design',      icon: <Paintbrush className="w-3.5 h-3.5" /> },
  { status: 'development', label: 'Development', icon: <Code2 className="w-3.5 h-3.5" /> },
  { status: 'review',      label: 'Review',      icon: <Search className="w-3.5 h-3.5" /> },
  { status: 'testing',     label: 'Testing',     icon: <Layers className="w-3.5 h-3.5" /> },
  { status: 'live',        label: 'Live',        icon: <Rocket className="w-3.5 h-3.5" /> },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ProjectStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.planning
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: ProjectPriority }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.medium
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.badge}`}>
      {cfg.label}
    </span>
  )
}

function ProgressBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-green-500' : value >= 50 ? 'bg-blue-500' : value >= 25 ? 'bg-yellow-500' : 'bg-slate-600'
  return (
    <div className="w-full bg-slate-800 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  )
}

// ─── Form / Modal ─────────────────────────────────────────────────────────────

type FormData = {
  name: string; client_id: string; description: string
  status: ProjectStatus; priority: ProjectPriority
  start_date: string; deadline: string; progress: string
  tech_stack: string; staging_url: string; repository_url: string
}

const EMPTY_FORM: FormData = {
  name: '', client_id: '', description: '', status: 'planning', priority: 'medium',
  start_date: '', deadline: '', progress: '0', tech_stack: '', staging_url: '', repository_url: '',
}

const inputCls = 'w-full px-3 py-2 bg-white dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-[#0D99FF] focus:border-transparent'

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function ProjectModal({
  open, onClose, onSave, initial, title, clients = [],
}: {
  open: boolean; onClose: () => void; onSave: (d: FormData) => void; initial: FormData; title: string; clients?: Client[]
}) {
  const [form, setForm] = useState<FormData>(initial)
  if (!open) return null
  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Project name is required'); return }
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-[#E5E5E5] dark:border-[#383838]">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FormField label="Project Name *">
            <input className={inputCls} value={form.name} onChange={set('name')} placeholder="My Awesome Project" required />
          </FormField>
          <FormField label="Client">
            <select className={`${inputCls} cursor-pointer`} value={form.client_id} onChange={set('client_id')}>
              <option value="">Select client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} – {c.business_name || c.company}</option>)}
            </select>
          </FormField>
          <FormField label="Description">
            <textarea className={`${inputCls} resize-none`} rows={3} value={form.description} onChange={set('description')} placeholder="Project description..." />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Status">
              <select className={`${inputCls} cursor-pointer`} value={form.status} onChange={set('status')}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </FormField>
            <FormField label="Priority">
              <select className={`${inputCls} cursor-pointer`} value={form.priority} onChange={set('priority')}>
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date">
              <input type="date" className={inputCls} value={form.start_date} onChange={set('start_date')} />
            </FormField>
            <FormField label="Deadline">
              <input type="date" className={inputCls} value={form.deadline} onChange={set('deadline')} />
            </FormField>
          </div>
          <FormField label="Progress (%)">
            <input type="range" min="0" max="100" value={form.progress} onChange={set('progress')} className="w-full" />
            <span className="text-xs text-slate-400">{form.progress}%</span>
          </FormField>
          <FormField label="Tech Stack (comma-separated)">
            <input className={inputCls} value={form.tech_stack} onChange={set('tech_stack')} placeholder="React, Node.js, PostgreSQL" />
          </FormField>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-sm transition-colors">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">Save Project</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

function KanbanCard({ project, clientName, onEdit }: { project: Project; clientName: string; onEdit: (p: Project) => void }) {
  const priCfg = PRIORITY_CONFIG[project.priority]
  return (
    <div className={`bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] border-l-4 ${priCfg.border} rounded-xl p-4 space-y-3 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs hover:shadow-md transition-all`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight">{project.name}</p>
        <button onClick={() => onEdit(project)} className="text-slate-400 hover:text-[#0D99FF] transition-colors shrink-0">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-xs text-slate-500">{clientName}</p>
      <div className="flex items-center gap-2">
        <PriorityBadge priority={project.priority} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500">Progress</span>
          <span className="text-xs font-medium text-slate-400">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} />
      </div>
      {project.deadline && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Calendar className="w-3 h-3" />
          {formatDate(project.deadline)}
        </div>
      )}
      {project.tech_stack.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {project.tech_stack.slice(0, 3).map(t => (
            <span key={t} className="px-1.5 py-0.5 bg-slate-800 text-slate-500 rounded text-xs">{t}</span>
          ))}
          {project.tech_stack.length > 3 && (
            <span className="px-1.5 py-0.5 bg-slate-800 text-slate-600 rounded text-xs">+{project.tech_stack.length - 3}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [formInitial, setFormInitial] = useState<FormData>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: pData } = await (supabase as any)
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
      if (pData) setProjects(pData)

      const { data: cData } = await (supabase as any)
        .from('clients')
        .select('*')
        .order('name', { ascending: true })
      if (cData) setClients(cData)
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients])

  const stats = useMemo(() => ({
    active: projects.filter(p => p.status === 'development').length,
    design: projects.filter(p => p.status === 'design').length,
    dev:    projects.filter(p => p.status === 'development').length,
    live:   projects.filter(p => p.status === 'live').length,
  }), [projects])

  const filtered = useMemo(() => projects.filter(p => {
    const q = search.toLowerCase()
    return !q || p.name.toLowerCase().includes(q) || (clientMap[p.client_id]?.name ?? '').toLowerCase().includes(q)
  }), [projects, search, clientMap])

  const openAdd = () => { setEditProject(null); setFormInitial(EMPTY_FORM); setModalOpen(true) }
  const openEdit = (project: Project) => {
    setEditProject(project)
    setFormInitial({
      name: project.name, client_id: project.client_id,
      description: project.description ?? '', status: project.status, priority: project.priority,
      start_date: project.start_date?.slice(0, 10) ?? '',
      deadline: project.deadline?.slice(0, 10) ?? '',
      progress: project.progress.toString(),
      tech_stack: project.tech_stack.join(', '),
      staging_url: project.staging_url ?? '', repository_url: project.repository_url ?? '',
    })
    setModalOpen(true)
  }

  const handleSave = async (data: FormData) => {
    const techStack = data.tech_stack ? data.tech_stack.split(',').map(s => s.trim()).filter(Boolean) : []
    if (editProject) {
      const updated: Partial<Project> = {
        name: data.name,
        client_id: data.client_id,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        progress: Number(data.progress),
        tech_stack: techStack,
        start_date: data.start_date ? new Date(data.start_date).toISOString() : null,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : null,
        staging_url: data.staging_url || null,
        repository_url: data.repository_url || null,
        updated_at: new Date().toISOString()
      }

      try {
        await (supabase as any).from('projects').update(updated).eq('id', editProject.id)
      } catch (_) {}

      setProjects(ps => ps.map(p => p.id === editProject.id ? { ...p, ...updated } : p))
      toast.success('Project updated')
    } else {
      const newProj: Project = {
        id: `proj-${Date.now()}`,
        client_id: data.client_id,
        agreement_id: null,
        name: data.name,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        start_date: data.start_date ? new Date(data.start_date).toISOString() : null,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : null,
        completed_at: null,
        website_url: null,
        staging_url: data.staging_url || null,
        repository_url: data.repository_url || null,
        tech_stack: techStack,
        progress: Number(data.progress),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      try {
        await (supabase as any).from('projects').insert([newProj])
      } catch (_) {}

      setProjects(ps => [newProj, ...ps])
      toast.success('Project added')
    }
    setModalOpen(false)
  }

  const STAT_CARDS = [
    { label: 'Development', value: stats.active, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'In Design',   value: stats.design, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'In Dev',      value: stats.dev,    color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Live',        value: stats.live,   color: 'text-green-400', bg: 'bg-green-500/10' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Projects</h1>
          <p className="text-slate-400 text-sm mt-0.5">{projects.length} projects total</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#0D99FF] hover:bg-[#007BE5] text-white rounded-lg text-xs font-semibold transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Add Project
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, color, bg }) => (
          <div key={label} className="bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] rounded-xl p-4 flex items-center gap-3 shadow-xs">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
              <Rocket className={`w-4 h-4 ${color}`} />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{label}</p>
              <p className="text-xl font-bold text-slate-900 dark:text-[#F5F5F5]">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-[#0D99FF]"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center bg-slate-100 dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#383838] rounded-lg p-0.5 gap-1">
          <button
            onClick={() => setView('kanban')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${view === 'kanban' ? 'bg-[#0D99FF] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Kanban
          </button>
          <button
            onClick={() => setView('table')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${view === 'table' ? 'bg-[#0D99FF] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            <List className="w-3.5 h-3.5" />
            Table
          </button>
        </div>
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-2">
            {KANBAN_COLUMNS.map(col => {
              const colProjects = filtered.filter(p => p.status === col.status)
              const cfg = STATUS_CONFIG[col.status]
              return (
                <div key={col.status} className="w-72 shrink-0">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-sm font-semibold text-slate-300">{col.label}</span>
                    <span className="ml-auto text-xs text-slate-600 bg-slate-800 rounded-full px-2 py-0.5">{colProjects.length}</span>
                  </div>
                  <div className="space-y-3 min-h-24">
                    {colProjects.length === 0 ? (
                      <div className="border-2 border-dashed border-slate-800 rounded-xl h-20 flex items-center justify-center">
                        <span className="text-xs text-slate-700">No projects</span>
                      </div>
                    ) : (
                      colProjects.map(p => (
                        <KanbanCard
                          key={p.id}
                          project={p}
                          clientName={clientMap[p.client_id]?.name ?? 'Unknown'}
                          onEdit={openEdit}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Table View */}
      {view === 'table' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Name', 'Client', 'Status', 'Priority', 'Progress', 'Deadline', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-slate-500">No projects found</td>
                  </tr>
                ) : (
                  filtered.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/50 transition-colors group">
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="text-sm font-medium text-slate-200">{p.name}</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {p.tech_stack.slice(0, 2).map(t => (
                              <span key={t} className="px-1.5 py-0.5 bg-slate-800 text-slate-500 rounded text-xs">{t}</span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-400">{clientMap[p.client_id]?.name ?? '—'}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3.5"><PriorityBadge priority={p.priority} /></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 min-w-24">
                          <ProgressBar value={p.progress} />
                          <span className="text-xs text-slate-500 shrink-0">{p.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-400 whitespace-nowrap">{formatDate(p.deadline)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(p)} className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {p.staging_url && (
                            <a href={p.staging_url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors" title="Staging">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {p.repository_url && (
                            <a href={p.repository_url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors" title="Repo">
                              <GitBranch className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initial={formInitial}
        title={editProject ? 'Edit Project' : 'Add New Project'}
        clients={clients}
      />
    </div>
  )
}
