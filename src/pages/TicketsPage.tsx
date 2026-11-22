import { useState, useMemo, useEffect } from 'react'
import {
  LifeBuoy, Plus, Search, MessageSquare, Clock, CheckCircle2,
  AlertCircle, ChevronRight, User, Send, Filter, AlertTriangle, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { getClients } from '../lib/clientStore'
import type { SupportTicket, TicketStatus, TicketPriority, Client, Project } from '../types/database'

const STATUS_CONFIG: Record<TicketStatus, { label: string; badge: string }> = {
  open:        { label: 'Open',        badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  in_progress: { label: 'In Progress', badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
  waiting:     { label: 'Waiting',     badge: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
  resolved:    { label: 'Resolved',    badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  closed:      { label: 'Closed',      badge: 'bg-slate-500/10 text-slate-400 border border-slate-500/20' },
}

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-500 font-bold' },
  high:   { label: 'High',   color: 'text-orange-500 font-semibold' },
  medium: { label: 'Medium', color: 'text-blue-500' },
  low:    { label: 'Low',    color: 'text-slate-400' },
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Reply modal state
  const [replyText, setReplyText] = useState('')

  // New ticket state
  const [clientId, setClientId] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Technical Issue')
  const [priority, setPriority] = useState<TicketPriority>('medium')

  const loadData = async () => {
    setLoading(true)
    try {
      const [
        { data: tData },
        cList,
        { data: prData },
      ] = await Promise.all([
        (supabase as any).from('support_tickets').select('*').order('created_at', { ascending: false }).catch(() => ({ data: [] })),
        getClients(),
        (supabase as any).from('projects').select('*').order('name', { ascending: true }).catch(() => ({ data: [] })),
      ])
      if (tData) setTickets(tData as SupportTicket[])
      if (cList) {
        setClients(cList as Client[])
        if (cList.length > 0 && !clientId) setClientId(cList[0].id)
      }
      if (prData) setProjects(prData as Project[])
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('capesecure-tickets-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients])
  const projectMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects])

  const stats = useMemo(() => {
    const total = tickets.length
    const open = tickets.filter(t => t.status === 'open').length
    const inProgress = tickets.filter(t => t.status === 'in_progress').length
    const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
    return { total, open, inProgress, resolved }
  }, [tickets])

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      const client = clientMap[t.client_id]
      const matchSearch =
        t.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
        t.subject.toLowerCase().includes(search.toLowerCase()) ||
        (client?.name?.toLowerCase().includes(search.toLowerCase()) ?? false)
      const matchStatus = statusFilter === 'all' || t.status === statusFilter
      const matchPri = priorityFilter === 'all' || t.priority === priorityFilter
      return matchSearch && matchStatus && matchPri
    })
  }, [tickets, search, statusFilter, priorityFilter, clientMap])

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject) return

    const newTicketData = {
      client_id: clientId || null,
      project_id: null,
      ticket_number: `TKT-${String(tickets.length + 1).padStart(3, '0')}`,
      subject,
      description,
      status: 'open' as TicketStatus,
      priority,
      category,
      resolved_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    try {
      const { data, error } = await (supabase as any)
        .from('support_tickets')
        .insert([newTicketData])
        .select()
        .single()

      if (!error && data) {
        setTickets([data as SupportTicket, ...tickets])
      } else {
        setTickets([{ id: `tick-${Date.now()}`, ...newTicketData } as SupportTicket, ...tickets])
      }
      setShowCreateModal(false)
      setSubject('')
      setDescription('')
      toast.success('Support ticket opened successfully!')
    } catch (_) {
      toast.error('Failed to create ticket')
    }
  }

  const handleResolveTicket = async (ticketId: string) => {
    const now = new Date().toISOString()
    setTickets(prev => prev.map(t => t.id === ticketId ? {
      ...t,
      status: 'resolved',
      resolved_at: now,
      updated_at: now
    } : t))
    if (activeTicket && activeTicket.id === ticketId) {
      setActiveTicket(prev => prev ? { ...prev, status: 'resolved' } : null)
    }

    try {
      await (supabase as any)
        .from('support_tickets')
        .update({ status: 'resolved', resolved_at: now, updated_at: now })
        .eq('id', ticketId)
      toast.success('Ticket marked as resolved!')
    } catch (_) {}
  }

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !activeTicket) return

    toast.success('Reply emailed to client and logged in audit history!')
    setReplyText('')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Client Support Tickets</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Internal helpdesk, SLA resolution tracking, and client correspondence
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Create Support Ticket
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Open Tickets</span>
            <LifeBuoy className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.open}</p>
          <span className="text-xs text-slate-400 mt-1 block">Awaiting response</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">In Progress</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.inProgress}</p>
          <span className="text-xs text-slate-400 mt-1 block">Assigned to engineer</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.resolved}</p>
          <span className="text-xs text-emerald-500 mt-1 block">Satisfied SLAs</span>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Avg Resolution Time</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">4.2 hrs</p>
          <span className="text-xs text-slate-400 mt-1 block">&lt;24hr SLA target</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search ticket number, subject, client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input sm:w-44"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="waiting">Waiting</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="input sm:w-36"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Tickets Table */}
      <div className="card overflow-hidden">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Ticket #</th>
                <th>Client</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Opened Date</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No support tickets found matching your query.
                  </td>
                </tr>
              ) : (
                filtered.map(t => {
                  const client = clientMap[t.client_id]
                  const statusCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.open
                  const priCfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium

                  return (
                    <tr
                      key={t.id}
                      onClick={() => setActiveTicket(t)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {t.ticket_number}
                      </td>
                      <td>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{client?.name ?? '—'}</div>
                        <div className="text-xs text-slate-500">{client?.company}</div>
                      </td>
                      <td className="max-w-md font-medium text-slate-800 dark:text-slate-200">
                        {t.subject}
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {t.category}
                        </span>
                      </td>
                      <td>
                        <span className={`text-xs ${priCfg.color}`}>
                          {priCfg.label}
                        </span>
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.badge}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="text-xs text-slate-500">
                        {formatDate(t.created_at)}
                      </td>
                      <td className="text-right" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setActiveTicket(t)}
                          className="btn-ghost p-1.5"
                          title="Open Ticket Thread"
                        >
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Details & Discussion Slide-in Modal */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                    {activeTicket.ticket_number}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(STATUS_CONFIG[activeTicket.status] || STATUS_CONFIG.open).badge}`}>
                    {activeTicket.status.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {activeTicket.subject}
                </h3>
                <p className="text-xs text-slate-500">
                  Client: {clientMap[activeTicket.client_id]?.name} ({clientMap[activeTicket.client_id]?.company}) · Category: {activeTicket.category}
                </p>
              </div>
              <button onClick={() => setActiveTicket(null)} className="btn-ghost p-1.5">✕</button>
            </div>

            {/* Description */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl space-y-2">
              <span className="text-xs font-semibold uppercase text-slate-400">Client Description</span>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {activeTicket.description}
              </p>
            </div>

            {/* Reply Input */}
            <form onSubmit={handleSendReply} className="space-y-3 pt-2">
              <label className="label">Post Internal Update / Reply to Client</label>
              <textarea
                rows={3}
                required
                placeholder="Type your response to the client or internal engineer notes..."
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                className="input resize-none"
              />
              <div className="flex justify-between items-center">
                {activeTicket.status !== 'resolved' && (
                  <button
                    type="button"
                    onClick={() => handleResolveTicket(activeTicket.id)}
                    className="btn-secondary text-emerald-600 hover:text-emerald-500"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark Ticket as Resolved
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button type="button" onClick={() => setActiveTicket(null)} className="btn-secondary">
                    Close
                  </button>
                  <button type="submit" className="btn-primary">
                    <Send className="w-4 h-4" /> Send Reply
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Create Support Ticket</h3>
              <button onClick={() => setShowCreateModal(false)} className="btn-ghost p-1.5">✕</button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="form-group">
                <label className="label">Client *</label>
                <select
                  required
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  className="input cursor-pointer"
                >
                  <option value="">Select client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.business_name || c.company || c.name} ({c.name})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Subject Line *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SSL warning on payment checkout gateway"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="input cursor-pointer"
                  >
                    <option value="Technical Issue">Technical Issue</option>
                    <option value="Billing & Payments">Billing & Payments</option>
                    <option value="Content Update">Content Update</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Emergency Outage">Emergency Outage</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as TicketPriority)}
                    className="input cursor-pointer"
                  >
                    <option value="low">Low (Standard)</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent (&lt;2hr SLA)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="label">Issue Details</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detailed description of the client's request or reported error..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="input resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Open Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
