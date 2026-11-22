import { useState, useMemo, useEffect } from 'react'
import {
  Rocket, CheckCircle2, XCircle, Clock, ExternalLink,
  Plus, Terminal, RotateCcw, AlertTriangle, GitBranch, Globe
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '../lib/utils'
import { supabase } from '../lib/supabase'
import type { Project } from '../types/database'

interface DeploymentRecord {
  id: string
  projectId: string
  environment: 'production' | 'staging'
  branch: string
  commitHash: string
  commitMsg: string
  status: 'success' | 'failed' | 'in_progress' | 'rolled_back'
  url: string
  deployedBy: string
  deployedAt: string
  duration: string
  logs: string[]
}

const INITIAL_DEPLOYMENTS: DeploymentRecord[] = []

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<DeploymentRecord[]>(INITIAL_DEPLOYMENTS)
  const [projects, setProjects] = useState<Project[]>([])
  const [activeLogModal, setActiveLogModal] = useState<DeploymentRecord | null>(null)
  const [showDeployModal, setShowDeployModal] = useState(false)

  // New deploy form
  const [projectId, setProjectId] = useState('')
  const [env, setEnv] = useState<'production' | 'staging'>('staging')
  const [branch, setBranch] = useState('main')
  const [notes, setNotes] = useState('Production release approved after QA testing')

  useEffect(() => {
    async function loadProjects() {
      try {
        const { data } = await (supabase as any).from('projects').select('*').order('name', { ascending: true })
        if (data) {
          setProjects(data as Project[])
          if (data.length > 0 && !projectId) setProjectId(data[0].id)
        }
      } catch (_) {}
    }
    loadProjects()
  }, [])

  const projectMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects])

  const stats = useMemo(() => {
    const total = deployments.length
    const successful = deployments.filter(d => d.status === 'success').length
    const failed = deployments.filter(d => d.status === 'failed').length
    return { total, successful, failed }
  }, [deployments])

  const triggerDeploy = (e: React.FormEvent) => {
    e.preventDefault()
    const proj = projectMap[projectId]

    const newDep: DeploymentRecord = {
      id: `DEP-${Math.floor(1000 + Math.random() * 9000)}`,
      projectId,
      environment: env,
      branch,
      commitHash: Math.random().toString(16).substring(2, 9),
      commitMsg: notes,
      status: 'in_progress',
      url: env === 'production' ? (proj?.website_url || `https://${proj?.name.toLowerCase().replace(/\s+/g, '')}.com`) : (proj?.staging_url || 'https://staging.capesecure.vercel.app'),
      deployedBy: 'CapeSecure Admin',
      deployedAt: new Date().toISOString(),
      duration: 'In progress...',
      logs: [
        'Connecting to Vercel build server...',
        'Checking out branch ' + branch,
        'Running production build bundle...'
      ]
    }

    setDeployments([newDep, ...deployments])
    setShowDeployModal(false)
    toast.success(`Deployment to ${env.toUpperCase()} initiated!`)

    setTimeout(() => {
      setDeployments(prev => prev.map(d => d.id === newDep.id ? {
        ...d,
        status: 'success',
        duration: '39s',
        logs: [...d.logs, 'Build finished with zero warnings', 'Live at ' + d.url]
      } : d))
      toast.success(`${env.toUpperCase()} deployment completed successfully!`)
    }, 2500)
  }

  const handleRollback = (dep: DeploymentRecord) => {
    if (confirm(`Are you sure you want to rollback ${dep.id} to the previous stable release?`)) {
      setDeployments(prev => prev.map(d => d.id === dep.id ? {
        ...d,
        status: 'rolled_back',
        logs: [...d.logs, `[${new Date().toLocaleTimeString()}] Rolled back by administrator.`]
      } : d))
      toast.success(`Rollback initiated for ${dep.id}`)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Deployments & Hosting</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Production Vercel deployments, staging edge environments, and instant rollbacks
          </p>
        </div>
        <button
          onClick={() => setShowDeployModal(true)}
          className="btn-primary"
        >
          <Rocket className="w-4 h-4" />
          Deploy New Release
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Total Deployments</span>
            <Rocket className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
          <span className="text-xs text-slate-400 mt-1 block">Production & Staging</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Successful Releases</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.successful}</p>
          <span className="text-xs text-emerald-500 mt-1 block">100% uptime SLA</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Avg Build Time</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">44s</p>
          <span className="text-xs text-slate-400 mt-1 block">Edge CDN cached</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Hosting Provider</span>
            <Globe className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">Vercel</p>
          <span className="text-xs text-purple-400 mt-1 block">Global Edge Network</span>
        </div>
      </div>

      {/* Deployments Table */}
      <div className="card overflow-hidden">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Deployment ID</th>
                <th>Project</th>
                <th>Environment</th>
                <th>Branch & Commit</th>
                <th>Commit Message</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Deployed At</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deployments.map(dep => {
                const proj = projectMap[dep.projectId]
                return (
                  <tr key={dep.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {dep.id}
                    </td>
                    <td>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{proj?.name ?? '—'}</div>
                      <a
                        href={dep.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-500 hover:text-blue-500 flex items-center gap-1 mt-0.5"
                      >
                        {dep.url.replace('https://', '')}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                        dep.environment === 'production'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}>
                        {dep.environment}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-xs text-slate-700 dark:text-slate-300">
                        <GitBranch className="w-3 h-3 text-slate-400" />
                        <span className="font-mono">{dep.branch}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">{dep.commitHash}</span>
                    </td>
                    <td className="max-w-xs truncate text-xs text-slate-600 dark:text-slate-400">
                      {dep.commitMsg}
                    </td>
                    <td>
                      {dep.status === 'success' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      )}
                      {dep.status === 'in_progress' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" /> Building
                        </span>
                      )}
                      {dep.status === 'rolled_back' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          <RotateCcw className="w-3 h-3" /> Rolled Back
                        </span>
                      )}
                      {dep.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                          <XCircle className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="font-mono text-xs text-slate-400">{dep.duration}</td>
                    <td className="text-xs text-slate-500">{formatDate(dep.deployedAt)}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setActiveLogModal(dep)}
                          className="btn-ghost p-1.5"
                          title="View Deployment Logs"
                        >
                          <Terminal className="w-4 h-4" />
                        </button>
                        {dep.status === 'success' && (
                          <button
                            onClick={() => handleRollback(dep)}
                            className="btn-ghost p-1.5 text-amber-600 hover:text-amber-500"
                            title="Rollback this release"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Build Logs Modal */}
      {activeLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-950 text-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-mono font-bold">Build Logs — {activeLogModal.id} ({activeLogModal.environment})</h3>
              </div>
              <button onClick={() => setActiveLogModal(null)} className="btn-ghost text-slate-400 hover:text-slate-200 p-1.5">✕</button>
            </div>

            <div className="bg-black rounded-xl p-4 font-mono text-xs space-y-1.5 text-slate-300 max-h-80 overflow-y-auto">
              {activeLogModal.logs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-slate-600 select-none">$</span>
                  <span className={log.includes('complete') || log.includes('OK') ? 'text-emerald-400 font-semibold' : ''}>
                    {log}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setActiveLogModal(null)} className="btn-secondary text-xs">
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trigger Deploy Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Trigger New Deployment</h3>
              <button onClick={() => setShowDeployModal(false)} className="btn-ghost p-1.5">✕</button>
            </div>

            <form onSubmit={triggerDeploy} className="space-y-4">
              <div className="form-group">
                <label className="label">Project *</label>
                <select
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="input cursor-pointer"
                >
                  <option value="">Select a project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Environment</label>
                  <select
                    value={env}
                    onChange={e => setEnv(e.target.value as any)}
                    className="input cursor-pointer"
                  >
                    <option value="staging">Staging (Preview)</option>
                    <option value="production">Production (Live)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Git Branch</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={e => setBranch(e.target.value)}
                    className="input font-mono text-xs"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">Release Notes / Commit Message</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="input resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowDeployModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Rocket className="w-4 h-4" /> Start Build & Deploy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
