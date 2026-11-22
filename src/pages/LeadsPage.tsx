import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Edit2, Trash2, X, Archive,
  User, Building2, Mail, Phone, Calendar,
  Clock, ArrowRight, UserCheck, AlertTriangle, MessageSquare,
  RefreshCw, Check
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate } from '../lib/utils'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Lead, LeadStatus, LeadSource, Client, LeadNoteItem } from '../types/database'

// ─── Status Definitions ───────────────────────────────────────────────────────

export const LEAD_STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string; desc: string }> = {
  new_lead:              { label: 'New Lead',              badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',     dot: 'bg-blue-500',   desc: 'Fresh inbound enquiry' },
  new:                   { label: 'New Lead',              badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',     dot: 'bg-blue-500',   desc: 'Fresh inbound enquiry' },
  contacted:             { label: 'Contacted',             badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', dot: 'bg-yellow-500', desc: 'First contact made' },
  discussion:            { label: 'Discussion',            badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20', dot: 'bg-purple-500', desc: 'Scope discussion underway' },
  requirements_pending:  { label: 'Requirements Pending',  badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   dot: 'bg-amber-500',  desc: 'Awaiting requirement spec' },
  quotation_preparation: { label: 'Quotation Preparation', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', dot: 'bg-indigo-500', desc: 'Drafting quotation & pricing' },
  quotation_sent:        { label: 'Quotation Sent',        badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',         dot: 'bg-sky-500',    desc: 'Quote delivered to client' },
  won:                   { label: 'Won',                   badge: 'bg-green-500/10 text-green-400 border-green-500/20',   dot: 'bg-green-500',  desc: 'Converted to client' },
  lost:                  { label: 'Lost',                  badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',   dot: 'bg-slate-500',  desc: 'Deal closed / lost' },
  // legacy aliases
  qualified:             { label: 'Discussion',            badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20', dot: 'bg-purple-500', desc: 'Scope discussion underway' },
  proposal:              { label: 'Quotation Preparation', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', dot: 'bg-indigo-500', desc: 'Drafting quotation & pricing' },
  negotiation:           { label: 'Quotation Sent',        badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',         dot: 'bg-sky-500',    desc: 'Quote delivered to client' },
}

const SOURCES: { key: LeadSource; label: string }[] = [
  { key: 'website', label: 'Website Form' },
  { key: 'referral', label: 'Referral' },
  { key: 'social', label: 'Social Media' },
  { key: 'cold_outreach', label: 'Cold Outreach' },
  { key: 'google_ads', label: 'Google Ads' },
  { key: 'email', label: 'Email Campaign' },
  { key: 'other', label: 'Other' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [leads, setLeads] = useState<Lead[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  
  // Filters & State
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [showArchived, setShowArchived] = useState(false)
  const [sortBy, setSortBy] = useState<'created_desc' | 'created_asc' | 'budget_desc' | 'follow_up'>('created_desc')
  const [page, setPage] = useState(1)
  const pageSize = 8

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null)
  const [deleteConfirmLead, setDeleteConfirmLead] = useState<Lead | null>(null)
  const [archiveConfirmLead, setArchiveConfirmLead] = useState<Lead | null>(null)
  const [followUpModalLead, setFollowUpModalLead] = useState<Lead | null>(null)

  // Follow-up Form
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpTime, setFollowUpTime] = useState('')
  const [followUpNote, setFollowUpNote] = useState('')

  // New Note
  const [newNoteText, setNewNoteText] = useState('')

  // Conversion Form
  const [convertForm, setConvertForm] = useState({
    businessCategory: 'Corporate & Services',
    preferredComm: 'email' as const,
    address: '',
    city: '',
    gstin: '',
  })
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

  // ─── Fetch from Supabase ────────────────────────────────────────────────────
  const loadLeads = async () => {
    setLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setLeads(data as Lead[])
      }
    } catch (_) {}

    try {
      const { data: clientData } = await (supabase as any)
        .from('clients')
        .select('*')
      if (clientData) {
        setClients(clientData as Client[])
      }
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => {
    loadLeads()
  }, [])

  // ─── Filter & Sort ──────────────────────────────────────────────────────────
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      // Archive toggle
      if (!showArchived && l.is_archived) return false
      if (showArchived && !l.is_archived) return false

      // Status
      if (statusFilter !== 'all') {
        const normStatus = l.status === 'new' ? 'new_lead' : l.status
        if (normStatus !== statusFilter) return false
      }

      // Source
      if (sourceFilter !== 'all' && l.source !== sourceFilter) return false

      // Search
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = l.name.toLowerCase().includes(q)
        const matchEmail = l.email.toLowerCase().includes(q)
        const matchCompany = (l.company || '').toLowerCase().includes(q)
        const matchNotes = (l.notes || '').toLowerCase().includes(q)
        if (!matchName && !matchEmail && !matchCompany && !matchNotes) return false
      }

      return true
    }).sort((a, b) => {
      if (sortBy === 'created_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === 'created_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortBy === 'budget_desc') return (Number(b.budget) || 0) - (Number(a.budget) || 0)
      if (sortBy === 'follow_up') {
        if (!a.next_follow_up) return 1
        if (!b.next_follow_up) return -1
        return new Date(a.next_follow_up).getTime() - new Date(b.next_follow_up).getTime()
      }
      return 0
    })
  }, [leads, showArchived, statusFilter, sourceFilter, search, sortBy])

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize))
  const paginatedLeads = filteredLeads.slice((page - 1) * pageSize, page * pageSize)

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleSaveLead = async (formData: Partial<Lead>, isEdit: boolean) => {
    if (!formData.name?.trim() || !formData.email?.trim()) {
      toast.error('Lead name and email are required.')
      return
    }

    try {
      if (isEdit && editLead) {
        const updated: Lead = {
          ...editLead,
          ...formData,
          updated_at: new Date().toISOString(),
        }

        // Try DB update
        await (supabase as any)
          .from('leads')
          .update(formData)
          .eq('id', editLead.id)

        setLeads(prev => prev.map(l => l.id === editLead.id ? updated : l))
        if (selectedLead?.id === editLead.id) setSelectedLead(updated)
        toast.success('Lead updated successfully')
        setEditLead(null)
      } else {
        const newLead: Lead = {
          id: `lead-${Date.now()}`,
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone || null,
          company: formData.company || null,
          status: formData.status || 'new_lead',
          source: formData.source || 'website',
          budget: formData.budget ? Number(formData.budget) : null,
          notes: formData.notes || null,
          assigned_to: user?.id || null,
          next_follow_up: formData.next_follow_up || null,
          follow_up_time: formData.follow_up_time || null,
          follow_up_notes: formData.follow_up_notes || null,
          notes_history: formData.notes ? [{
            id: `note-${Date.now()}`,
            text: formData.notes,
            author: user?.email?.split('@')[0] || 'Admin',
            created_at: new Date().toISOString(),
          }] : [],
          is_archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        try {
          const { data } = await (supabase as any)
            .from('leads')
            .insert({
              name: newLead.name,
              email: newLead.email,
              phone: newLead.phone,
              company: newLead.company,
              status: newLead.status,
              source: newLead.source,
              budget: newLead.budget,
              notes: newLead.notes,
              next_follow_up: newLead.next_follow_up,
              follow_up_time: newLead.follow_up_time,
              follow_up_notes: newLead.follow_up_notes,
              notes_history: newLead.notes_history,
            })
            .select()
            .single()

          if (data) newLead.id = data.id
        } catch (_) {}

        setLeads(prev => [newLead, ...prev])
        toast.success('New lead created successfully!')
        setCreateModalOpen(false)
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving lead')
    }
  }

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    try {
      await (supabase as any)
        .from('leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId)

      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
      if (selectedLead?.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null)
      }
      toast.success(`Status changed to ${LEAD_STATUS_CONFIG[newStatus]?.label || newStatus}`)
    } catch (err: any) {
      toast.error('Failed to update status')
    }
  }

  const handleAddNote = async (leadId: string) => {
    if (!newNoteText.trim()) return
    const newNote: LeadNoteItem = {
      id: `note-${Date.now()}`,
      text: newNoteText.trim(),
      author: user?.email?.split('@')[0] || 'Admin',
      created_at: new Date().toISOString(),
    }

    const targetLead = leads.find(l => l.id === leadId)
    if (!targetLead) return

    const updatedHistory = [newNote, ...(targetLead.notes_history || [])]

    try {
      await (supabase as any)
        .from('leads')
        .update({ notes_history: updatedHistory, updated_at: new Date().toISOString() })
        .eq('id', leadId)

      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, notes_history: updatedHistory } : l))
      if (selectedLead?.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, notes_history: updatedHistory } : null)
      }
      setNewNoteText('')
      toast.success('Note added')
    } catch (_) {
      toast.error('Failed to save note')
    }
  }

  const handleScheduleFollowUp = async () => {
    if (!followUpModalLead || !followUpDate) {
      toast.error('Please pick a date for the follow-up.')
      return
    }

    const isoDateTime = followUpTime ? `${followUpDate}T${followUpTime}:00` : `${followUpDate}T09:00:00`

    try {
      await (supabase as any)
        .from('leads')
        .update({
          next_follow_up: isoDateTime,
          follow_up_time: followUpTime || null,
          follow_up_notes: followUpNote || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', followUpModalLead.id)

      setLeads(prev => prev.map(l => l.id === followUpModalLead.id ? {
        ...l,
        next_follow_up: isoDateTime,
        follow_up_time: followUpTime || null,
        follow_up_notes: followUpNote || null,
      } : l))

      if (selectedLead?.id === followUpModalLead.id) {
        setSelectedLead(prev => prev ? {
          ...prev,
          next_follow_up: isoDateTime,
          follow_up_time: followUpTime || null,
          follow_up_notes: followUpNote || null,
        } : null)
      }

      toast.success('Follow-up scheduled successfully!')
      setFollowUpModalLead(null)
      setFollowUpDate('')
      setFollowUpTime('')
      setFollowUpNote('')
    } catch (_) {
      toast.error('Failed to schedule follow-up')
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    try {
      await (supabase as any)
        .from('leads')
        .delete()
        .eq('id', leadId)

      setLeads(prev => prev.filter(l => l.id !== leadId))
      if (selectedLead?.id === leadId) setSelectedLead(null)
      toast.success('Lead permanently deleted')
      setDeleteConfirmLead(null)
    } catch (_) {
      toast.error('Could not delete lead')
    }
  }

  const handleArchiveLead = async (lead: Lead, archive: boolean) => {
    try {
      await (supabase as any)
        .from('leads')
        .update({
          is_archived: archive,
          archived_at: archive ? new Date().toISOString() : null,
          archived_reason: archive ? 'Archived by administrator' : null,
        })
        .eq('id', lead.id)

      setLeads(prev => prev.map(l => l.id === lead.id ? {
        ...l,
        is_archived: archive,
        archived_at: archive ? new Date().toISOString() : null,
      } : l))

      toast.success(archive ? 'Lead archived' : 'Lead restored from archive')
      setArchiveConfirmLead(null)
      if (selectedLead?.id === lead.id) {
        setSelectedLead(prev => prev ? { ...prev, is_archived: archive } : null)
      }
    } catch (_) {
      toast.error('Failed to update archive status')
    }
  }

  // ─── Convert Lead to Client ────────────────────────────────────────────────
  const checkDuplicates = (email: string, phone: string | null) => {
    const existing = clients.find(c =>
      c.email.toLowerCase() === email.toLowerCase() ||
      (phone && c.phone && c.phone.replace(/[\s-]/g, '') === phone.replace(/[\s-]/g, ''))
    )
    return existing
  }

  const openConvertModal = (lead: Lead) => {
    const duplicate = checkDuplicates(lead.email, lead.phone)
    if (duplicate) {
      setDuplicateWarning(`Warning: An existing client (${duplicate.client_code} - ${duplicate.name}) already matches this email/phone.`)
    } else {
      setDuplicateWarning(null)
    }
    setConvertingLead(lead)
  }

  const handleExecuteConvert = async () => {
    if (!convertingLead) return

    // Auto-generate client code: CS-CLIENT-XXXX
    const nextNum = clients.length + 1
    const generatedClientCode = `CS-CLIENT-${String(nextNum).padStart(4, '0')}`

    const newClient: Client = {
      id: `client-${Date.now()}`,
      client_code: generatedClientCode,
      lead_id: convertingLead.id,
      name: convertingLead.name,
      business_name: convertingLead.company || convertingLead.name,
      company: convertingLead.company || convertingLead.name,
      business_category: convertForm.businessCategory,
      email: convertingLead.email,
      phone: convertingLead.phone,
      address: convertForm.address || null,
      city: convertForm.city,
      country: 'South Africa',
      gstin: convertForm.gstin || null,
      preferred_comm: convertForm.preferredComm,
      status: 'active',
      avatar_url: null,
      notes: `Converted from Lead on ${new Date().toLocaleDateString()}. Initial notes: ${convertingLead.notes || 'None'}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      // 1. Insert Client to Supabase
      try {
        const { data: insertedClient } = await (supabase as any)
          .from('clients')
          .insert({
            client_code: newClient.client_code,
            lead_id: newClient.lead_id,
            name: newClient.name,
            business_name: newClient.business_name,
            company: newClient.company,
            business_category: newClient.business_category,
            email: newClient.email,
            phone: newClient.phone,
            address: newClient.address,
            city: newClient.city,
            gstin: newClient.gstin,
            preferred_comm: newClient.preferred_comm,
            status: 'active',
            notes: newClient.notes,
          })
          .select()
          .single()

        if (insertedClient) {
          newClient.id = insertedClient.id
          if (insertedClient.client_code) newClient.client_code = insertedClient.client_code
        }
      } catch (_) {}

      // 2. Update Lead: status = 'won', converted_client_id = newClient.id
      await (supabase as any)
        .from('leads')
        .update({
          status: 'won',
          converted_client_id: newClient.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', convertingLead.id)

      // 3. Update local state
      setClients(prev => [newClient, ...prev])
      setLeads(prev => prev.map(l => l.id === convertingLead.id ? {
        ...l,
        status: 'won',
        converted_client_id: newClient.id,
      } : l))

      toast.success(`Lead successfully converted to Client ${newClient.client_code}!`)
      setConvertingLead(null)
      setSelectedLead(null)

      // Offer to go to client or requirement
      navigate('/admin/clients')
    } catch (err: any) {
      toast.error('Conversion failed: ' + err.message)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Lead Acquisition & Tracking</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage prospective client enquiries, log interaction notes, schedule follow-ups, and convert approved leads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              showArchived
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-white dark:bg-[#1E1E1E] text-slate-600 dark:text-slate-400 border-[#E5E5E5] dark:border-[#383838]'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            {showArchived ? 'Viewing Archived' : 'Archived Leads'}
          </button>

          <button
            onClick={loadLeads}
            className="p-1.5 rounded-lg border border-[#E5E5E5] dark:border-[#383838] bg-white dark:bg-[#1E1E1E] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            title="Refresh leads"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3 py-1.5 bg-[#0D99FF] hover:bg-[#0D99FF]/90 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New Lead
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#2D2D2D] rounded-xl">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-medium">Active Enquiries</div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {leads.filter(l => !l.is_archived && l.status !== 'lost' && l.status !== 'won').length}
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#2D2D2D] rounded-xl">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-medium">Pending Follow-Ups</div>
          <div className="text-xl font-bold text-amber-500 mt-1">
            {leads.filter(l => l.next_follow_up && !l.is_archived).length}
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#2D2D2D] rounded-xl">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-medium">Won / Converted</div>
          <div className="text-xl font-bold text-green-500 mt-1">
            {leads.filter(l => l.status === 'won').length}
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#2D2D2D] rounded-xl">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-medium">Pipeline Value</div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrency(leads.filter(l => !l.is_archived && l.status !== 'lost').reduce((sum, l) => sum + (Number(l.budget) || 0), 0))}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#2D2D2D] rounded-xl space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by lead name, company, email, notes..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-9 pr-3 py-1.5 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0D99FF]"
            />
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-2">
            <select
              value={sourceFilter}
              onChange={e => { setSourceFilter(e.target.value); setPage(1) }}
              className="px-2.5 py-1.5 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">All Enquiry Sources</option>
              {SOURCES.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="created_desc">Newest First</option>
              <option value="created_asc">Oldest First</option>
              <option value="budget_desc">Highest Budget</option>
              <option value="follow_up">Next Follow-Up</option>
            </select>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-t border-[#E5E5E5] dark:border-[#2D2D2D] pt-2">
          <button
            onClick={() => { setStatusFilter('all'); setPage(1) }}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#282828]'
            }`}
          >
            All Leads ({leads.filter(l => !l.is_archived).length})
          </button>

          {['new_lead', 'contacted', 'discussion', 'requirements_pending', 'quotation_preparation', 'quotation_sent', 'won', 'lost'].map(st => {
            const count = leads.filter(l => !l.is_archived && (l.status === st || (st === 'new_lead' && l.status === 'new'))).length
            return (
              <button
                key={st}
                onClick={() => { setStatusFilter(st); setPage(1) }}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#282828]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${LEAD_STATUS_CONFIG[st]?.dot || 'bg-slate-400'}`} />
                {LEAD_STATUS_CONFIG[st]?.label || st} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#2D2D2D] rounded-xl overflow-hidden shadow-sm">
        {paginatedLeads.length === 0 ? (
          <div className="py-16 text-center">
            <User className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">No leads found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {showArchived ? 'No archived leads found.' : 'No active enquiries matching your current filters.'}
            </p>
            {!showArchived && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="mt-4 px-3 py-1.5 bg-[#0D99FF] text-white text-xs font-medium rounded-lg inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Create Lead
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E5E5] dark:border-[#2D2D2D] bg-[#F9FAFB] dark:bg-[#252525] text-slate-500 dark:text-slate-400 font-medium">
                  <th className="py-2.5 px-4">Lead / Company</th>
                  <th className="py-2.5 px-4">Contact Details</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Enquiry Source</th>
                  <th className="py-2.5 px-4">Budget</th>
                  <th className="py-2.5 px-4">Follow-up</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#2D2D2D]">
                {paginatedLeads.map(lead => {
                  const cfg = LEAD_STATUS_CONFIG[lead.status] || LEAD_STATUS_CONFIG.new_lead
                  const hasFollowUp = !!lead.next_follow_up
                  const isOverdue = hasFollowUp && new Date(lead.next_follow_up!).getTime() < Date.now()

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-[#252525]/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedLead(lead)}
                    >
                      {/* Name & Company */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          {lead.name}
                          {lead.converted_client_id && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-500/10 text-green-500 border border-green-500/20">
                              Client
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {lead.company || 'Individual / Unspecified'}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4">
                        <div className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {lead.email}
                        </div>
                        {lead.phone && (
                          <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {lead.phone}
                          </div>
                        )}
                      </td>

                      {/* Status Selector */}
                      <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                        <select
                          value={lead.status === 'new' ? 'new_lead' : lead.status}
                          onChange={e => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${cfg.badge}`}
                        >
                          <option value="new_lead">New Lead</option>
                          <option value="contacted">Contacted</option>
                          <option value="discussion">Discussion</option>
                          <option value="requirements_pending">Requirements Pending</option>
                          <option value="quotation_preparation">Quotation Preparation</option>
                          <option value="quotation_sent">Quotation Sent</option>
                          <option value="won">Won (Ready to Convert)</option>
                          <option value="lost">Lost</option>
                        </select>
                      </td>

                      {/* Source */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-[#282828] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#383838] capitalize">
                          {lead.source?.replace('_', ' ') || 'Website'}
                        </span>
                      </td>

                      {/* Budget */}
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        {lead.budget ? formatCurrency(lead.budget) : <span className="text-slate-400">—</span>}
                      </td>

                      {/* Follow-up */}
                      <td className="py-3 px-4">
                        {hasFollowUp ? (
                          <div className={`text-[11px] font-medium flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}`}>
                            <Calendar className="w-3 h-3" />
                            {formatDate(lead.next_follow_up!)}
                            {lead.follow_up_time && <span>• {lead.follow_up_time}</span>}
                          </div>
                        ) : (
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setFollowUpModalLead(lead)
                            }}
                            className="text-[11px] text-blue-500 hover:underline flex items-center gap-1"
                          >
                            <Clock className="w-3 h-3" /> Schedule
                          </button>
                        )}
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Convert button if not already converted */}
                          {!lead.converted_client_id && (
                            <button
                              onClick={() => openConvertModal(lead)}
                              title="Convert to Client"
                              className="px-2 py-1 rounded bg-green-500/10 text-green-500 hover:bg-green-500/20 text-[11px] font-semibold flex items-center gap-1"
                            >
                              <UserCheck className="w-3 h-3" />
                              Convert
                            </button>
                          )}

                          <button
                            onClick={() => setFollowUpModalLead(lead)}
                            title="Schedule Follow-up"
                            className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setEditLead(lead)}
                            title="Edit Lead"
                            className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setArchiveConfirmLead(lead)}
                            title={lead.is_archived ? 'Restore Lead' : 'Archive Lead'}
                            className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmLead(lead)}
                            title="Delete Lead"
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="py-2.5 px-4 border-t border-[#E5E5E5] dark:border-[#2D2D2D] bg-[#F9FAFB] dark:bg-[#252525] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredLeads.length)} of {filteredLeads.length} leads
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border border-[#E5E5E5] dark:border-[#383838] bg-white dark:bg-[#1E1E1E] disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-semibold px-2">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded border border-[#E5E5E5] dark:border-[#383838] bg-white dark:bg-[#1E1E1E] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ─── LEAD DETAIL DRAWER ──────────────────────────────────────────────── */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs" onClick={() => setSelectedLead(null)}>
          <div
            className="w-full max-w-lg h-full bg-white dark:bg-[#1E1E1E] border-l border-[#E5E5E5] dark:border-[#2D2D2D] shadow-2xl p-6 overflow-y-auto space-y-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-[#E5E5E5] dark:border-[#2D2D2D] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedLead.name}</h2>
                  {selectedLead.converted_client_id && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-green-500/10 text-green-500 border border-green-500/20">
                      Converted
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedLead.company || 'Individual Client'} • Enquired on {formatDate(selectedLead.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions in Drawer */}
            <div className="flex items-center gap-2">
              {!selectedLead.converted_client_id ? (
                <button
                  onClick={() => openConvertModal(selectedLead)}
                  className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <UserCheck className="w-4 h-4" /> Convert to Client
                </button>
              ) : (
                <button
                  onClick={() => navigate('/admin/clients')}
                  className="flex-1 py-2 px-3 bg-[#0D99FF] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  View Client Profile <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => setFollowUpModalLead(selectedLead)}
                className="py-2 px-3 border border-[#E5E5E5] dark:border-[#383838] bg-[#F9FAFB] dark:bg-[#252525] text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-500" /> Follow-up
              </button>
            </div>

            {/* Key Information */}
            <div className="p-4 bg-[#F9FAFB] dark:bg-[#252525] rounded-xl border border-[#E5E5E5] dark:border-[#383838] space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{selectedLead.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{selectedLead.phone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Budget:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {selectedLead.budget ? formatCurrency(selectedLead.budget) : 'Unspecified'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Source:</span>
                <span className="font-medium capitalize text-slate-900 dark:text-slate-100">
                  {selectedLead.source?.replace('_', ' ') || 'Website'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status:</span>
                <span className={`px-2 py-0.5 rounded-full font-semibold ${LEAD_STATUS_CONFIG[selectedLead.status]?.badge}`}>
                  {LEAD_STATUS_CONFIG[selectedLead.status]?.label}
                </span>
              </div>
            </div>

            {/* Follow-up Section */}
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Next Follow-Up Schedule
                </span>
                <button
                  onClick={() => setFollowUpModalLead(selectedLead)}
                  className="text-[11px] underline hover:text-amber-400"
                >
                  Edit
                </button>
              </div>
              {selectedLead.next_follow_up ? (
                <div className="text-xs text-slate-700 dark:text-slate-300">
                  <p className="font-medium">
                    📅 {formatDate(selectedLead.next_follow_up)} {selectedLead.follow_up_time && `at ${selectedLead.follow_up_time}`}
                  </p>
                  {selectedLead.follow_up_notes && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                      "{selectedLead.follow_up_notes}"
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">No follow-up currently scheduled.</p>
              )}
            </div>

            {/* Interaction Notes & History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Interaction Notes & History
                </h3>
                <span className="text-[11px] text-slate-400">
                  {(selectedLead.notes_history || []).length} entries
                </span>
              </div>

              {/* Add Note Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Log meeting, call note, or follow-up note..."
                  value={newNoteText}
                  onChange={e => setNewNoteText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddNote(selectedLead.id) }}
                  className="flex-1 px-3 py-1.5 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                />
                <button
                  onClick={() => handleAddNote(selectedLead.id)}
                  disabled={!newNoteText.trim()}
                  className="px-3 py-1.5 bg-[#0D99FF] text-white rounded-lg text-xs font-semibold disabled:opacity-40"
                >
                  Add
                </button>
              </div>

              {/* Initial Lead Description if any */}
              {selectedLead.notes && (
                <div className="p-3 bg-slate-50 dark:bg-[#252525] rounded-lg border border-slate-200 dark:border-[#383838] text-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Enquiry Brief</div>
                  <p className="text-slate-700 dark:text-slate-300">{selectedLead.notes}</p>
                </div>
              )}

              {/* Note Timeline Items */}
              <div className="space-y-2 mt-2">
                {(selectedLead.notes_history || []).map(note => (
                  <div key={note.id} className="p-3 bg-white dark:bg-[#222222] rounded-lg border border-[#E5E5E5] dark:border-[#333333] text-xs">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{note.author}</span>
                      <span>{formatDate(note.created_at)}</span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200">{note.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── CREATE / EDIT LEAD MODAL ────────────────────────────────────────── */}
      {(createModalOpen || editLead) && (
        <LeadFormModal
          open={createModalOpen || !!editLead}
          initial={editLead || undefined}
          onClose={() => { setCreateModalOpen(false); setEditLead(null) }}
          onSave={data => handleSaveLead(data, !!editLead)}
        />
      )}

      {/* ─── SCHEDULE FOLLOW-UP MODAL ────────────────────────────────────────── */}
      {followUpModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1E1E1E] rounded-xl border border-[#E5E5E5] dark:border-[#383838] p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#2D2D2D] pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                Schedule Follow-up with {followUpModalLead.name}
              </h3>
              <button onClick={() => setFollowUpModalLead(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Follow-up Date *</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={e => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Follow-up Time</label>
                <input
                  type="time"
                  value={followUpTime}
                  onChange={e => setFollowUpTime(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Agenda / Meeting Notes</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Call to discuss quotation revision, confirm delivery timeline..."
                  value={followUpNote}
                  onChange={e => setFollowUpNote(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E5E5] dark:border-[#2D2D2D]">
              <button
                onClick={() => setFollowUpModalLead(null)}
                className="px-3 py-1.5 rounded-lg border border-[#E5E5E5] dark:border-[#383838] text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleFollowUp}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-sm"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONVERT TO CLIENT MODAL ─────────────────────────────────────────── */}
      {convertingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#1E1E1E] rounded-xl border border-[#E5E5E5] dark:border-[#383838] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#2D2D2D] pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-green-500" />
                  Convert Lead to Client Account
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Generates unique Client ID and moves lead into active client lifecycle.
                </p>
              </div>
              <button onClick={() => setConvertingLead(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Duplicate Warning Alert if detected */}
            {duplicateWarning && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-500 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Potential Duplicate Detected</div>
                  <div>{duplicateWarning}</div>
                </div>
              </div>
            )}

            <div className="p-3 bg-[#F9FAFB] dark:bg-[#252525] rounded-lg border border-[#E5E5E5] dark:border-[#383838] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Generated Client ID:</span>
                <span className="font-mono font-bold text-[#0D99FF]">
                  CS-CLIENT-{String(clients.length + 1).padStart(4, '0')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Client Name:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{convertingLead.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Business / Company:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{convertingLead.company || convertingLead.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="text-slate-700 dark:text-slate-300">{convertingLead.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="text-slate-700 dark:text-slate-300">{convertingLead.phone || '—'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Business Category</label>
                <select
                  value={convertForm.businessCategory}
                  onChange={e => setConvertForm({ ...convertForm, businessCategory: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="Corporate & Services">Corporate & Services</option>
                  <option value="E-Commerce & Retail">E-Commerce & Retail</option>
                  <option value="Healthcare & Wellness">Healthcare & Wellness</option>
                  <option value="Real Estate & Property">Real Estate & Property</option>
                  <option value="Technology & SaaS">Technology & SaaS</option>
                  <option value="Finance & Legal">Finance & Legal</option>
                  <option value="Hospitality & Dining">Hospitality & Dining</option>
                  <option value="Education & Non-Profit">Education & Non-Profit</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Preferred Communication</label>
                <select
                  value={convertForm.preferredComm}
                  onChange={e => setConvertForm({ ...convertForm, preferredComm: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="phone">Phone Call</option>
                  <option value="slack">Slack</option>
                  <option value="teams">Microsoft Teams</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">City</label>
                <input
                  type="text"
                  value={convertForm.city}
                  onChange={e => setConvertForm({ ...convertForm, city: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">GSTIN / Tax ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 27AADCB2234P1Z8"
                  value={convertForm.gstin}
                  onChange={e => setConvertForm({ ...convertForm, gstin: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100 uppercase"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E5E5] dark:border-[#2D2D2D]">
              <button
                onClick={() => setConvertingLead(null)}
                className="px-3 py-1.5 rounded-lg border border-[#E5E5E5] dark:border-[#383838] text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteConvert}
                className="px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Confirm & Convert Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ARCHIVE CONFIRMATION MODAL ──────────────────────────────────────── */}
      {archiveConfirmLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#1E1E1E] rounded-xl border border-[#E5E5E5] dark:border-[#383838] p-5 space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Archive className="w-4 h-4 text-amber-500" />
              {archiveConfirmLead.is_archived ? 'Restore Lead from Archive?' : 'Archive Lead?'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {archiveConfirmLead.is_archived
                ? `Restore "${archiveConfirmLead.name}" back into active leads pipeline?`
                : `Are you sure you want to archive "${archiveConfirmLead.name}"? It will be hidden from the active pipeline but preserved.`}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setArchiveConfirmLead(null)}
                className="px-3 py-1.5 rounded-lg border border-[#E5E5E5] dark:border-[#383838] text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleArchiveLead(archiveConfirmLead, !archiveConfirmLead.is_archived)}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
              >
                {archiveConfirmLead.is_archived ? 'Restore' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRMATION MODAL ───────────────────────────────────────── */}
      {deleteConfirmLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#1E1E1E] rounded-xl border border-[#E5E5E5] dark:border-[#383838] p-5 space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-red-500 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Permanently Delete Lead?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Are you sure you want to delete lead <strong className="text-slate-900 dark:text-slate-100">{deleteConfirmLead.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmLead(null)}
                className="px-3 py-1.5 rounded-lg border border-[#E5E5E5] dark:border-[#383838] text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteLead(deleteConfirmLead.id)}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── LEAD FORM MODAL (CREATE / EDIT) ──────────────────────────────────────────

function LeadFormModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean
  initial?: Lead
  onClose: () => void
  onSave: (data: Partial<Lead>) => void
}) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    company: initial?.company || '',
    status: (initial?.status || 'new_lead') as LeadStatus,
    source: (initial?.source || 'website') as LeadSource,
    budget: initial?.budget ? String(initial.budget) : '',
    notes: initial?.notes || '',
    next_follow_up: initial?.next_follow_up ? initial.next_follow_up.split('T')[0] : '',
    follow_up_time: initial?.follow_up_time || '',
  })

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...form,
      budget: form.budget ? Number(form.budget) : null,
      phone: form.phone || null,
      company: form.company || null,
      next_follow_up: form.next_follow_up ? `${form.next_follow_up}T${form.follow_up_time || '09:00'}:00` : null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1E1E1E] rounded-xl border border-[#E5E5E5] dark:border-[#383838] p-6 space-y-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#2D2D2D] pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {initial ? 'Edit Lead Information' : 'Create Prospective Lead'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Lead Contact Name *</label>
              <input
                required
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Sarah Jenkins"
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Email Address *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="client@company.com"
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Phone Number</label>
              <input
                type="text"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+27 82 123 4567"
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Company / Business Name</label>
              <input
                type="text"
                value={form.company}
                onChange={e => setForm({ ...form, company: e.target.value })}
                placeholder="TechVision Ltd"
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value as any })}
                className="w-full px-2.5 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="new_lead">New Lead</option>
                <option value="contacted">Contacted</option>
                <option value="discussion">Discussion</option>
                <option value="requirements_pending">Requirements Pending</option>
                <option value="quotation_preparation">Quotation Preparation</option>
                <option value="quotation_sent">Quotation Sent</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Enquiry Source</label>
              <select
                value={form.source}
                onChange={e => setForm({ ...form, source: e.target.value as any })}
                className="w-full px-2.5 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              >
                {SOURCES.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Budget (₹)</label>
              <input
                type="number"
                value={form.budget}
                onChange={e => setForm({ ...form, budget: e.target.value })}
                placeholder="25000"
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Next Follow-Up Date</label>
              <input
                type="date"
                value={form.next_follow_up}
                onChange={e => setForm({ ...form, next_follow_up: e.target.value })}
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Follow-Up Time</label>
              <input
                type="time"
                value={form.follow_up_time}
                onChange={e => setForm({ ...form, follow_up_time: e.target.value })}
                className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Enquiry Brief / Project Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. Client needs high-converting corporate website with online booking and blog..."
              className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E5E5] dark:border-[#2D2D2D]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[#E5E5E5] dark:border-[#383838] text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-[#0D99FF] hover:bg-[#0D99FF]/90 text-white text-xs font-semibold shadow-sm"
            >
              {initial ? 'Save Changes' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
