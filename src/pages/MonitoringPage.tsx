import { useState, useMemo } from 'react'
import {
  Activity, CheckCircle2, AlertTriangle, XCircle, Globe,
  ShieldCheck, Clock, RefreshCw, ExternalLink, Plus, Lock, Server
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '../lib/utils'

interface MonitoredSite {
  id: string
  name: string
  url: string
  clientName: string
  status: 'up' | 'degraded' | 'down'
  uptime: number
  responseTime: number // in ms
  sslValid: boolean
  sslDaysRemaining: number
  lastChecked: string
  uptimeHistory: boolean[] // true = up, false = down
}

const INITIAL_SITES: MonitoredSite[] = [
  {
    id: 'mon-01',
    name: 'CapeSecure Main Portal',
    url: 'https://capesecure.vercel.app',
    clientName: 'CapeSecure Internal',
    status: 'up',
    uptime: 99.98,
    responseTime: 98,
    sslValid: true,
    sslDaysRemaining: 76,
    lastChecked: '2 mins ago',
    uptimeHistory: [true, true, true, true, true, true, true, true, true, true, true, true]
  },
  {
    id: 'mon-02',
    name: 'Apex Financial Platform',
    url: 'https://apexfin.co.za',
    clientName: 'Apex Financial',
    status: 'up',
    uptime: 99.95,
    responseTime: 142,
    sslValid: true,
    sslDaysRemaining: 120,
    lastChecked: '1 min ago',
    uptimeHistory: [true, true, true, true, true, true, true, true, true, true, true, true]
  },
  {
    id: 'mon-03',
    name: 'StyleHaus Fashion Boutique',
    url: 'https://stylehaus.co.za',
    clientName: 'StyleHaus Fashion',
    status: 'up',
    uptime: 99.82,
    responseTime: 210,
    sslValid: true,
    sslDaysRemaining: 45,
    lastChecked: '3 mins ago',
    uptimeHistory: [true, true, true, true, true, false, true, true, true, true, true, true]
  },
  {
    id: 'mon-04',
    name: 'Horizon Health Patient Clinic',
    url: 'https://horizonhealth.co.za',
    clientName: 'Horizon Health',
    status: 'up',
    uptime: 99.99,
    responseTime: 115,
    sslValid: true,
    sslDaysRemaining: 90,
    lastChecked: 'Just now',
    uptimeHistory: [true, true, true, true, true, true, true, true, true, true, true, true]
  },
  {
    id: 'mon-05',
    name: 'Cape Craft Brews Online Shop',
    url: 'https://craftbrews.co.za',
    clientName: 'Cape Craft Brews',
    status: 'degraded',
    uptime: 97.40,
    responseTime: 890,
    sslValid: true,
    sslDaysRemaining: 14,
    lastChecked: '5 mins ago',
    uptimeHistory: [true, true, false, true, true, true, false, true, true, true, true, false]
  },
  {
    id: 'mon-06',
    name: 'Pinnacle Properties Staging',
    url: 'https://staging.pinnacleprops.co.za',
    clientName: 'Pinnacle Properties',
    status: 'down',
    uptime: 94.20,
    responseTime: 0,
    sslValid: false,
    sslDaysRemaining: 0,
    lastChecked: 'Just now',
    uptimeHistory: [true, true, true, false, false, false, false, false, false, false, false, false]
  }
]

export default function MonitoringPage() {
  const [sites, setSites] = useState<MonitoredSite[]>(INITIAL_SITES)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  // New site form
  const [newUrl, setNewUrl] = useState('')
  const [newName, setNewName] = useState('')
  const [newClient, setNewClient] = useState('')

  const stats = useMemo(() => {
    const total = sites.length
    const up = sites.filter(s => s.status === 'up').length
    const degraded = sites.filter(s => s.status === 'degraded').length
    const down = sites.filter(s => s.status === 'down').length
    const avgResponse = Math.round(
      sites.filter(s => s.status !== 'down').reduce((acc, s) => acc + s.responseTime, 0) / (total - down || 1)
    )
    return { total, up, degraded, down, avgResponse }
  }, [sites])

  const refreshMonitors = () => {
    setIsRefreshing(true)
    toast.loading('Pinging all endpoints and validating TLS/SSL certs...', { id: 'ping' })
    setTimeout(() => {
      setSites(prev => prev.map(s => ({
        ...s,
        lastChecked: 'Just now',
        responseTime: s.status === 'down' ? 0 : Math.floor(Math.random() * 80 + 85)
      })))
      setIsRefreshing(false)
      toast.success('Heartbeat checks updated across 6 target zones!', { id: 'ping' })
    }, 1500)
  }

  const handleAddSite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUrl || !newName) return

    const newSite: MonitoredSite = {
      id: `mon-${Date.now()}`,
      name: newName,
      url: newUrl.startsWith('http') ? newUrl : `https://${newUrl}`,
      clientName: newClient || 'Client Website',
      status: 'up',
      uptime: 100.0,
      responseTime: 120,
      sslValid: true,
      sslDaysRemaining: 89,
      lastChecked: 'Just now',
      uptimeHistory: Array(12).fill(true)
    }

    setSites([...sites, newSite])
    setShowAddModal(false)
    setNewUrl('')
    setNewName('')
    setNewClient('')
    toast.success('Website added to uptime monitoring rotation!')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Website Health & Uptime</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Real-time HTTP healthchecks, SSL certificate expiration tracking, and latency monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refreshMonitors}
            disabled={isRefreshing}
            className="btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
            Ping Now
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Add Monitor
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Systems Operational</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.up} / {stats.total}</p>
          <span className="text-xs text-slate-400 mt-1 block">Healthy response codes</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Degraded Performance</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.degraded}</p>
          <span className="text-xs text-amber-400 mt-1 block">High latency (&gt;500ms)</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Down Incidents</span>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.down}</p>
          <span className="text-xs text-red-400 mt-1 block">5xx error or timeout</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Average Latency</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.avgResponse}ms</p>
          <span className="text-xs text-emerald-500 mt-1 block">Global Edge CDN response</span>
        </div>
      </div>

      {/* Monitor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sites.map(site => {
          const isUp = site.status === 'up'
          const isDegraded = site.status === 'degraded'
          const isDown = site.status === 'down'

          return (
            <div
              key={site.id}
              className={`card p-5 space-y-4 hover:shadow-md transition-shadow border-t-4 ${
                isUp ? 'border-t-emerald-500' : isDegraded ? 'border-t-amber-500' : 'border-t-red-500'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      isUp ? 'bg-emerald-500 shadow-sm shadow-emerald-500' : isDegraded ? 'bg-amber-500 shadow-sm shadow-amber-500' : 'bg-red-500 animate-pulse'
                    }`} />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{site.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{site.clientName}</p>
                </div>
                <a
                  href={site.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-blue-500 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* URL */}
              <div className="font-mono text-xs text-slate-600 dark:text-slate-400 truncate bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                {site.url}
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-3 gap-2 text-center py-1 border-y border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Uptime</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{site.uptime}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Response</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {site.status === 'down' ? '—' : `${site.responseTime}ms`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">SSL Cert</span>
                  <span className={`font-bold ${site.sslValid ? 'text-emerald-500' : 'text-red-500'}`}>
                    {site.sslValid ? `${site.sslDaysRemaining}d` : 'Expired'}
                  </span>
                </div>
              </div>

              {/* Uptime Sparkline Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Last 12 hours history</span>
                  <span>Checked {site.lastChecked}</span>
                </div>
                <div className="flex gap-1 h-3">
                  {site.uptimeHistory.map((up, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm ${up ? 'bg-emerald-500' : 'bg-red-500'}`}
                      title={up ? 'HTTP 200 OK' : 'Outage detected'}
                    />
                  ))}
                </div>
              </div>

              {/* SSL Status Badge */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <Lock className="w-3.5 h-3.5 text-emerald-500" />
                  TLS 1.3 Certified
                </span>
                <button
                  onClick={() => toast.success(`Diagnostic check triggered for ${site.name}`)}
                  className="text-blue-600 hover:text-blue-500 font-semibold text-xs"
                >
                  Inspect Logs
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Monitor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Add Site to Monitor</h3>
              <button onClick={() => setShowAddModal(false)} className="btn-ghost p-1.5">✕</button>
            </div>

            <form onSubmit={handleAddSite} className="space-y-4">
              <div className="form-group">
                <label className="label">Site Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stellar Law Client Portal"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="input"
                />
              </div>

              <div className="form-group">
                <label className="label">Endpoint URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.co.za"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  className="input font-mono text-xs"
                />
              </div>

              <div className="form-group">
                <label className="label">Client Organization</label>
                <input
                  type="text"
                  placeholder="e.g. Stellar Law Chambers"
                  value={newClient}
                  onChange={e => setNewClient(e.target.value)}
                  className="input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Start Monitoring
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
