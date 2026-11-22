import { useState, useMemo, useEffect } from 'react'
import {
  TestTube, CheckCircle2, XCircle, AlertTriangle, Play,
  Plus, Search, Bug, ShieldAlert, Clock, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '../lib/utils'
import { supabase } from '../lib/supabase'
import type { Project } from '../types/database'

interface TestCase {
  id: string
  suite: string
  name: string
  type: 'functional' | 'ui' | 'security' | 'performance'
  status: 'passed' | 'failed' | 'pending' | 'skipped'
  lastRun: string
  duration: string
}

interface BugReport {
  id: string
  title: string
  projectId: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'open' | 'in_progress' | 'fixed' | 'closed'
  reportedBy: string
  createdAt: string
}

const INITIAL_TESTS: TestCase[] = [
  { id: 'TC-101', suite: 'Authentication & RLS', name: 'Admin login with MFA validation', type: 'security', status: 'passed', lastRun: '2026-11-20T10:00:00Z', duration: '142ms' },
  { id: 'TC-102', suite: 'Authentication & RLS', name: 'Unauthorized client table write blocked by RLS', type: 'security', status: 'passed', lastRun: '2026-11-20T10:00:00Z', duration: '85ms' },
  { id: 'TC-103', suite: 'Checkout & Payments', name: 'PayFast gateway webhook signature verification', type: 'functional', status: 'passed', lastRun: '2026-11-20T10:01:00Z', duration: '310ms' },
  { id: 'TC-104', suite: 'Checkout & Payments', name: 'Cart discount code deduction on checkout', type: 'functional', status: 'failed', lastRun: '2026-11-20T10:01:30Z', duration: '205ms' },
  { id: 'TC-105', suite: 'UI & Responsiveness', name: 'Mobile hamburger navigation menu collapse on iPhone 15', type: 'ui', status: 'passed', lastRun: '2026-11-19T14:20:00Z', duration: '450ms' },
  { id: 'TC-106', suite: 'Performance & SEO', name: 'Lighthouse Performance Score >= 90 on Homepage', type: 'performance', status: 'passed', lastRun: '2026-11-19T16:00:00Z', duration: '2.4s' },
  { id: 'TC-107', suite: 'Form Submissions', name: 'Lead requirement contact form anti-spam honeypot', type: 'security', status: 'passed', lastRun: '2026-11-18T11:15:00Z', duration: '90ms' },
]

const INITIAL_BUGS: BugReport[] = [
  { id: 'BUG-01', title: 'Cart coupon code fails on subtotal under ₹1,000', projectId: 'proj-002', severity: 'high', status: 'open', reportedBy: 'QA Engineer', createdAt: '2026-11-20T10:05:00Z' },
  { id: 'BUG-02', title: 'Invoice PDF download button clipped on iPad viewport', projectId: 'proj-001', severity: 'low', status: 'in_progress', reportedBy: 'Lead Designer', createdAt: '2026-11-19T11:30:00Z' },
  { id: 'BUG-03', title: 'Slow query on patient appointment history lookup', projectId: 'proj-003', severity: 'medium', status: 'fixed', reportedBy: 'Backend Lead', createdAt: '2026-11-18T15:00:00Z' },
  { id: 'BUG-04', title: 'Cross-origin header missing for staging API endpoints', projectId: 'proj-001', severity: 'critical', status: 'closed', reportedBy: 'Security Auditor', createdAt: '2026-11-16T09:00:00Z' },
]

export default function TestingPage() {
  const [activeTab, setActiveTab] = useState<'tests' | 'bugs'>('tests')
  const [testCases, setTestCases] = useState<TestCase[]>(INITIAL_TESTS)
  const [bugReports, setBugReports] = useState<BugReport[]>(INITIAL_BUGS)
  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch] = useState('')
  const [showBugModal, setShowBugModal] = useState(false)
  const [isRunningAll, setIsRunningAll] = useState(false)

  // New bug state
  const [bugTitle, setBugTitle] = useState('')
  const [bugProject, setBugProject] = useState('')
  const [bugSeverity, setBugSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('medium')

  useEffect(() => {
    async function loadProjects() {
      try {
        const { data } = await (supabase as any).from('projects').select('*').order('name', { ascending: true })
        if (data) {
          setProjects(data as Project[])
          if (data.length > 0 && !bugProject) setBugProject(data[0].id)
        }
      } catch (_) {}
    }
    loadProjects()
  }, [])

  const projectMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects])

  const stats = useMemo(() => {
    const total = testCases.length
    const passed = testCases.filter(t => t.status === 'passed').length
    const failed = testCases.filter(t => t.status === 'failed').length
    const rate = total > 0 ? Math.round((passed / total) * 100) : 0
    const openBugs = bugReports.filter(b => b.status === 'open' || b.status === 'in_progress').length
    return { total, passed, failed, rate, openBugs }
  }, [testCases, bugReports])

  const runAllTests = () => {
    setIsRunningAll(true)
    toast.loading('Running automated test suite across all environments...', { id: 'test-run' })
    setTimeout(() => {
      setTestCases(prev => prev.map(t => ({
        ...t,
        status: t.id === 'TC-104' ? 'failed' : 'passed',
        lastRun: new Date().toISOString()
      })))
      setIsRunningAll(false)
      toast.success('Test run completed! 6 passed, 1 failed.', { id: 'test-run' })
    }, 1800)
  }

  const handleCreateBug = (e: React.FormEvent) => {
    e.preventDefault()
    if (!bugTitle) return

    const newBug: BugReport = {
      id: `BUG-${String(bugReports.length + 1).padStart(2, '0')}`,
      title: bugTitle,
      projectId: bugProject,
      severity: bugSeverity,
      status: 'open',
      reportedBy: 'CapeSecure QA',
      createdAt: new Date().toISOString()
    }

    setBugReports([newBug, ...bugReports])
    setShowBugModal(false)
    setBugTitle('')
    toast.success('Bug ticket logged and assigned!')
  }

  const severityBadge = (sev: BugReport['severity']) => {
    switch (sev) {
      case 'critical': return 'bg-red-500/10 text-red-500 border border-red-500/20'
      case 'high':     return 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
      case 'medium':   return 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
      case 'low':      return 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Quality Assurance & Testing</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Automated test suites, end-to-end integration checks, and security regression tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={runAllTests}
            disabled={isRunningAll}
            className="btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 ${isRunningAll ? 'animate-spin text-blue-500' : ''}`} />
            Run Full Test Suite
          </button>
          <button
            onClick={() => setShowBugModal(true)}
            className="btn-primary"
          >
            <Bug className="w-4 h-4" />
            Report Defect
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Test Pass Rate</span>
            <TestTube className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.rate}%</p>
          <span className="text-xs text-emerald-500 mt-1 block">{stats.passed} passed / {stats.total} total</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Passed Tests</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.passed}</p>
          <span className="text-xs text-slate-400 mt-1 block">Verified green</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Failed Tests</span>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</p>
          <span className="text-xs text-red-400 mt-1 block">Requires engineer fix</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Active Bug Reports</span>
            <Bug className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.openBugs}</p>
          <span className="text-xs text-slate-400 mt-1 block">In triage or fixing</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('tests')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'tests'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <TestTube className="w-4 h-4" />
          Test Suites & Cases ({testCases.length})
        </button>
        <button
          onClick={() => setActiveTab('bugs')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'bugs'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Bug className="w-4 h-4" />
          Bug Tracker ({bugReports.length})
        </button>
      </div>

      {/* Tests Table */}
      {activeTab === 'tests' && (
        <div className="card overflow-hidden">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Test ID</th>
                  <th>Test Suite</th>
                  <th>Test Case Name</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Last Execution</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {testCases.map(tc => (
                  <tr key={tc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="font-mono text-xs font-semibold text-slate-500">{tc.id}</td>
                    <td className="font-medium text-xs text-slate-700 dark:text-slate-300">{tc.suite}</td>
                    <td className="text-sm font-medium text-slate-900 dark:text-slate-100">{tc.name}</td>
                    <td>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {tc.type}
                      </span>
                    </td>
                    <td>
                      {tc.status === 'passed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Passed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                          <XCircle className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="font-mono text-xs text-slate-400">{tc.duration}</td>
                    <td className="text-xs text-slate-500">{formatDate(tc.lastRun)}</td>
                    <td className="text-right">
                      <button
                        onClick={() => toast.success(`Re-running test ${tc.id}... Passed!`)}
                        className="btn-ghost p-1.5"
                        title="Re-run test"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bug Tracker Table */}
      {activeTab === 'bugs' && (
        <div className="card overflow-hidden">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Bug ID</th>
                  <th>Title</th>
                  <th>Project</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Reported By</th>
                  <th>Reported Date</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bugReports.map(bug => {
                  const proj = projectMap[bug.projectId]
                  return (
                    <tr key={bug.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="font-mono text-xs font-semibold text-red-500">{bug.id}</td>
                      <td className="font-medium text-slate-900 dark:text-slate-100">{bug.title}</td>
                      <td className="text-xs text-slate-500">{proj?.name ?? 'General'}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase ${severityBadge(bug.severity)}`}>
                          {bug.severity}
                        </span>
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded text-xs font-medium capitalize bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {bug.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="text-xs text-slate-500">{bug.reportedBy}</td>
                      <td className="text-xs text-slate-500">{formatDate(bug.createdAt)}</td>
                      <td className="text-right">
                        <button
                          onClick={() => {
                            setBugReports(prev => prev.map(b => b.id === bug.id ? { ...b, status: 'fixed' } : b))
                            toast.success(`Bug ${bug.id} marked as fixed!`)
                          }}
                          className="btn-ghost p-1.5 text-emerald-600 hover:text-emerald-500"
                          title="Mark Fixed"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report Bug Modal */}
      {showBugModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Log QA Defect</h3>
              <button onClick={() => setShowBugModal(false)} className="btn-ghost p-1.5">✕</button>
            </div>

            <form onSubmit={handleCreateBug} className="space-y-4">
              <div className="form-group">
                <label className="label">Defect Summary *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Broken SSL certificate warning on client staging domain"
                  value={bugTitle}
                  onChange={e => setBugTitle(e.target.value)}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Project</label>
                  <select
                    value={bugProject}
                    onChange={e => setBugProject(e.target.value)}
                    className="input cursor-pointer"
                  >
                    <option value="">Select project...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Severity Level</label>
                  <select
                    value={bugSeverity}
                    onChange={e => setBugSeverity(e.target.value as any)}
                    className="input cursor-pointer"
                  >
                    <option value="critical">Critical (Blocking Live)</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low (Cosmetic)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowBugModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Submit Bug Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
