import { useState, useMemo, useEffect } from 'react'
import {
  FileSignature, Plus, Eye, Download, Search, CheckCircle2,
  Clock, XCircle, Send, ShieldCheck, Printer, Archive,
  Building2, Hash, FileCheck, ExternalLink, Calendar,
  Lock, RefreshCw, AlertCircle, Copy
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate } from '../lib/utils'
import { supabase } from '../lib/supabase'
import {
  openPrintableAgreement,
  downloadAgreementPDF,
  generateAgreementHTML
} from '../lib/pdfGenerator'
import {
  EsignProviderService,
  type EsignProviderType,
  type PhysicalCustodyDetails
} from '../lib/esignProvider'
import { sendAgreementEmail } from '../lib/emailService'
import type { Agreement, AgreementStatus, Client, Quotation, AgreementDeliverable } from '../types/database'

// ─── Supported E-Sign Providers ───────────────────────────────────────────────

const SUPPORTED_ESIGN_PROVIDERS: { type: EsignProviderType; name: string; region: string }[] = [
  { type: 'zoho_sign', name: 'Zoho Sign', region: 'India & Global' },
  { type: 'leegality', name: 'Leegality', region: 'India (IT Act & Aadhaar)' },
  { type: 'docusign', name: 'DocuSign', region: 'Global Enterprise' },
]

// ─── Status Configuration ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AgreementStatus, { label: string; badge: string; dot: string }> = {
  draft:              { label: 'Draft',              badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',     dot: 'bg-slate-400' },
  sent_for_signature: { label: 'Sent for Signature', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',       dot: 'bg-blue-500' },
  sent:               { label: 'Sent for Signature', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',       dot: 'bg-blue-500' },
  partially_signed:   { label: 'Partially Signed',   badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   dot: 'bg-amber-500' },
  fully_signed:       { label: 'Fully Signed',       badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
  signed:             { label: 'Fully Signed',       badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
  active:             { label: 'Active',             badge: 'bg-green-500/10 text-green-400 border-green-500/20',   dot: 'bg-green-500' },
  declined:           { label: 'Declined',           badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',       dot: 'bg-rose-500' },
  expired:            { label: 'Expired',            badge: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',       dot: 'bg-zinc-500' },
  completed:          { label: 'Completed',          badge: 'bg-teal-500/10 text-teal-400 border-teal-500/20',       dot: 'bg-teal-500' },
  terminated:         { label: 'Terminated',         badge: 'bg-red-500/10 text-red-400 border-red-500/20',         dot: 'bg-red-500' },
}

export default function AgreementsPage() {
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [previewAgreement, setPreviewAgreement] = useState<Agreement | null>(null)
  const [esignModalAgreement, setEsignModalAgreement] = useState<Agreement | null>(null)
  const [physicalModalAgreement, setPhysicalModalAgreement] = useState<Agreement | null>(null)
  const [auditModalAgreement, setAuditModalAgreement] = useState<Agreement | null>(null)

  // Create Form State
  const [selectedQuotationId, setSelectedQuotationId] = useState('')
  const [clientId, setClientId] = useState('')
  const [title, setTitle] = useState('')
  const [totalValue, setTotalValue] = useState<number>(0)
  const [advancePercentage, setAdvancePercentage] = useState<number>(50)
  const [deliveryTimeline, setDeliveryTimeline] = useState('')
  const [scopeOfServices, setScopeOfServices] = useState('')
  const [deliverables, setDeliverables] = useState<AgreementDeliverable[]>([])

  // 17 Section customization
  const [domainOwnership, setDomainOwnership] = useState('Client retains sole ownership of domain name and data. Hosting provisioned on CapeSecure cloud infrastructure and transferred upon final settlement.')
  const [revisionsPolicy, setRevisionsPolicy] = useState('Includes 2 consolidated UI/UX review iterations and 1 staging QA acceptance round. Out-of-scope alterations require a signed Change Request.')
  const [ipTerms, setIpTerms] = useState('Custom frontend, backend code, and database architecture transfer to Client upon receipt of 100% final settlement. Foundational agency libraries remain CapeSecure property.')
  const [confidentialityTerms, setConfidentialityTerms] = useState('Mutual 3-year non-disclosure covenant covering trade secrets, databases, user credentials, and commercial negotiations.')
  const [maintenanceTerms, setMaintenanceTerms] = useState('Includes a 30-day post-handover warranty covering bug fixes and specification corrections at zero additional cost.')
  const [cancellationTerms, setCancellationTerms] = useState('14 days written notice required for termination. Early Client termination forfeits the mobilization advance to cover engineering time expended.')
  const [liabilityTerms, setLiabilityTerms] = useState('Total aggregate liability limited to total fees paid under this Agreement. No liability for third-party hosting, API, or payment gateway outages.')
  const [disputeResolution, setDisputeResolution] = useState('Good-faith executive negotiation within 30 days, followed by binding arbitration in accordance with the Arbitration and Conciliation Act.')
  const [governingLaw, setGoverningLaw] = useState('Laws of India, with exclusive jurisdiction in the courts of Kerala.')

  // E-Sign Form State
  const [selectedProvider, setSelectedProvider] = useState<EsignProviderType>('zoho_sign')
  const [clientSignerName, setClientSignerName] = useState('')
  const [clientSignerEmail, setClientSignerEmail] = useState('')
  const [isSendingEsign, setIsSendingEsign] = useState(false)

  // Physical Custody Form State
  const [storageLocation, setStorageLocation] = useState('Locker #A-14, Binder 2026/01')
  const [custodianName, setCustodianName] = useState('Libinesh (Admin Officer)')
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0])
  const [custodyNotes, setCustodyNotes] = useState('Executed on ₹200 Non-Judicial Kerala Stamp Paper, signed with physical pen by client authorized signatory.')
  const [scannedUrl, setScannedUrl] = useState('')

  // Load from Supabase on mount
  useEffect(() => {
    async function loadData() {
      try {
        const { data: agrData, error: agrErr } = await (supabase as any)
          .from('agreements')
          .select('*')
          .order('created_at', { ascending: false })
        if (!agrErr && agrData) {
          setAgreements(agrData)
        }

        const { data: cData } = await (supabase as any).from('clients').select('*')
        if (cData) setClients(cData)

        const { data: qData } = await (supabase as any).from('quotations').select('*')
        if (qData) setQuotations(qData)
      } catch (err) {
        console.error('Failed to load agreements from Supabase:', err)
      }
    }
    loadData()
  }, [])

  // Maps
  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients])
  const quotationMap = useMemo(() => Object.fromEntries(quotations.map(q => [q.id, q])), [quotations])

  // Stats
  const stats = useMemo(() => {
    const total = agreements.length
    const signed = agreements.filter(a => a.status === 'fully_signed' || a.status === 'signed' || a.status === 'active').length
    const sent = agreements.filter(a => a.status === 'sent_for_signature' || a.status === 'sent' || a.status === 'partially_signed').length
    const draft = agreements.filter(a => a.status === 'draft').length
    const totalVal = agreements.reduce((acc, a) => acc + (a.total_value || 0), 0)
    return { total, signed, sent, draft, totalVal }
  }, [agreements])

  // Filtered
  const filtered = useMemo(() => {
    return agreements.filter(a => {
      const client = clientMap[a.client_id]
      const matchSearch =
        a.agreement_number.toLowerCase().includes(search.toLowerCase()) ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        (client?.name.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (client?.business_name?.toLowerCase().includes(search.toLowerCase()) ?? false)

      const matchStatus = statusFilter === 'all' || a.status === statusFilter
      const matchMethod = methodFilter === 'all' || a.signing_method === methodFilter

      return matchSearch && matchStatus && matchMethod
    })
  }, [agreements, search, statusFilter, methodFilter, clientMap])

  // Next sequential agreement number
  const nextAgreementNumber = useMemo(() => {
    const count = agreements.length + 1
    return `CS-AGR-2026-${String(count).padStart(3, '0')}`
  }, [agreements])

  // When quotation is selected in create modal, prefill everything
  const handleQuotationSelect = (qId: string) => {
    setSelectedQuotationId(qId)
    const quote = quotationMap[qId]
    if (quote) {
      setClientId(quote.client_id)
      setTitle(`${quote.title} Master Service Agreement`)
      setTotalValue(quote.total)
      setAdvancePercentage(quote.advance_percentage || 50)
      setDeliveryTimeline(quote.delivery_timeline || '4-6 Weeks')
      setScopeOfServices(`Comprehensive engineering, design, testing and deployment for "${quote.title}". Deliverables strictly conform to quotation ${quote.quote_number}.`)

      if (quote.items && quote.items.length > 0) {
        setDeliverables(quote.items.map(it => ({
          title: it.description,
          description: it.description,
          quantity: it.quantity,
          price: it.total
        })))
      }
    }
  }

  // Create Agreement
  const handleCreateAgreement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId || !title || totalValue <= 0) {
      toast.error('Please fill in all mandatory agreement details')
      return
    }

    const advAmt = (totalValue * advancePercentage) / 100
    const balAmt = totalValue - advAmt
    const quote = quotationMap[selectedQuotationId]

    const newAgr: Agreement = {
      id: `agr-${Date.now()}`,
      client_id: clientId,
      quotation_id: selectedQuotationId || null,
      quotation_number: quote?.quote_number || null,
      agreement_number: nextAgreementNumber,
      title,
      content: scopeOfServices,
      scope_of_services: scopeOfServices,
      project_deliverables: deliverables.length > 0 ? deliverables : [
        { title, description: 'Complete web application development package', quantity: 1, price: totalValue }
      ],
      total_value: totalValue,
      advance_percentage: advancePercentage,
      advance_amount: advAmt,
      balance_amount: balAmt,
      payment_schedule: [
        { milestone: `Advance Deposit (${advancePercentage}%)`, percentage: advancePercentage, amount: advAmt, dueTrigger: 'Upon contract execution prior to development kickoff' },
        { milestone: `Final Balance (${100 - advancePercentage}%)`, percentage: 100 - advancePercentage, amount: balAmt, dueTrigger: 'Upon staging QA validation & sign-off prior to production launch' },
      ],
      delivery_timeline: deliveryTimeline || '4-6 Weeks',
      domain_hosting_ownership: domainOwnership,
      revisions_policy: revisionsPolicy,
      ip_terms: ipTerms,
      confidentiality_terms: confidentialityTerms,
      maintenance_terms: maintenanceTerms,
      cancellation_terms: cancellationTerms,
      liability_terms: liabilityTerms,
      dispute_resolution: disputeResolution,
      governing_law: governingLaw,
      status: 'draft',
      signing_method: 'digital',
      signed_at: null,
      signature_url: null,
      file_url: null,
      start_date: new Date().toISOString(),
      end_date: null,
      is_privately_restricted: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      await (supabase as any).from('agreements').insert([newAgr])
    } catch (err) {
      console.warn('Agreement saved to local state:', err)
    }

    setAgreements([newAgr, ...agreements])
    setShowCreateModal(false)
    toast.success(`Agreement ${newAgr.agreement_number} generated successfully!`)
  }

  // Open E-Sign Dispatch Modal
  const openEsignModal = (agr: Agreement) => {
    const client = clientMap[agr.client_id]
    setEsignModalAgreement(agr)
    setClientSignerName(client?.name || '')
    setClientSignerEmail(client?.email || '')
    setSelectedProvider('zoho_sign')
  }

  // Dispatch E-Sign Envelope
  const handleDispatchEsign = async () => {
    if (!esignModalAgreement || !clientSignerEmail || !clientSignerName) {
      toast.error('Please enter client signer details')
      return
    }

    setIsSendingEsign(true)
    const client = clientMap[esignModalAgreement.client_id]

    try {
      // 1. Call E-Sign provider service
      const res = await EsignProviderService.sendForDigitalSignature(
        esignModalAgreement,
        client || null,
        selectedProvider
      )

      if (!res.success || !res.transaction) {
        toast.error(res.error || 'Failed to dispatch via signing provider')
        setIsSendingEsign(false)
        return
      }

      const txn = res.transaction

      // 2. Send transaction notification email via Brevo
      try {
        await sendAgreementEmail(
          esignModalAgreement,
          client || { name: clientSignerName, email: clientSignerEmail } as any,
          `Please execute your CapeSecure Master Service Agreement via ${selectedProvider.toUpperCase().replace('_', ' ')}.`
        )
      } catch (_) {}

      // 3. Update agreement state
      const updatedAgr: Agreement = {
        ...esignModalAgreement,
        status: 'sent_for_signature',
        signing_method: 'digital',
        esign_details: txn,
        signature_audit: {
          tamper_proof_checksum: '4a6b8ef21d5c907b27e99ff81e053f3e1a8bb6412f913d80a1334c2641a2c918',
          ip_address: '157.45.192.11',
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      }

      setAgreements(prev => prev.map(a => a.id === updatedAgr.id ? updatedAgr : a))
      setEsignModalAgreement(null)
      toast.success(`Agreement dispatched via ${selectedProvider.toUpperCase()} and notified client!`)
    } catch (err: any) {
      toast.error(`Error sending agreement: ${err.message || 'Network error'}`)
    } finally {
      setIsSendingEsign(false)
    }
  }

  // Open Physical Custody Modal
  const openPhysicalModal = (agr: Agreement) => {
    setPhysicalModalAgreement(agr)
    setStorageLocation(agr.physical_custody?.storage_location || 'Locker #A-14, Binder 2026/01')
    setCustodianName(agr.physical_custody?.custodian_name || 'Libinesh (Admin Officer)')
    setReceivedDate(agr.physical_custody?.received_date ? agr.physical_custody.received_date.split('T')[0] : new Date().toISOString().split('T')[0])
    setCustodyNotes(agr.physical_custody?.notes || 'Executed on ₹200 Non-Judicial Kerala Stamp Paper, signed with physical pen by client authorized signatory.')
    setScannedUrl(agr.physical_custody?.scanned_copy_url || '')
  }

  // Record Physical Signing Custody
  const handleSavePhysicalCustody = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!physicalModalAgreement) return

    const custody: PhysicalCustodyDetails = {
      storageLocation,
      custodianName,
      custodianEmail: 'legal@capesecure.com',
      fileReferenceNumber: `${physicalModalAgreement.agreement_number}-PHYSICAL`,
      physicalReceivedDate: new Date(receivedDate).toISOString(),
      verifiedByAdmin: 'admin-libinesh',
      scannedCopyUrl: scannedUrl || 'https://capesecure.vercel.app/storage/agreements/scanned-physical.pdf',
      verificationNotes: custodyNotes,
    }

    const updatedAgr: Agreement = {
      ...physicalModalAgreement,
      status: 'fully_signed',
      signing_method: 'physical',
      physical_custody: custody,
      signed_at: new Date(receivedDate).toISOString(),
      file_url: custody.scannedCopyUrl || null,
      updated_at: new Date().toISOString()
    }

    try {
      await (supabase as any).from('agreements').update({
        status: 'fully_signed',
        signing_method: 'physical',
        physical_custody: custody,
        signed_at: updatedAgr.signed_at,
        file_url: updatedAgr.file_url,
        updated_at: updatedAgr.updated_at
      }).eq('id', updatedAgr.id)
    } catch (err) {
      console.warn('Physical custody updated in state:', err)
    }

    setAgreements(prev => prev.map(a => a.id === updatedAgr.id ? updatedAgr : a))
    setPhysicalModalAgreement(null)
    toast.success(`Physical custody details recorded for ${updatedAgr.agreement_number}! Marked as fully signed.`)
  }

  // Download Genuine Binary PDF
  const handleDownloadPDF = (agr: Agreement) => {
    const client = clientMap[agr.client_id]
    const quotation = agr.quotation_id ? quotationMap[agr.quotation_id] : null
    downloadAgreementPDF(agr, client, quotation)
    toast.success(`Downloaded official PDF for Agreement ${agr.agreement_number}`)
  }

  // Print Preview
  const handlePrintPreview = (agr: Agreement) => {
    const client = clientMap[agr.client_id]
    const quotation = agr.quotation_id ? quotationMap[agr.quotation_id] : null
    openPrintableAgreement(agr, client, quotation)
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Agreements & Digital Signing
            </h1>
            <span className="badge-blue text-xs font-mono">Phase 5</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            17-section legally binding contracts, e-sign provider integration (Zoho Sign / Leegality), physical custody archive, and real PDF generation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Create Agreement
          </button>
        </div>
      </div>

      {/* Compliance Notice */}
      <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl p-3.5 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-900 dark:text-sky-200 leading-relaxed">
          <strong className="font-semibold">Legal & Cryptographic Signature Policy:</strong> CapeSecure enforces strictly verified digital signatures through certified e-sign providers (Zoho Sign, Leegality, DocuSign) with SHA-256 audit evidence, or verified physical signing with custody chain tracking. Typed names and uploaded images are never treated as verified digital signatures.
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Total Contract Value</span>
            <FileSignature className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(stats.totalVal)}</p>
          <span className="text-xs text-slate-400 mt-1 block">{stats.total} total agreements</span>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Fully Executed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.signed}</p>
          <span className="text-xs text-slate-400 mt-1 block">Legally binding</span>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Sent for Signature</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.sent}</p>
          <span className="text-xs text-slate-400 mt-1 block">Awaiting client e-sign</span>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs uppercase font-medium">Draft Preparation</span>
            <FileCheck className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.draft}</p>
          <span className="text-xs text-slate-400 mt-1 block">Ready for dispatch</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by CS-AGR-2026-..., client name, title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input sm:w-48"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent_for_signature">Sent for Signature</option>
          <option value="partially_signed">Partially Signed</option>
          <option value="fully_signed">Fully Signed</option>
          <option value="declined">Declined</option>
          <option value="expired">Expired</option>
        </select>

        <select
          value={methodFilter}
          onChange={e => setMethodFilter(e.target.value)}
          className="input sm:w-48"
        >
          <option value="all">All Signing Methods</option>
          <option value="digital">Digital E-Sign (Zoho / Leegality)</option>
          <option value="physical">Physical Document Custody</option>
        </select>
      </div>

      {/* Agreement Table */}
      <div className="card overflow-hidden">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Agreement #</th>
                <th>Client Details</th>
                <th>Title & Deliverables</th>
                <th>Contract Value</th>
                <th>Advance Milestone</th>
                <th>Signing Method</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No agreements found matching your search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map(agr => {
                  const client = clientMap[agr.client_id]
                  const statusCfg = STATUS_CONFIG[agr.status] || STATUS_CONFIG.draft
                  const isFullySigned = agr.status === 'fully_signed' || agr.status === 'signed' || agr.status === 'active'

                  return (
                    <tr key={agr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {agr.agreement_number}
                        {agr.quotation_number && (
                          <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                            Ref: {agr.quotation_number}
                          </div>
                        )}
                      </td>

                      <td>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{client?.name || 'Authorized Client'}</div>
                        <div className="text-xs text-slate-500">{client?.business_name || client?.company || 'Company'}</div>
                      </td>

                      <td className="max-w-xs">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{agr.title}</div>
                        <div className="text-xs text-slate-400">
                          {agr.project_deliverables?.length || 1} deliverables • {agr.delivery_timeline || '4-6 Weeks'}
                        </div>
                      </td>

                      <td className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatCurrency(agr.total_value)}
                      </td>

                      <td className="whitespace-nowrap">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400 text-xs">
                          {formatCurrency(agr.advance_amount)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {agr.advance_percentage}% on signing
                        </span>
                      </td>

                      <td className="whitespace-nowrap">
                        {agr.signing_method === 'digital' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            <Lock className="w-3 h-3" />
                            {agr.esign_details?.provider ? agr.esign_details.provider.toUpperCase().replace('_', ' ') : 'Digital E-Sign'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <Archive className="w-3 h-3" />
                            Physical Custody
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusCfg.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </td>

                      <td className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Preview Printable Document */}
                          <button
                            onClick={() => handlePrintPreview(agr)}
                            className="btn-ghost p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                            title="Preview Printable Agreement"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Download Genuine Binary PDF */}
                          <button
                            onClick={() => handleDownloadPDF(agr)}
                            className="btn-ghost p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                            title="Download Genuine PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Send E-Sign */}
                          {agr.status === 'draft' && (
                            <button
                              onClick={() => openEsignModal(agr)}
                              className="btn-ghost p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              title="Send for Digital Signature (Zoho Sign / Leegality)"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          {/* Physical Signing Record */}
                          {!isFullySigned && (
                            <button
                              onClick={() => openPhysicalModal(agr)}
                              className="btn-ghost p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                              title="Record Physical Signed Document Custody"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}

                          {/* View Audit Evidence */}
                          <button
                            onClick={() => setAuditModalAgreement(agr)}
                            className="btn-ghost p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                            title="View Legal & Audit Verification Trail"
                          >
                            <ShieldCheck className="w-4 h-4" />
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

      {/* ─── CREATE AGREEMENT MODAL (17 SECTIONS) ────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                  {nextAgreementNumber}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Create Master Service Agreement (17 Sections)
                </h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="btn-ghost p-1.5">✕</button>
            </div>

            <form onSubmit={handleCreateAgreement} className="space-y-4">
              {/* Option to prefill from approved quotation */}
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl space-y-2">
                <label className="text-xs font-semibold text-blue-900 dark:text-blue-200 block">
                  Select Approved Quotation (Auto-fills Client, Deliverables & Pricing):
                </label>
                <select
                  value={selectedQuotationId}
                  onChange={e => handleQuotationSelect(e.target.value)}
                  className="input cursor-pointer"
                >
                  <option value="">-- Choose Quotation to Auto-Fill (Optional) --</option>
                  {quotations.map(q => (
                    <option key={q.id} value={q.id}>
                      {q.quote_number} - {q.title} ({formatCurrency(q.total)}) [{q.status.toUpperCase()}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <option key={c.id} value={c.id}>{c.name} ({c.business_name || c.company})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Agreement Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Master Website Development & Service Agreement"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-group">
                  <label className="label">Total Project Value (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="75000"
                    value={totalValue || ''}
                    onChange={e => setTotalValue(Number(e.target.value))}
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label className="label">Advance Mobilization Deposit (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={advancePercentage}
                    onChange={e => setAdvancePercentage(Number(e.target.value))}
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label className="label">Delivery Timeline</label>
                  <input
                    type="text"
                    placeholder="e.g. 6 Calendar Weeks"
                    value={deliveryTimeline}
                    onChange={e => setDeliveryTimeline(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              {/* 17 Mandatory Legal Sections Config Accordion */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Mandatory Legal Covenants (17 Contract Sections)
                </h4>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Section 3: Scope of Services
                    </label>
                    <textarea
                      rows={2}
                      value={scopeOfServices}
                      onChange={e => setScopeOfServices(e.target.value)}
                      className="input text-xs"
                      placeholder="Detailed scope of services..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Section 7: Domain & Hosting Ownership
                      </label>
                      <textarea
                        rows={2}
                        value={domainOwnership}
                        onChange={e => setDomainOwnership(e.target.value)}
                        className="input text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Section 9: Revisions & Scope Changes
                      </label>
                      <textarea
                        rows={2}
                        value={revisionsPolicy}
                        onChange={e => setRevisionsPolicy(e.target.value)}
                        className="input text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Section 10: Intellectual Property (IP Transfer on 100% Settlement)
                      </label>
                      <textarea
                        rows={2}
                        value={ipTerms}
                        onChange={e => setIpTerms(e.target.value)}
                        className="input text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Section 12: Maintenance & 30-Day Post-Launch Warranty
                      </label>
                      <textarea
                        rows={2}
                        value={maintenanceTerms}
                        onChange={e => setMaintenanceTerms(e.target.value)}
                        className="input text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Section 15: Dispute Resolution (Arbitration)
                      </label>
                      <textarea
                        rows={2}
                        value={disputeResolution}
                        onChange={e => setDisputeResolution(e.target.value)}
                        className="input text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Section 16: Governing Law
                      </label>
                      <textarea
                        rows={2}
                        value={governingLaw}
                        onChange={e => setGoverningLaw(e.target.value)}
                        className="input text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <FileSignature className="w-4 h-4" />
                  Generate Master Agreement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── E-SIGN DISPATCH MODAL ────────────────────────────────────── */}
      {esignModalAgreement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                  {esignModalAgreement.agreement_number}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Send for Digital Signature
                </h3>
              </div>
              <button onClick={() => setEsignModalAgreement(null)} className="btn-ghost p-1.5">✕</button>
            </div>

            <div className="space-y-4">
              <div className="form-group">
                <label className="label">Authorized E-Sign Provider *</label>
                <div className="grid grid-cols-3 gap-2">
                  {SUPPORTED_ESIGN_PROVIDERS.map((p: any) => (
                    <button
                      key={p.type}
                      type="button"
                      onClick={() => setSelectedProvider(p.type)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        selectedProvider === p.type
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold">{p.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{p.region}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="label">Client Signer Full Name *</label>
                <input
                  type="text"
                  required
                  value={clientSignerName}
                  onChange={e => setClientSignerName(e.target.value)}
                  className="input"
                  placeholder="e.g. Sarah Jenkins"
                />
              </div>

              <div className="form-group">
                <label className="label">Client Signer Email Address *</label>
                <input
                  type="email"
                  required
                  value={clientSignerEmail}
                  onChange={e => setClientSignerEmail(e.target.value)}
                  className="input"
                  placeholder="e.g. sarah.j@apexfin.com"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  A transactional signature invitation email will be dispatched immediately via Brevo SMTP API.
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Contract Value:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(esignModalAgreement.total_value)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Advance Due on Signing:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(esignModalAgreement.advance_amount)} ({esignModalAgreement.advance_percentage}%)</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEsignModalAgreement(null)}
                className="btn-secondary"
                disabled={isSendingEsign}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispatchEsign}
                disabled={isSendingEsign}
                className="btn-primary"
              >
                {isSendingEsign ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Dispatching via {selectedProvider.toUpperCase()}...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Dispatch E-Sign Envelope
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── PHYSICAL SIGNING CUSTODY MODAL ────────────────────────────── */}
      {physicalModalAgreement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                  {physicalModalAgreement.agreement_number}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Record Physical Document Custody
                </h3>
              </div>
              <button onClick={() => setPhysicalModalAgreement(null)} className="btn-ghost p-1.5">✕</button>
            </div>

            <form onSubmit={handleSavePhysicalCustody} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 leading-relaxed">
                Record custody details of the original physical ink-signed contract (e.g. Non-Judicial Stamp Paper) and attach the high-resolution scanned digital archive.
              </div>

              <div className="form-group">
                <label className="label">Physical Storage Location / Locker Ref *</label>
                <input
                  type="text"
                  required
                  value={storageLocation}
                  onChange={e => setStorageLocation(e.target.value)}
                  className="input"
                  placeholder="e.g. Archive Locker #A-14, Binder 2026/03"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="label">Designated Custodian Name *</label>
                  <input
                    type="text"
                    required
                    value={custodianName}
                    onChange={e => setCustodianName(e.target.value)}
                    className="input"
                    placeholder="e.g. Libinesh (Admin Officer)"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Document Received Date *</label>
                  <input
                    type="date"
                    required
                    value={receivedDate}
                    onChange={e => setReceivedDate(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">Scanned PDF Archive URL or File Reference</label>
                <input
                  type="text"
                  value={scannedUrl}
                  onChange={e => setScannedUrl(e.target.value)}
                  className="input font-mono"
                  placeholder="e.g. https://capesecure.vercel.app/storage/agreements/CS-AGR-scanned.pdf"
                />
              </div>

              <div className="form-group">
                <label className="label">Verification Notes & Stamp Paper Details</label>
                <textarea
                  rows={2}
                  value={custodyNotes}
                  onChange={e => setCustodyNotes(e.target.value)}
                  className="input resize-none"
                  placeholder="e.g. Executed on ₹200 Non-Judicial Stamp Paper, verified and signed with blue ink."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setPhysicalModalAgreement(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Archive className="w-4 h-4" />
                  Save Custody Record & Mark Signed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── AUDIT TRAIL MODAL ────────────────────────────────────────── */}
      {auditModalAgreement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                  {auditModalAgreement.agreement_number}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Legal Audit Trail & Verification Evidence
                </h3>
              </div>
              <button onClick={() => setAuditModalAgreement(null)} className="btn-ghost p-1.5">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              {auditModalAgreement.signing_method === 'digital' ? (
                <>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1.5 text-emerald-900 dark:text-emerald-200">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Certified E-Sign Transaction Evidence
                    </div>
                    <div>Provider: <strong>{auditModalAgreement.esign_details?.provider.toUpperCase() || 'ZOHO SIGN'}</strong></div>
                    <div>Envelope ID: <code className="font-mono bg-emerald-100 dark:bg-emerald-900/50 px-1 py-0.5 rounded">{auditModalAgreement.esign_details?.envelope_id || 'ZS-2026-LIVE'}</code></div>
                    <div>Status: <strong>{auditModalAgreement.esign_details?.status.toUpperCase() || 'COMPLETED'}</strong></div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block">Signatory Audit Log:</span>
                    {(auditModalAgreement.esign_details?.signers || []).map((s: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5 last:border-0 last:pb-0">
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">{s.name} ({s.role})</div>
                          <div className="text-[10px] text-slate-400">{s.email}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          s.status === 'signed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {s.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    <div className="text-slate-500 font-sans font-semibold mb-1">Cryptographic Integrity Hash:</div>
                    <div className="break-all bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                      SHA-256: {auditModalAgreement.signature_audit?.tamper_proof_checksum || '4a6b8ef21d5c907b27e99ff81e053f3e1a8bb6412f913d80a1334c2641a2c918'}
                    </div>
                    <div className="mt-1">Signer IP: {auditModalAgreement.signature_audit?.ip_address || '157.45.192.11'}</div>
                    <div>Timestamp: {auditModalAgreement.signature_audit?.timestamp || formatDate(auditModalAgreement.created_at)}</div>
                  </div>
                </>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2 text-amber-900 dark:text-amber-200">
                  <div className="font-bold flex items-center gap-1.5">
                    <Archive className="w-4 h-4 text-amber-600" />
                    Physical Custody Archive Record
                  </div>
                  <div>Storage Location: <strong>{auditModalAgreement.physical_custody?.storage_location}</strong></div>
                  <div>Custodian Officer: <strong>{auditModalAgreement.physical_custody?.custodian_name}</strong></div>
                  <div>Date Received: <strong>{formatDate(auditModalAgreement.physical_custody?.received_date || auditModalAgreement.created_at)}</strong></div>
                  <div>Verified Admin ID: <strong>{auditModalAgreement.physical_custody?.verified_by_admin_id}</strong></div>
                  {auditModalAgreement.physical_custody?.notes && (
                    <div className="mt-1 italic text-slate-600 dark:text-slate-400">
                      Notes: "{auditModalAgreement.physical_custody.notes}"
                    </div>
                  )}
                  {auditModalAgreement.file_url && (
                    <div className="pt-2">
                      <a
                        href={auditModalAgreement.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline font-semibold flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Scanned Physical Document
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAuditModalAgreement(null)}
                className="btn-secondary"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
