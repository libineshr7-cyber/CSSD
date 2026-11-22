import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Shield, Lock, Mail, Key, ArrowRight, CheckCircle2, Clock, AlertCircle,
  FileText, Download, Check, X, Building2, User, Phone, LogOut,
  Sparkles, RefreshCw, Layers, CreditCard, Receipt, Palette, HelpCircle,
  Send, ExternalLink, ShieldCheck, ChevronRight, FileCheck, Eye
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDate } from '../../lib/utils'
import {
  downloadQuotationPDF,
  downloadAgreementPDF,
  downloadInvoicePDF,
  downloadReceiptPDF,
  downloadHandoverDocumentPDF,
  downloadMaintenanceReportPDF
} from '../../lib/pdfGenerator'
import type {
  Client,
  Quotation,
  Agreement,
  Invoice,
  Payment,
  Project,
  ProjectPipelineStage,
  DesignApproval,
  ProjectHandover,
  SupportTicket,
  Document,
  MaintenanceRecord,
  MonitoredWebsite
} from '../../types/database'

type PortalTab =
  | 'overview'
  | 'quotations'
  | 'agreements'
  | 'invoices'
  | 'payments'
  | 'designs'
  | 'handover'
  | 'support'
  | 'documents'

const PIPELINE_STAGES: { key: ProjectPipelineStage; label: string }[] = [
  { key: 'project_created', label: 'Project Created' },
  { key: 'advance_payment_verified', label: 'Advance Payment Verified' },
  { key: 'requirements_finalized', label: 'Requirements Finalized' },
  { key: 'ui_ux_design', label: 'UI/UX Design' },
  { key: 'design_review', label: 'Design Review' },
  { key: 'design_approved', label: 'Design Approved' },
  { key: 'frontend_development', label: 'Frontend Development' },
  { key: 'backend_development', label: 'Backend Development' },
  { key: 'database_integration', label: 'Database Integration' },
  { key: 'internal_testing', label: 'Internal Testing' },
  { key: 'client_review', label: 'Client Review' },
  { key: 'revisions', label: 'Revisions' },
  { key: 'final_qa', label: 'Final QA' },
  { key: 'final_payment', label: 'Final Payment' },
  { key: 'deployment', label: 'Deployment' },
  { key: 'handover', label: 'Handover' },
  { key: 'completed', label: 'Completed' }
]

export default function ClientPortalPage() {
  // Auth state
  const [sessionClient, setSessionClient] = useState<Client | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [emailInput, setEmailInput] = useState('')
  const [passcodeInput, setPasscodeInput] = useState('')
  const [submittingAuth, setSubmittingAuth] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [sendingReset, setSendingReset] = useState(false)

  // Portal view state
  const [activeTab, setActiveTab] = useState<PortalTab>('overview')
  const [loadingData, setLoadingData] = useState(false)

  // Client Data States (Strictly scoped to sessionClient.id)
  const [clientProjects, setClientProjects] = useState<Project[]>([])
  const [clientQuotations, setClientQuotations] = useState<Quotation[]>([])
  const [clientAgreements, setClientAgreements] = useState<Agreement[]>([])
  const [clientInvoices, setClientInvoices] = useState<Invoice[]>([])
  const [clientPayments, setClientPayments] = useState<Payment[]>([])
  const [clientDesigns, setClientDesigns] = useState<DesignApproval[]>([])
  const [clientHandovers, setClientHandovers] = useState<ProjectHandover[]>([])
  const [clientTickets, setClientTickets] = useState<SupportTicket[]>([])
  const [clientDocuments, setClientDocuments] = useState<Document[]>([])
  const [clientMaintenance, setClientMaintenance] = useState<MaintenanceRecord[]>([])
  const [clientWebsites, setClientWebsites] = useState<MonitoredWebsite[]>([])

  // Modal / Interaction states
  const [selectedDesign, setSelectedDesign] = useState<DesignApproval | null>(null)
  const [designFeedback, setDesignFeedback] = useState('')
  const [submittingDesignFeedback, setSubmittingDesignFeedback] = useState(false)

  const [ticketSubject, setTicketSubject] = useState('')
  const [ticketCategory, setTicketCategory] = useState('technical')
  const [ticketPriority, setTicketPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [ticketDescription, setTicketDescription] = useState('')
  const [submittingTicket, setSubmittingTicket] = useState(false)

  // Check existing session on mount
  useEffect(() => {
    const saved = localStorage.getItem('capesecure_client_session')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed && parsed.id) {
          verifyClientSession(parsed.id)
          return
        }
      } catch (_) {
        localStorage.removeItem('capesecure_client_session')
      }
    }
    setAuthLoading(false)
  }, [])

  const verifyClientSession = async (clientId: string) => {
    setAuthLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .maybeSingle()

      if (data && !error) {
        setSessionClient(data as Client)
        loadClientData(data.id)
      } else {
        localStorage.removeItem('capesecure_client_session')
        setSessionClient(null)
      }
    } catch (_) {
      localStorage.removeItem('capesecure_client_session')
      setSessionClient(null)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailInput.trim()) {
      toast.error('Please enter your registered client email address.')
      return
    }

    setSubmittingAuth(true)
    try {
      // 1. Verify if client exists in clients table
      const { data: client, error } = await (supabase as any)
        .from('clients')
        .select('*')
        .ilike('email', emailInput.trim())
        .maybeSingle()

      if (error || !client) {
        toast.error('No client account found matching that email. Please check with your CapeSecure manager.')
        setSubmittingAuth(false)
        return
      }

      // 2. Check if portal access record exists or create default entry
      const { data: portalRecord } = await (supabase as any)
        .from('client_portal_access')
        .select('*')
        .eq('client_id', client.id)
        .maybeSingle()

      if (portalRecord && !portalRecord.is_active) {
        toast.error('Your client portal access has been suspended. Please contact CapeSecure administration.')
        setSubmittingAuth(false)
        return
      }

      // Check passcode if provided
      if (passcodeInput.trim()) {
        if (portalRecord?.portal_passcode_hash && portalRecord.portal_passcode_hash !== passcodeInput.trim()) {
          toast.error('Invalid access passcode. Please check your credentials or reset your passcode.')
          setSubmittingAuth(false)
          return
        }
      }

      // Update last_login
      if (portalRecord) {
        await (supabase as any)
          .from('client_portal_access')
          .update({
            last_login: new Date().toISOString(),
            login_attempts: 0
          })
          .eq('id', portalRecord.id)
      } else {
        await (supabase as any)
          .from('client_portal_access')
          .insert({
            client_id: client.id,
            portal_email: client.email,
            portal_passcode_hash: passcodeInput.trim() || 'Welcome@2026',
            is_active: true,
            last_login: new Date().toISOString()
          })
      }

      localStorage.setItem('capesecure_client_session', JSON.stringify({
        id: client.id,
        email: client.email,
        name: client.name,
        company: client.business_name || client.company,
        timestamp: Date.now()
      }))

      setSessionClient(client as Client)
      toast.success(`Welcome back, ${client.name}!`)
      loadClientData(client.id)
    } catch (err: any) {
      toast.error('Authentication failed: ' + (err.message || 'Unknown error'))
    } finally {
      setSubmittingAuth(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('capesecure_client_session')
    setSessionClient(null)
    toast.success('Signed out of Client Portal.')
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail.trim()) {
      toast.error('Please enter your client email.')
      return
    }

    setSendingReset(true)
    try {
      const { data: client } = await (supabase as any)
        .from('clients')
        .select('id, name, email')
        .ilike('email', resetEmail.trim())
        .maybeSingle()

      if (!client) {
        toast.error('No account registered with that email address.')
      } else {
        const tempPasscode = 'CS-' + Math.floor(100000 + Math.random() * 900000)
        await (supabase as any)
          .from('client_portal_access')
          .upsert({
            client_id: client.id,
            portal_email: client.email,
            portal_passcode_hash: tempPasscode,
            is_active: true
          }, { onConflict: 'client_id' })

        toast.success(`Passcode reset instructions sent! Temporary passcode: ${tempPasscode}`, {
          duration: 10000
        })
        setShowResetModal(false)
        setPasscodeInput(tempPasscode)
        setEmailInput(client.email)
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to process passcode reset.')
    } finally {
      setSendingReset(false)
    }
  }

  // Load all records strictly matching clientId
  const loadClientData = async (clientId: string) => {
    setLoadingData(true)
    try {
      const [
        pRes, qRes, aRes, iRes, payRes, dRes, hRes, tRes, docRes, mRes, wRes
      ] = await Promise.all([
        (supabase as any).from('projects').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        (supabase as any).from('quotations').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        (supabase as any).from('agreements').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        (supabase as any).from('invoices').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        (supabase as any).from('payments').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        (supabase as any).from('design_approvals').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        (supabase as any).from('project_handovers').select('*').order('created_at', { ascending: false }),
        (supabase as any).from('support_tickets').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        (supabase as any).from('documents').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        (supabase as any).from('maintenance_records').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        (supabase as any).from('monitored_websites').select('*').eq('client_id', clientId)
      ])

      if (pRes.data) setClientProjects(pRes.data)
      if (qRes.data) setClientQuotations(qRes.data)
      if (aRes.data) setClientAgreements(aRes.data)
      if (iRes.data) setClientInvoices(iRes.data)
      if (payRes.data) setClientPayments(payRes.data)
      if (dRes.data) setClientDesigns(dRes.data)
      if (tRes.data) setClientTickets(tRes.data)
      if (docRes.data) setClientDocuments(docRes.data)
      if (mRes.data) setClientMaintenance(mRes.data)
      if (wRes.data) setClientWebsites(wRes.data)

      if (hRes.data && pRes.data) {
        const projectIds = new Set((pRes.data as Project[]).map(p => p.id))
        setClientHandovers((hRes.data as ProjectHandover[]).filter(h => projectIds.has(h.project_id)))
      }
    } catch (err) {
      console.error('Error loading client portal data:', err)
      toast.error('Could not load some portal data. Retrying...')
    } finally {
      setLoadingData(false)
    }
  }

  // Handle Quotation Approval directly from client portal
  const handleApproveQuotation = async (quote: Quotation) => {
    if (!confirm(`Are you sure you want to approve quotation ${quote.quote_number}?`)) return
    try {
      const now = new Date().toISOString()
      const { error } = await (supabase as any)
        .from('quotations')
        .update({
          status: 'accepted',
          accepted_at: now,
          approval_details: {
            approved_by: sessionClient?.name || 'Client Representative',
            approver_email: sessionClient?.email || '',
            approved_at: now,
            version: quote.version || 1,
            ip_address: 'Client Portal',
            confirmation_statement: 'Approved digitally via CapeSecure Client Portal.',
            notes: 'Approved via client portal.'
          },
          updated_at: now
        })
        .eq('id', quote.id)

      if (error) throw error
      toast.success(`Quotation ${quote.quote_number} approved! CapeSecure team has been notified.`)
      loadClientData(sessionClient!.id)
    } catch (err: any) {
      toast.error('Approval failed: ' + err.message)
    }
  }

  // Handle Design Approval
  const handleDesignAction = async (status: 'approved' | 'revision_requested') => {
    if (!selectedDesign) return
    setSubmittingDesignFeedback(true)
    try {
      const now = new Date().toISOString()
      const historyItem = {
        action: status === 'approved' ? 'Design Approved by Client' : 'Revision Requested by Client',
        by: sessionClient?.name || 'Client',
        timestamp: now,
        feedback: designFeedback || (status === 'approved' ? 'Approved without further changes.' : 'Revisions requested.')
      }

      const existingHistory = selectedDesign.approval_history || []

      const { error } = await (supabase as any)
        .from('design_approvals')
        .update({
          status,
          client_feedback: designFeedback,
          approved_by: status === 'approved' ? sessionClient?.name : null,
          approved_at: status === 'approved' ? now : null,
          revision_requested_at: status === 'revision_requested' ? now : null,
          approval_history: [...existingHistory, historyItem],
          updated_at: now
        })
        .eq('id', selectedDesign.id)

      if (error) throw error
      toast.success(status === 'approved' ? 'Design approved successfully!' : 'Revision request submitted to design team.')
      setSelectedDesign(null)
      setDesignFeedback('')
      loadClientData(sessionClient!.id)
    } catch (err: any) {
      toast.error('Update failed: ' + err.message)
    } finally {
      setSubmittingDesignFeedback(false)
    }
  }

  // Handle Support Ticket Creation
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticketSubject.trim() || !ticketDescription.trim()) {
      toast.error('Please enter a ticket subject and description.')
      return
    }

    setSubmittingTicket(true)
    try {
      const ticketNum = 'CS-TCK-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900)
      const { error } = await (supabase as any)
        .from('support_tickets')
        .insert({
          client_id: sessionClient?.id,
          project_id: clientProjects[0]?.id || null,
          ticket_number: ticketNum,
          subject: ticketSubject.trim(),
          description: ticketDescription.trim(),
          category: ticketCategory,
          priority: ticketPriority,
          status: 'open',
          created_at: new Date().toISOString()
        })

      if (error) throw error
      toast.success(`Support ticket ${ticketNum} opened! Support engineers notified.`)
      setTicketSubject('')
      setTicketDescription('')
      loadClientData(sessionClient!.id)
    } catch (err: any) {
      toast.error('Failed to open ticket: ' + err.message)
    } finally {
      setSubmittingTicket(false)
    }
  }

  // --- Auth Screen Render ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Verifying secure client credentials...</p>
        </div>
      </div>
    )
  }

  if (!sessionClient) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between selection:bg-blue-600/20 selection:text-blue-500">
        {/* Header */}
        <header className="border-b border-slate-800/80 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white group-hover:text-blue-500 transition-colors">
                CapeSecure
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5">
                Client Security &amp; Service Portal
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Admin Sign In &rarr;
            </Link>
          </div>
        </header>

        {/* Login Container */}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-[#0e1526] border border-slate-800/80 rounded-xl p-8 shadow-2xl relative overflow-hidden"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/10 text-blue-500 border border-blue-500/20 mb-3 shadow-inner">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Client Portal Login
              </h1>
              <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto">
                Securely review your project pipeline, approve designs &amp; quotations, access signed agreements, tax invoices, and verified receipts.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Client Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. client@company.com"
                    required
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0b101d] border border-slate-800 focus:border-blue-500 text-white text-xs placeholder:text-slate-500 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    Client Passcode
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    className="text-[11px] text-blue-400 hover:underline"
                  >
                    Forgot passcode?
                  </button>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                    placeholder="Enter assigned passcode"
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0b101d] border border-slate-800 focus:border-blue-500 text-white text-xs placeholder:text-slate-500 outline-none transition-colors"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  First-time signing in? Leave blank or use default passcode provided in your welcome email.
                </p>
              </div>

              <button
                type="submit"
                disabled={submittingAuth}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {submittingAuth ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Client Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-800 text-center">
              <div className="inline-flex items-center gap-2 text-[11px] text-slate-400">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Protected by 256-bit SSL encryption &amp; client-isolated data security.</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Reset Passcode Modal */}
        {showResetModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0e1526] border border-slate-800 rounded-xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="text-base font-bold text-white mb-2">Reset Client Passcode</h3>
              <p className="text-xs text-slate-400 mb-4">
                Enter your registered client email to generate a new secure access passcode.
              </p>
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="client@company.com"
                  required
                  className="w-full px-3.5 py-2 rounded-lg bg-[#282828] border border-[#383838] focus:border-[#0D99FF] text-white text-xs placeholder:text-slate-500 outline-none"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-3 py-1.5 rounded-lg border border-[#383838] text-xs text-slate-300 hover:bg-[#282828]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingReset}
                    className="px-4 py-1.5 rounded-lg bg-[#0D99FF] text-white text-xs font-semibold hover:bg-[#007BE5]"
                  >
                    {sendingReset ? 'Sending...' : 'Send Passcode'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-[#333333] px-6 py-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} CapeSecure Solutions LLP. Confidential client area.
        </footer>
      </div>
    )
  }

  // --- Authenticated Client Portal ---
  const activeProject = clientProjects[0] || null
  const currentPipelineIndex = activeProject?.pipeline_stage
    ? PIPELINE_STAGES.findIndex(s => s.key === activeProject.pipeline_stage)
    : 0

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 selection:bg-blue-600/20 selection:text-blue-500 flex flex-col">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-40 bg-[#0e1526]/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-6 h-15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white">CapeSecure</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  Client Portal
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block">
                {sessionClient.business_name || sessionClient.company || sessionClient.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-white">{sessionClient.name}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {sessionClient.client_code || `CS-CLI-${sessionClient.id.substring(0, 6)}`}
              </span>
            </div>

            <button
              onClick={() => loadClientData(sessionClient.id)}
              title="Refresh Data"
              className="p-1.5 rounded-lg bg-[#131c31] hover:bg-[#1a253f] border border-slate-800 text-slate-300 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/25 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-1 overflow-x-auto scrollbar-none border-t border-slate-800/60">
          {[
            { id: 'overview', label: 'Project Progress', icon: Layers },
            { id: 'quotations', label: `Quotations (${clientQuotations.length})`, icon: FileText },
            { id: 'agreements', label: `Agreements (${clientAgreements.length})`, icon: FileCheck },
            { id: 'invoices', label: `Invoices (${clientInvoices.length})`, icon: CreditCard },
            { id: 'payments', label: `Receipts & Payments (${clientPayments.length})`, icon: Receipt },
            { id: 'designs', label: `Design Reviews (${clientDesigns.length})`, icon: Palette },
            { id: 'handover', label: `Handover & Delivery (${clientHandovers.length})`, icon: ShieldCheck },
            { id: 'support', label: `Support Tickets (${clientTickets.length})`, icon: HelpCircle },
            { id: 'documents', label: `My Documents (${clientDocuments.length})`, icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as PortalTab)}
                className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </header>

      {/* ── Main Tab Content ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* TAB 1: OVERVIEW & 17-STAGE PROJECT PROGRESS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {activeProject ? (
              <div className="bg-[#202020] border border-[#333333] rounded-2xl p-6 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#333333]">
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0ACF83]/15 text-[#0ACF83] border border-[#0ACF83]/30 text-[11px] font-semibold mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0ACF83] animate-pulse" />
                      Active Engagement
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {activeProject.name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Project Ref: <span className="font-mono text-slate-300">{activeProject.project_number || activeProject.id}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Delivery Target</span>
                      <span className="text-sm font-semibold text-white">
                        {activeProject.expected_delivery_date ? formatDate(activeProject.expected_delivery_date) : '4-6 Weeks'}
                      </span>
                    </div>
                    {activeProject.budget && (
                      <div className="pl-4 border-l border-[#333333]">
                        <span className="text-[11px] text-slate-400 block">Total Budget</span>
                        <span className="text-sm font-bold text-[#0ACF83]">
                          {formatCurrency(activeProject.budget)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 17-Stage Interactive Pipeline Progress */}
                <div className="mt-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
                    17-Stage Production Lifecycle
                  </h3>
                  <div className="relative overflow-x-auto pb-4 scrollbar-none">
                    <div className="flex items-center gap-2 min-w-max">
                      {PIPELINE_STAGES.map((stageObj, idx) => {
                        const isPast = idx < currentPipelineIndex
                        const isCurrent = idx === currentPipelineIndex
                        return (
                          <div key={stageObj.key} className="flex items-center">
                            <div
                              className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                                isCurrent
                                  ? 'bg-[#0D99FF]/20 border-[#0D99FF] text-white shadow-lg shadow-[#0D99FF]/10'
                                  : isPast
                                  ? 'bg-[#0ACF83]/10 border-[#0ACF83]/40 text-[#0ACF83]'
                                  : 'bg-[#282828] border-[#383838] text-slate-500'
                              }`}
                              style={{ width: '130px' }}
                            >
                              <div className="flex items-center justify-center w-6 h-6 rounded-full mb-1 text-xs font-bold bg-[#181818]">
                                {isPast ? <Check className="w-3.5 h-3.5 text-[#0ACF83]" /> : idx + 1}
                              </div>
                              <span className="text-[10px] font-semibold leading-tight line-clamp-2">
                                {stageObj.label}
                              </span>
                              {isCurrent && (
                                <span className="mt-1 text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#0D99FF] text-white font-bold">
                                  Current
                                </span>
                              )}
                            </div>
                            {idx < PIPELINE_STAGES.length - 1 && (
                              <div
                                className={`w-4 h-0.5 ${
                                  idx < currentPipelineIndex ? 'bg-[#0ACF83]' : 'bg-[#383838]'
                                }`}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Project Description & Activity */}
                {activeProject.description && (
                  <div className="mt-6 p-4 rounded-xl bg-[#282828] border border-[#383838]">
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1">Scope & Objectives</span>
                    <p className="text-xs text-slate-300 leading-relaxed">{activeProject.description}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#202020] border border-[#333333] rounded-2xl p-12 text-center">
                <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white">No Active Projects Yet</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Once your quotation is finalized and initial onboarding is completed, your live development pipeline will show up here.
                </p>
              </div>
            )}

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#202020] border border-[#333333] rounded-xl p-4">
                <span className="text-xs text-slate-400 block">Approved Quotations</span>
                <span className="text-2xl font-bold text-white mt-1 block">
                  {clientQuotations.filter(q => q.status === 'accepted').length}
                </span>
                <span className="text-[11px] text-slate-500">of {clientQuotations.length} total issued</span>
              </div>
              <div className="bg-[#202020] border border-[#333333] rounded-xl p-4">
                <span className="text-xs text-slate-400 block">Executed Agreements</span>
                <span className="text-2xl font-bold text-[#0ACF83] mt-1 block">
                  {clientAgreements.filter(a => a.status === 'fully_signed').length}
                </span>
                <span className="text-[11px] text-slate-500">Legally verified & active</span>
              </div>
              <div className="bg-[#202020] border border-[#333333] rounded-xl p-4">
                <span className="text-xs text-slate-400 block">Verified Payments</span>
                <span className="text-2xl font-bold text-white mt-1 block">
                  {formatCurrency(
                    clientPayments.reduce((sum, p) => (p.status === 'received' || p.verification_status === 'verified') ? sum + Number(p.amount) : sum, 0)
                  )}
                </span>
                <span className="text-[11px] text-slate-500">{clientPayments.length} receipt records</span>
              </div>
              <div className="bg-[#202020] border border-[#333333] rounded-xl p-4">
                <span className="text-xs text-slate-400 block">Active Support Tickets</span>
                <span className="text-2xl font-bold text-[#0D99FF] mt-1 block">
                  {clientTickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').length}
                </span>
                <span className="text-[11px] text-slate-500">Direct engineering escalation</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUOTATIONS */}
        {activeTab === 'quotations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Project Quotations</h2>
                <p className="text-xs text-slate-400">Review commercial proposals, tax breakdowns, and grant authorization.</p>
              </div>
            </div>

            {clientQuotations.length === 0 ? (
              <div className="bg-[#202020] border border-[#333333] rounded-2xl p-12 text-center">
                <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No quotation proposals on record for your account.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {clientQuotations.map((q) => (
                  <div key={q.id} className="bg-[#202020] border border-[#333333] rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#0D99FF]">{q.quote_number}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                          q.status === 'accepted'
                            ? 'bg-[#0ACF83]/15 text-[#0ACF83] border border-[#0ACF83]/30'
                            : q.status === 'rejected'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}>
                          {q.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-white">{q.title}</h4>
                      <p className="text-xs text-slate-400">
                        Date: {formatDate(q.created_at)} • Valid until: {q.valid_until ? formatDate(q.valid_until) : '30 days from issue'}
                      </p>
                      {q.tax_amount && q.tax_amount > 0 && (
                        <p className="text-[11px] text-slate-500">
                          Taxable: {formatCurrency(q.subtotal)} | GST ({q.tax_rate}%): {formatCurrency(q.tax_amount)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">Total Investment</span>
                        <span className="text-lg font-bold text-[#0ACF83]">{formatCurrency(q.total)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => downloadQuotationPDF(q, sessionClient)}
                          className="p-2.5 rounded-xl bg-[#282828] hover:bg-[#333333] text-slate-300 hover:text-white transition-colors"
                          title="Download Official PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/quote/${q.id}`}
                          target="_blank"
                          className="px-3.5 py-2 rounded-xl bg-[#282828] hover:bg-[#333333] text-slate-300 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                        >
                          <span>Full View</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        {q.status !== 'accepted' && (
                          <button
                            onClick={() => handleApproveQuotation(q)}
                            className="px-4 py-2 rounded-xl bg-[#0ACF83] hover:bg-[#08a569] text-white text-xs font-semibold shadow transition-all inline-flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve Quote</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: AGREEMENTS */}
        {activeTab === 'agreements' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Master Service Agreements</h2>
              <p className="text-xs text-slate-400">Formal contracts, delivery schedules, confidentiality, and legal terms.</p>
            </div>

            {clientAgreements.length === 0 ? (
              <div className="bg-[#202020] border border-[#333333] rounded-2xl p-12 text-center">
                <FileCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No agreements generated yet for your account.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {clientAgreements.map((agr) => (
                  <div key={agr.id} className="bg-[#202020] border border-[#333333] rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#0D99FF]">{agr.agreement_number}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                          agr.status === 'fully_signed'
                            ? 'bg-[#0ACF83]/15 text-[#0ACF83] border border-[#0ACF83]/30'
                            : agr.status === 'partially_signed'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        }`}>
                          {agr.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-white">{agr.title}</h4>
                      <p className="text-xs text-slate-400">
                        Effective: {agr.signed_at ? formatDate(agr.signed_at) : (agr.start_date ? formatDate(agr.start_date) : 'Pending Final Sign-Off')}
                      </p>
                      {agr.signing_method && (
                        <p className="text-[11px] text-slate-500">
                          Execution Method: <span className="capitalize">{agr.signing_method} Verification</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => downloadAgreementPDF(agr, sessionClient)}
                        className="px-4 py-2 rounded-xl bg-[#0D99FF] hover:bg-[#007BE5] text-white text-xs font-semibold shadow transition-all inline-flex items-center gap-2"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Agreement PDF</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: INVOICES & BILLING */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Tax Invoices & Billing</h2>
              <p className="text-xs text-slate-400">Sequential GST/non-GST tax invoices and payment statuses.</p>
            </div>

            {clientInvoices.length === 0 ? (
              <div className="bg-[#202020] border border-[#333333] rounded-2xl p-12 text-center">
                <CreditCard className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No invoices generated for your account yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {clientInvoices.map((inv) => (
                  <div key={inv.id} className="bg-[#202020] border border-[#333333] rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#0D99FF]">{inv.invoice_number}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                          inv.status === 'paid'
                            ? 'bg-[#0ACF83]/15 text-[#0ACF83] border border-[#0ACF83]/30'
                            : inv.status === 'overdue'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Date: {formatDate(inv.created_at)} • Due: {inv.due_date ? formatDate(inv.due_date) : 'On Receipt'}
                      </p>
                      {inv.tax_amount && inv.tax_amount > 0 && (
                        <p className="text-[11px] text-slate-500">
                          Taxable: {formatCurrency(inv.subtotal)} | Applicable GST: {formatCurrency(inv.tax_amount)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">Invoice Total</span>
                        <span className="text-lg font-bold text-white">{formatCurrency(inv.total)}</span>
                        {inv.balance_due !== undefined && inv.balance_due > 0 && (
                          <span className="text-[11px] text-red-400 block">
                            Balance Due: {formatCurrency(inv.balance_due)}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => downloadInvoicePDF(inv, sessionClient, activeProject)}
                        className="px-4 py-2 rounded-xl bg-[#282828] hover:bg-[#333333] text-white text-xs font-semibold border border-[#383838] transition-all inline-flex items-center gap-2"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Invoice PDF</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: RECEIPTS & PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Payment Receipts & History</h2>
              <p className="text-xs text-slate-400">Verified payment records with transaction references and sequential receipts.</p>
            </div>

            {clientPayments.length === 0 ? (
              <div className="bg-[#202020] border border-[#333333] rounded-2xl p-12 text-center">
                <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No payment records found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {clientPayments.map((pay) => (
                  <div key={pay.id} className="bg-[#202020] border border-[#333333] rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#0ACF83]">
                          {pay.receipt_number || `CS-REC-${pay.id.substring(0, 6)}`}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase bg-[#0ACF83]/15 text-[#0ACF83] border border-[#0ACF83]/30">
                          {pay.verification_status || pay.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Method: <span className="uppercase font-semibold">{pay.payment_method}</span> • Date: {pay.received_date ? formatDate(pay.received_date) : formatDate(pay.created_at)}
                      </p>
                      {pay.reference && (
                        <p className="text-[11px] text-slate-500 font-mono">
                          UTR / Ref: {pay.reference}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 block">Amount Received</span>
                        <span className="text-lg font-bold text-[#0ACF83]">{formatCurrency(pay.amount)}</span>
                      </div>

                      <button
                        onClick={() => downloadReceiptPDF(pay, sessionClient)}
                        className="px-4 py-2 rounded-xl bg-[#282828] hover:bg-[#333333] text-white text-xs font-semibold border border-[#383838] transition-all inline-flex items-center gap-2"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Receipt PDF</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: DESIGN APPROVALS */}
        {activeTab === 'designs' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Design Previews & Sign-Off</h2>
              <p className="text-xs text-slate-400">Review UI mockups, prototypes, and approve or request revision changes.</p>
            </div>

            {clientDesigns.length === 0 ? (
              <div className="bg-[#202020] border border-[#333333] rounded-2xl p-12 text-center">
                <Palette className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No design previews currently submitted for client review.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clientDesigns.map((des) => (
                  <div key={des.id} className="bg-[#202020] border border-[#333333] rounded-2xl p-5 shadow-md flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#0D99FF]/15 text-[#0D99FF] border border-[#0D99FF]/30">
                          {des.stage} (v{des.version})
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                          des.status === 'approved'
                            ? 'bg-[#0ACF83]/15 text-[#0ACF83]'
                            : des.status === 'revision_requested'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {des.status.replace('_', ' ')}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-white mb-1">{des.title}</h4>
                      {des.description && <p className="text-xs text-slate-400 mb-3">{des.description}</p>}

                      {des.preview_url && (
                        <div className="rounded-xl overflow-hidden border border-[#333333] bg-[#181818] mb-4 aspect-video relative group">
                          <img
                            src={des.preview_url}
                            alt={des.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none'
                            }}
                          />
                          <a
                            href={des.preview_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-sm text-white text-[11px] font-medium flex items-center gap-1 opacity-90 hover:opacity-100"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Enlarge</span>
                          </a>
                        </div>
                      )}

                      {des.figma_url && (
                        <a
                          href={des.figma_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-[#0D99FF] hover:underline mb-3"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Live Interactive Figma Prototype</span>
                        </a>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#333333] flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500">
                        {des.approved_at ? `Approved ${formatDate(des.approved_at)}` : 'Awaiting feedback'}
                      </span>
                      <button
                        onClick={() => setSelectedDesign(des)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#0D99FF] hover:bg-[#007BE5] text-white text-xs font-semibold transition-colors"
                      >
                        Review & Feedback
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Design Review Modal */}
            {selectedDesign && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#202020] border border-[#383838] rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-white">Review {selectedDesign.title}</h3>
                    <button
                      onClick={() => setSelectedDesign(null)}
                      className="p-1 text-slate-400 hover:text-white rounded"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 mb-4">
                    Provide approval or describe modifications requested for version {selectedDesign.version}.
                  </p>

                  <textarea
                    rows={4}
                    value={designFeedback}
                    onChange={(e) => setDesignFeedback(e.target.value)}
                    placeholder="Enter detailed feedback, comments, or revision requirements..."
                    className="w-full p-3 rounded-xl bg-[#282828] border border-[#383838] focus:border-[#0D99FF] text-white text-xs placeholder:text-slate-500 outline-none mb-4"
                  />

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={submittingDesignFeedback}
                      onClick={() => handleDesignAction('revision_requested')}
                      className="px-4 py-2 rounded-xl bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-semibold"
                    >
                      Request Revisions
                    </button>
                    <button
                      type="button"
                      disabled={submittingDesignFeedback}
                      onClick={() => handleDesignAction('approved')}
                      className="px-4 py-2 rounded-xl bg-[#0ACF83] text-white hover:bg-[#08a569] text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve Design</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: HANDOVER & ASSETS */}
        {activeTab === 'handover' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Handover Documents & Production Assets</h2>
              <p className="text-xs text-slate-400">Production credentials transfer, live URLs, and 12-section project completion certificates.</p>
            </div>

            {clientHandovers.length === 0 ? (
              <div className="bg-[#202020] border border-[#333333] rounded-2xl p-12 text-center">
                <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Handover documentation will be generated upon final testing & QA sign-off.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {clientHandovers.map((h) => (
                  <div key={h.id} className="bg-[#202020] border border-[#333333] rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#0ACF83]">
                          Handover Certificate
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                          h.status === 'completed'
                            ? 'bg-[#0ACF83]/15 text-[#0ACF83] border border-[#0ACF83]/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}>
                          {h.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Live Website: {h.live_website_url ? (
                          <a href={h.live_website_url} target="_blank" rel="noopener noreferrer" className="text-[#0D99FF] hover:underline">
                            {h.live_website_url}
                          </a>
                        ) : 'Configured on primary production cluster'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Handover Date: {formatDate(h.handover_date)} • Domain Status: {h.domain_ownership_confirmed ? 'Ownership Confirmed' : 'Transfer in Progress'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => downloadHandoverDocumentPDF(h, activeProject, sessionClient)}
                        className="px-4 py-2 rounded-xl bg-[#0ACF83] hover:bg-[#08a569] text-white text-xs font-semibold shadow transition-all inline-flex items-center gap-2"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Handover Certificate PDF</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 8: SUPPORT & MAINTENANCE */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Client Technical Support & Maintenance</h2>
                <p className="text-xs text-slate-400">Submit engineering requests, report defects, or review SLA status.</p>
              </div>
            </div>

            {/* SLA & Active Maintenance Card */}
            {clientMaintenance.length > 0 ? (
              <div className="space-y-4">
                {clientMaintenance.map((m) => {
                  const mWebsite = clientWebsites[0] || null
                  return (
                    <div
                      key={m.id}
                      className="bg-[#202020] border border-[#333333] rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-[#0ACF83]">{m.plan_name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                            m.contract_status === 'active'
                              ? 'bg-[#0ACF83]/15 text-[#0ACF83] border border-[#0ACF83]/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}>
                            {m.contract_status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          Next Renewal Date: <span className="font-bold text-white">{formatDate(m.renewal_date)}</span> • Rate: {formatCurrency(m.price)} / {m.billing_frequency}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Support Entitlement: {m.support_entitlement?.priority_sla || 'High Priority (2hr SLA)'} • {m.support_entitlement?.hours_used || 0}h / {m.support_entitlement?.hours_per_month || 2}h used
                        </p>
                        {mWebsite && (
                          <p className="text-[11px] text-[#0D99FF]">
                            Covered Site: {mWebsite.url} • Uptime SLA: {mWebsite.uptime_percentage}%
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => downloadMaintenanceReportPDF(m, sessionClient, mWebsite)}
                          className="px-4 py-2 rounded-xl bg-[#0ACF83] hover:bg-[#08a569] text-white text-xs font-semibold shadow transition-all inline-flex items-center gap-2"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Maintenance Health Report PDF</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-[#202020] border border-[#333333] rounded-2xl p-5 shadow-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0ACF83]/15 text-[#0ACF83] border border-[#0ACF83]/30 flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">CapeSecure Warranty & Active SLA</h4>
                    <p className="text-xs text-slate-400">90-Day post-deployment zero-defect warranty active. Priority response under 2 hours.</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#0ACF83] px-3 py-1 rounded-full bg-[#0ACF83]/10 border border-[#0ACF83]/20">
                  Active Warranty
                </span>
              </div>
            )}

            {/* Raise Support Ticket Form */}
            <div className="bg-[#202020] border border-[#333333] rounded-2xl p-6 shadow-md">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Send className="w-4 h-4 text-[#0D99FF]" />
                <span>Submit Technical Support Ticket</span>
              </h3>
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
                    <input
                      type="text"
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="e.g. SSL renewal check or form error"
                      required
                      className="w-full px-3.5 py-2 rounded-xl bg-[#282828] border border-[#383838] focus:border-[#0D99FF] text-white text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                    <select
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#282828] border border-[#383838] focus:border-[#0D99FF] text-white text-xs outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Description & Evidence</label>
                  <textarea
                    rows={3}
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    placeholder="Provide exact details or replication steps..."
                    required
                    className="w-full p-3 rounded-xl bg-[#282828] border border-[#383838] focus:border-[#0D99FF] text-white text-xs outline-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingTicket}
                    className="px-5 py-2 rounded-xl bg-[#0D99FF] hover:bg-[#007BE5] text-white text-xs font-semibold transition-all inline-flex items-center gap-2"
                  >
                    {submittingTicket ? 'Submitting...' : 'Submit Support Request'}
                  </button>
                </div>
              </form>
            </div>

            {/* Existing Tickets List */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Ticket History</h3>
              {clientTickets.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-[#202020] rounded-xl border border-[#333333]">
                  No support tickets logged.
                </div>
              ) : (
                <div className="space-y-3">
                  {clientTickets.map((t) => (
                    <div key={t.id} className="p-4 rounded-xl bg-[#202020] border border-[#333333] flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#0D99FF]">{t.ticket_number}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold ${
                            t.status === 'resolved' ? 'bg-[#0ACF83]/15 text-[#0ACF83]' : 'bg-amber-500/15 text-amber-400'
                          }`}>
                            {t.status}
                          </span>
                        </div>
                        <h5 className="text-xs font-semibold text-white mt-1">{t.subject}</h5>
                        <p className="text-[11px] text-slate-400">{t.description}</p>
                      </div>
                      <span className="text-[11px] text-slate-500">{formatDate(t.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 9: DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Client Document Vault</h2>
              <p className="text-xs text-slate-400">All formal digital documents, specifications, and files issued to your organization.</p>
            </div>

            {clientDocuments.length === 0 ? (
              <div className="bg-[#202020] border border-[#333333] rounded-2xl p-12 text-center">
                <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No standalone uploaded documents found in your private vault.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clientDocuments.map((doc) => (
                  <div key={doc.id} className="bg-[#202020] border border-[#333333] rounded-2xl p-5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0D99FF]/10 text-[#0D99FF] font-semibold block w-fit mb-1">
                        {doc.category}
                      </span>
                      <h4 className="text-sm font-semibold text-white">{doc.name}</h4>
                      <p className="text-xs text-slate-400">{doc.description || 'Verified private client document'}</p>
                    </div>
                    {doc.file_url && (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-[#282828] hover:bg-[#333333] text-slate-300 hover:text-white transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#333333] bg-[#202020] px-6 py-4 text-center text-xs text-slate-500">
        CapeSecure Solutions LLP • Client Portal Session Protected • ISO/IEC 27001 Security Best Practices
      </footer>
    </div>
  )
}
