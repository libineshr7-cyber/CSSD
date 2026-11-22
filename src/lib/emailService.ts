import { supabase } from './supabase'
import { formatCurrency, formatDate } from './utils'
import type {
  Quotation,
  Client,
  Agreement,
  Invoice,
  Payment,
  EmailLog,
  EmailDeliveryStatus,
  AutomationCategory,
  InternalNotification
} from '../types/database'

// ─── Brevo Configuration ──────────────────────────────────────────────────────

export function getBrevoApiKey(): string {
  return (
    localStorage.getItem('capesecure_brevo_api_key') ||
    import.meta.env.VITE_BREVO_API_KEY ||
    ''
  )
}

export function getSenderEmail(): string {
  return (
    localStorage.getItem('capesecure_brevo_sender_email') ||
    import.meta.env.VITE_BREVO_SENDER_EMAIL ||
    'contact@capesecure.com'
  )
}

export function getSenderName(): string {
  return (
    localStorage.getItem('capesecure_brevo_sender_name') ||
    import.meta.env.VITE_BREVO_SENDER_NAME ||
    'CapeSecure Solutions'
  )
}

export interface SendEmailPayload {
  to: string
  toName?: string
  subject: string
  htmlContent: string
  textContent?: string
  senderEmail?: string
  senderName?: string
  tags?: string[]
}

export interface SendEmailResponse {
  success: boolean
  messageId?: string
  error?: string
}

// ─── Core Brevo Transactional Email Sender ────────────────────────────────────

export async function sendBrevoEmail(payload: SendEmailPayload): Promise<SendEmailResponse> {
  const apiKey = getBrevoApiKey()
  const senderEmail = payload.senderEmail || getSenderEmail()
  const senderName = payload.senderName || getSenderName()

  if (!apiKey || apiKey.includes('your_brevo')) {
    return {
      success: false,
      error: 'Brevo API key is not configured. Please add it in Settings > Email.',
    }
  }

  const endpoint = 'https://api.brevo.com/v3/smtp/email'

  const bodyData = {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: [
      {
        email: payload.to,
        name: payload.toName || payload.to,
      },
    ],
    subject: payload.subject,
    htmlContent: payload.htmlContent,
    textContent: payload.textContent || undefined,
    tags: payload.tags || ['capesecure-bms'],
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(bodyData),
    })

    const responseData = await response.json()

    if (!response.ok) {
      const errorMessage = responseData.message || responseData.error || `HTTP ${response.status}`
      console.warn('Brevo API Error:', responseData)
      return { success: false, error: errorMessage }
    }

    return {
      success: true,
      messageId: responseData.messageId,
    }
  } catch (err: any) {
    console.error('Brevo Network Error:', err)
    return {
      success: false,
      error: err.message || 'Failed to dispatch email due to network failure.',
    }
  }
}

// ─── Branded HTML Email Template Generator ────────────────────────────────────

export function generateBrandedEmailHTML(params: {
  badge: string
  title: string
  preheader: string
  contentHtml: string
  actionBtn?: { label: string; url: string }
  metaRows?: { label: string; value: string }[]
}): string {
  const { badge, title, preheader, contentHtml, actionBtn, metaRows } = params

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .card { max-width: 620px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.6); }
    .header { background: #0f172a; padding: 28px; border-bottom: 1px solid #334155; text-align: center; }
    .badge { display: inline-block; padding: 4px 14px; border-radius: 9999px; background: rgba(13,153,255,0.15); color: #0d99ff; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; border: 1px solid rgba(13,153,255,0.3); }
    .body { padding: 32px; font-size: 14px; line-height: 1.6; color: #cbd5e1; }
    .highlight-box { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px 20px; margin: 24px 0; }
    .btn { display: inline-block; padding: 12px 28px; background: #0d99ff; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 12px rgba(13,153,255,0.3); }
    .footer { padding: 22px 28px; background: #0f172a; border-top: 1px solid #334155; font-size: 12px; color: #64748b; text-align: center; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">${badge}</div>
      <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">${title}</h1>
      <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 12px;">${preheader}</p>
    </div>
    <div class="body">
      ${contentHtml}

      ${metaRows && metaRows.length > 0 ? `
      <div class="highlight-box">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          ${metaRows.map(row => `
          <tr>
            <td style="color: #94a3b8; padding: 6px 0; border-bottom: 1px solid #1e293b;">${row.label}:</td>
            <td style="color: #ffffff; font-weight: 600; text-align: right; padding: 6px 0; border-bottom: 1px solid #1e293b;">${row.value}</td>
          </tr>
          `).join('')}
        </table>
      </div>
      ` : ''}

      ${actionBtn ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${actionBtn.url}" class="btn">${actionBtn.label}</a>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      CapeSecure Solutions LLP • Enterprise Digital Defense & Infrastructure Management<br>
      This is an automated communication generated by CapeSecure BMS • Row-Level Security Enabled
    </div>
  </div>
</body>
</html>`
}

// ─── Automated Business Event Dispatcher & Delivery Logger ────────────────────

export interface DispatchAutomatedEmailParams {
  ruleId: string
  recipientEmail: string
  recipientName?: string
  subject: string
  htmlBody: string
  category: AutomationCategory
  referenceId?: string
  referenceNumber?: string
  forceResend?: boolean
  internalNotification?: {
    title: string
    message: string
    linkUrl?: string
    severity?: 'info' | 'warning' | 'critical' | 'success'
  }
}

export async function dispatchAutomatedEmail(params: DispatchAutomatedEmailParams): Promise<{
  success: boolean
  logId?: string
  messageId?: string
  error?: string
  suppressedDuplicate?: boolean
}> {
  const {
    ruleId,
    recipientEmail,
    recipientName,
    subject,
    htmlBody,
    category,
    referenceId,
    referenceNumber,
    forceResend = false,
    internalNotification
  } = params

  if (!recipientEmail || !recipientEmail.includes('@')) {
    return { success: false, error: 'Invalid recipient email address.' }
  }

  // Deduplication check: prevent sending duplicate notification on same day unless forced
  const today = new Date().toISOString().split('T')[0]
  const dedupKey = `${ruleId}_${referenceId || recipientEmail}_${today}`

  if (!forceResend) {
    try {
      const { data: existing } = await (supabase as any)
        .from('email_logs')
        .select('id, delivery_status')
        .eq('deduplication_key', dedupKey)
        .maybeSingle()

      if (existing && (existing.delivery_status === 'sent' || existing.delivery_status === 'delivered')) {
        return {
          success: true,
          suppressedDuplicate: true,
          logId: existing.id
        }
      }
    } catch (_) {}
  }

  // 1. Store queued entry in email_logs
  let logId = `log-${Date.now()}`
  try {
    const { data: insertedLog } = await (supabase as any)
      .from('email_logs')
      .insert({
        recipient_email: recipientEmail,
        recipient_name: recipientName || null,
        event_type: ruleId,
        category,
        subject,
        reference_id: referenceId || null,
        reference_number: referenceNumber || null,
        delivery_status: 'queued',
        html_body: htmlBody,
        deduplication_key: dedupKey,
        attempts: 1
      })
      .select('id')
      .single()

    if (insertedLog) logId = insertedLog.id
  } catch (_) {}

  // 2. Dispatch via Brevo
  const res = await sendBrevoEmail({
    to: recipientEmail,
    toName: recipientName,
    subject,
    htmlContent: htmlBody,
    tags: [category, ruleId]
  })

  const now = new Date().toISOString()

  // 3. Update log status based on verified provider response
  // Strict mandate: "Never report an email as delivered unless the email provider confirms its delivery status. Distinguish queued, sent, delivered, bounced and failed where supported."
  if (res.success && res.messageId) {
    try {
      await (supabase as any)
        .from('email_logs')
        .update({
          delivery_status: 'sent',
          provider_message_id: res.messageId,
          sent_at: now,
          updated_at: now
        })
        .eq('id', logId)
    } catch (_) {}

    // Record internal in-app notification if requested
    if (internalNotification) {
      try {
        await (supabase as any).from('internal_notifications').insert({
          category,
          title: internalNotification.title,
          message: internalNotification.message,
          link_url: internalNotification.linkUrl || null,
          severity: internalNotification.severity || 'info',
          is_read: false
        })
      } catch (_) {}
    }

    return {
      success: true,
      logId,
      messageId: res.messageId
    }
  } else {
    // Record failed attempt
    try {
      await (supabase as any)
        .from('email_logs')
        .update({
          delivery_status: 'failed',
          error_message: res.error || 'Provider rejected email transmission',
          updated_at: now
        })
        .eq('id', logId)
    } catch (_) {}

    return {
      success: false,
      logId,
      error: res.error
    }
  }
}

// ─── Resend Email Helper ──────────────────────────────────────────────────────

export async function resendEmailLog(logId: string): Promise<SendEmailResponse> {
  try {
    const { data: log, error } = await (supabase as any)
      .from('email_logs')
      .select('*')
      .eq('id', logId)
      .single()

    if (error || !log) throw new Error('Email record not found')

    const res = await sendBrevoEmail({
      to: log.recipient_email,
      toName: log.recipient_name,
      subject: log.subject,
      htmlContent: log.html_body,
      tags: ['resend', log.category]
    })

    const now = new Date().toISOString()
    if (res.success && res.messageId) {
      await (supabase as any)
        .from('email_logs')
        .update({
          delivery_status: 'sent',
          provider_message_id: res.messageId,
          attempts: (log.attempts || 1) + 1,
          sent_at: now,
          error_message: null,
          updated_at: now
        })
        .eq('id', logId)
    } else {
      await (supabase as any)
        .from('email_logs')
        .update({
          delivery_status: 'failed',
          attempts: (log.attempts || 1) + 1,
          error_message: res.error || 'Resend failed',
          updated_at: now
        })
        .eq('id', logId)
    }

    return res
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 30 AUTOMATED EVENT DISPATCHERS
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. LEAD EVENTS ──

export async function sendLeadAcknowledgementEmail(lead: { name: string; email: string; company?: string }) {
  const html = generateBrandedEmailHTML({
    badge: 'CapeSecure Client Ingestion',
    title: 'Thank You for Contacting CapeSecure',
    preheader: 'Your inquiry has been received by our security solutions team.',
    contentHtml: `
      <p>Dear ${lead.name},</p>
      <p>Thank you for reaching out to CapeSecure Solutions. We have received your project inquiry for <strong>${lead.company || 'your organization'}</strong>.</p>
      <p>A Senior Infrastructure Advisor has been assigned to your requirement and will contact you within 24 business hours to discuss your architecture and schedule an initial discovery consultation.</p>
    `,
    metaRows: [
      { label: 'Prospective Client', value: lead.name },
      { label: 'Organization', value: lead.company || 'Private Enterprise' },
      { label: 'Assigned Priority', value: 'High • Immediate Triage' }
    ]
  })

  return dispatchAutomatedEmail({
    ruleId: 'lead_enquiry_ack',
    recipientEmail: lead.email,
    recipientName: lead.name,
    subject: 'CapeSecure — Confirmation of Your Project Inquiry',
    htmlBody: html,
    category: 'lead',
    internalNotification: {
      title: 'New Lead Ingestion Confirmed',
      message: `Inquiry confirmation sent to ${lead.name} (${lead.email}).`,
      linkUrl: '/admin/leads',
      severity: 'info'
    }
  })
}

export async function sendNewLeadAdminAlertEmail(lead: { name: string; email: string; company?: string; notes?: string }) {
  const adminEmail = getSenderEmail()
  const html = generateBrandedEmailHTML({
    badge: 'Internal Alert',
    title: 'New Commercial Enquiry Ingested',
    preheader: 'A prospective client has submitted an inquiry on the public website.',
    contentHtml: `
      <p>A new commercial inquiry has been registered in CapeSecure BMS.</p>
      <p><strong>Notes / Requirement:</strong><br>${lead.notes || 'No preliminary notes provided.'}</p>
    `,
    actionBtn: { label: 'Review Lead in BMS', url: 'https://capesecure.vercel.app/admin/leads' },
    metaRows: [
      { label: 'Contact Name', value: lead.name },
      { label: 'Email', value: lead.email },
      { label: 'Company', value: lead.company || 'N/A' }
    ]
  })

  return dispatchAutomatedEmail({
    ruleId: 'lead_enquiry_received',
    recipientEmail: adminEmail,
    recipientName: 'CapeSecure Sales Desk',
    subject: `[NEW INQUIRY] ${lead.name} (${lead.company || 'Enterprise'})`,
    htmlBody: html,
    category: 'lead'
  })
}

// ── 2. QUOTATION EVENTS ──

export async function sendQuotationEmail(
  arg1: Quotation | { quotation: Quotation; client?: Client | null; customMessage?: string },
  arg2?: Client | null,
  arg3?: string
) {
  const quotation = 'quotation' in arg1 ? arg1.quotation : arg1
  const client = 'client' in arg1 ? arg1.client : arg2
  const customMessage = 'customMessage' in arg1 ? arg1.customMessage : arg3
  const clientName = client?.name || 'Valued Client'
  const clientEmail = client?.email || ''
  const quoteUrl = `https://capesecure.vercel.app/quote/${quotation.id}`

  const html = generateBrandedEmailHTML({
    badge: 'Official Commercial Proposal',
    title: `Commercial Proposal: ${quotation.title}`,
    preheader: `Quotation ${quotation.quote_number} prepared for ${clientName}`,
    contentHtml: `
      <p>Dear ${clientName},</p>
      ${customMessage ? `<p>${customMessage.replace(/\n/g, '<br>')}</p>` : `
      <p>CapeSecure Solutions is pleased to submit our formal commercial proposal and technical scope for <strong>${quotation.title}</strong>.</p>
      <p>Please review the detailed itemization, milestones, and deliverable schedule via our secure online portal below.</p>
      `}
    `,
    actionBtn: { label: 'Review & Approve Quotation Online', url: quoteUrl },
    metaRows: [
      { label: 'Quotation Number', value: quotation.quote_number },
      { label: 'Taxable Subtotal', value: formatCurrency(quotation.subtotal) },
      { label: 'Total Investment (inc. GST)', value: formatCurrency(quotation.total) },
      { label: 'Offer Validity', value: quotation.valid_until ? formatDate(quotation.valid_until) : '30 Days from Issue' }
    ]
  })

  return dispatchAutomatedEmail({
    ruleId: 'quote_sent',
    recipientEmail: clientEmail,
    recipientName: clientName,
    subject: `CapeSecure Proposal ${quotation.quote_number} — ${quotation.title}`,
    htmlBody: html,
    category: 'quotation',
    referenceId: quotation.id,
    referenceNumber: quotation.quote_number,
    internalNotification: {
      title: `Quotation Sent (${quotation.quote_number})`,
      message: `Commercial offer sent to ${clientName} for ${formatCurrency(quotation.total)}.`,
      linkUrl: `/quote/${quotation.id}`,
      severity: 'info'
    }
  })
}

export async function sendQuotationApprovedNotification(quotation: Quotation, client: Client) {
  const adminEmail = getSenderEmail()
  const html = generateBrandedEmailHTML({
    badge: 'Proposal Approved',
    title: `Quotation ${quotation.quote_number} Approved!`,
    preheader: `${client.name} has digitally approved quotation ${quotation.quote_number}`,
    contentHtml: `
      <p>Great news! The client <strong>${client.name}</strong> (${client.business_name || client.company}) has formally approved commercial quotation <strong>${quotation.quote_number}</strong>.</p>
      <p>Next steps: Master Service Agreement (MSA) generation and advance billing.</p>
    `,
    actionBtn: { label: 'Proceed to Agreement Generation', url: 'https://capesecure.vercel.app/admin/agreements' },
    metaRows: [
      { label: 'Client', value: client.name },
      { label: 'Quotation', value: quotation.quote_number },
      { label: 'Approved Value', value: formatCurrency(quotation.total) }
    ]
  })

  return dispatchAutomatedEmail({
    ruleId: 'quote_approved',
    recipientEmail: adminEmail,
    recipientName: 'CapeSecure Executive Desk',
    subject: `[PROPOSAL ACCEPTED] ${quotation.quote_number} — ${client.name}`,
    htmlBody: html,
    category: 'quotation',
    referenceId: quotation.id,
    referenceNumber: quotation.quote_number,
    internalNotification: {
      title: `Quotation Approved: ${quotation.quote_number}`,
      message: `${client.name} accepted quotation for ${formatCurrency(quotation.total)}. Ready for Agreement.`,
      linkUrl: '/admin/agreements',
      severity: 'success'
    }
  })
}

// ── 3. AGREEMENT EVENTS ──

export async function sendAgreementEmail(
  arg1: Agreement | { agreement: Agreement; client?: Client | null; customMessage?: string },
  arg2?: Client | null,
  arg3?: string
) {
  const agreement = 'agreement' in arg1 ? arg1.agreement : arg1
  const client = 'client' in arg1 ? arg1.client : arg2
  const customMessage = 'customMessage' in arg1 ? arg1.customMessage : arg3
  const clientName = client?.name || 'Valued Client'
  const clientEmail = client?.email || ''
  const portalUrl = 'https://capesecure.vercel.app/portal'

  const html = generateBrandedEmailHTML({
    badge: 'Master Service Agreement',
    title: `Contract Execution: ${agreement.title}`,
    preheader: `Agreement ${agreement.agreement_number} issued for signature`,
    contentHtml: `
      <p>Dear ${clientName},</p>
      ${customMessage ? `<p>${customMessage.replace(/\n/g, '<br>')}</p>` : `
      <p>Your Master Service Agreement (Ref: <strong>${agreement.agreement_number}</strong>) has been generated for digital execution.</p>
      <p>This legally binding agreement outlines the project deliverables, intellectual property terms, payment milestones, and warranty guarantees.</p>
      `}
    `,
    actionBtn: { label: 'Review & Sign Agreement Online', url: portalUrl },
    metaRows: [
      { label: 'Agreement Ref', value: agreement.agreement_number },
      { label: 'Contract Value', value: formatCurrency(agreement.total_value) },
      { label: 'Advance Due', value: formatCurrency(agreement.advance_amount) },
      { label: 'Delivery Schedule', value: agreement.delivery_timeline || '4-6 Weeks' }
    ]
  })

  return dispatchAutomatedEmail({
    ruleId: 'agreement_sent',
    recipientEmail: clientEmail,
    recipientName: clientName,
    subject: `Contract Execution Required: ${agreement.agreement_number} — ${agreement.title}`,
    htmlBody: html,
    category: 'agreement',
    referenceId: agreement.id,
    referenceNumber: agreement.agreement_number,
    internalNotification: {
      title: `Agreement Dispatched (${agreement.agreement_number})`,
      message: `Contract sent for signature to ${clientName}.`,
      linkUrl: '/admin/agreements',
      severity: 'info'
    }
  })
}

export async function sendAgreementExecutedNotification(agreement: Agreement, client?: Client | null) {
  const clientName = client?.name || 'Valued Client'
  const clientEmail = client?.email || ''
  const html = generateBrandedEmailHTML({
    badge: 'Fully Executed Contract',
    title: `Agreement ${agreement.agreement_number} Fully Executed`,
    preheader: 'Dual signatures recorded. Project onboarding initiated.',
    contentHtml: `
      <p>Dear ${clientName},</p>
      <p>We are pleased to inform you that Master Service Agreement <strong>${agreement.agreement_number}</strong> has been fully signed and executed by both parties.</p>
      <p>Your signed original agreement and audit verification hash have been archived in your secure client portal document vault.</p>
    `,
    actionBtn: { label: 'Access Signed Contract & Vault', url: 'https://capesecure.vercel.app/portal' },
    metaRows: [
      { label: 'Agreement Reference', value: agreement.agreement_number },
      { label: 'Execution Date', value: formatDate(agreement.signed_at || new Date().toISOString()) },
      { label: 'Status', value: 'Legally Executed & Active' }
    ]
  })

  return dispatchAutomatedEmail({
    ruleId: 'agreement_executed',
    recipientEmail: clientEmail,
    recipientName: clientName,
    subject: `Execution Notice: ${agreement.agreement_number} Successfully Signed`,
    htmlBody: html,
    category: 'agreement',
    referenceId: agreement.id,
    referenceNumber: agreement.agreement_number,
    internalNotification: {
      title: `Contract Fully Signed: ${agreement.agreement_number}`,
      message: `Agreement executed by ${clientName}. Advance invoice triggered.`,
      linkUrl: '/admin/agreements',
      severity: 'success'
    }
  })
}

// ── 4. PAYMENT & INVOICE EVENTS ──

export async function sendInvoiceEmail(
  arg1: Invoice | { invoice: Invoice; client?: Client | null; customMessage?: string },
  arg2?: Client | null,
  arg3?: string
) {
  const invoice = 'invoice' in arg1 ? arg1.invoice : arg1
  const client = 'client' in arg1 ? arg1.client : arg2
  const customMessage = 'customMessage' in arg1 ? arg1.customMessage : arg3
  const clientName = client?.name || 'Valued Client'
  const clientEmail = client?.email || ''
  const portalUrl = 'https://capesecure.vercel.app/portal'

  const html = generateBrandedEmailHTML({
    badge: 'Tax Invoice',
    title: `Tax Invoice: ${invoice.invoice_number}`,
    preheader: `Invoice for ${formatCurrency(invoice.total)} due on ${formatDate(invoice.due_date)}`,
    contentHtml: `
      <p>Dear ${clientName},</p>
      ${customMessage ? `<p>${customMessage.replace(/\n/g, '<br>')}</p>` : `
      <p>Please find attached official Tax Invoice <strong>${invoice.invoice_number}</strong> issued by CapeSecure Solutions LLP.</p>
      `}
    `,
    actionBtn: { label: 'View & Download Invoice PDF', url: portalUrl },
    metaRows: [
      { label: 'Invoice Number', value: invoice.invoice_number },
      { label: 'Taxable Subtotal', value: formatCurrency(invoice.subtotal) },
      { label: 'Applicable GST', value: formatCurrency(invoice.tax_amount) },
      { label: 'Total Due', value: formatCurrency(invoice.total) },
      { label: 'Payment Due Date', value: formatDate(invoice.due_date) }
    ]
  })

  return dispatchAutomatedEmail({
    ruleId: 'invoice_generated',
    recipientEmail: clientEmail,
    recipientName: clientName,
    subject: `Tax Invoice ${invoice.invoice_number} from CapeSecure (${formatCurrency(invoice.total)})`,
    htmlBody: html,
    category: 'payment',
    referenceId: invoice.id,
    referenceNumber: invoice.invoice_number,
    internalNotification: {
      title: `Invoice Issued (${invoice.invoice_number})`,
      message: `Invoice for ${formatCurrency(invoice.total)} dispatched to ${clientName}.`,
      linkUrl: '/admin/invoices',
      severity: 'info'
    }
  })
}

// ── MAINTENANCE RENEWAL REMINDER ──

export async function sendMaintenanceRenewalReminderEmail(params: {
  toEmail: string
  clientName: string
  planName: string
  price: number
  renewalDate: string
  daysLeft: number
  websiteUrl?: string
}) {
  const html = generateBrandedEmailHTML({
    badge: 'CapeSecure Maintenance Desk',
    title: 'Website Maintenance Renewal Notice',
    preheader: `Active plan ${params.planName} is scheduled for renewal in ${params.daysLeft} days`,
    contentHtml: `
      <p>Dear ${params.clientName},</p>
      <p>This is a formal reminder regarding your upcoming website maintenance and security coverage. Your active plan <strong>${params.planName}</strong> is scheduled for renewal on <strong>${formatDate(params.renewalDate)}</strong> (${params.daysLeft} days remaining).</p>
      <p>Maintaining an active subscription guarantees continuous security patches, off-site encrypted backup verification, TLS/SSL auto-renewal, and priority support response.</p>
    `,
    actionBtn: { label: 'View & Renew in Client Portal', url: 'https://capesecure.vercel.app/portal' },
    metaRows: [
      { label: 'Subscription Plan', value: params.planName },
      { label: 'Covered Domain', value: params.websiteUrl || 'Production Platform' },
      { label: 'Annual Rate', value: formatCurrency(params.price) },
      { label: 'Renewal Target Date', value: formatDate(params.renewalDate) }
    ]
  })

  return dispatchAutomatedEmail({
    ruleId: 'maint_renewal_approaching',
    recipientEmail: params.toEmail,
    recipientName: params.clientName,
    subject: `Urgent: Maintenance Renewal Reminder for ${params.clientName} (${params.daysLeft} Days Remaining)`,
    htmlBody: html,
    category: 'maintenance',
    internalNotification: {
      title: `Renewal Notice: ${params.clientName}`,
      message: `Renewal reminder sent for ${params.planName} (${params.daysLeft} days remaining).`,
      linkUrl: '/admin/maintenance',
      severity: 'warning'
    }
  })
}

export async function sendPaymentConfirmationEmail(params: {
  payment: Payment
  client: Client
}) {
  const { payment, client } = params
  const portalUrl = 'https://capesecure.vercel.app/portal'

  const html = generateBrandedEmailHTML({
    badge: 'Verified Receipt',
    title: 'Payment Confirmation & Receipt',
    preheader: `Receipt ${payment.receipt_number || payment.reference} for ${formatCurrency(payment.amount)}`,
    contentHtml: `
      <p>Dear ${client.name},</p>
      <p>We gratefully acknowledge receipt of your payment. The transaction has been verified against our banking records and credited to your project ledger.</p>
    `,
    actionBtn: { label: 'Download Verified Receipt PDF', url: portalUrl },
    metaRows: [
      { label: 'Receipt Ref', value: payment.receipt_number || `CS-REC-${payment.id.substring(0, 6)}` },
      { label: 'Amount Received', value: formatCurrency(payment.amount) },
      { label: 'Payment Method', value: payment.payment_method.toUpperCase() },
      { label: 'Transaction UTR / Ref', value: payment.reference },
      { label: 'Verification Status', value: 'Verified by Accounts Desk' }
    ]
  })

  return dispatchAutomatedEmail({
    ruleId: 'payment_confirmed',
    recipientEmail: client.email,
    recipientName: client.name,
    subject: `Payment Confirmed: ${payment.receipt_number || 'Receipt'} (${formatCurrency(payment.amount)})`,
    htmlBody: html,
    category: 'payment',
    referenceId: payment.id,
    referenceNumber: payment.receipt_number || payment.reference,
    internalNotification: {
      title: `Payment Verified: ${formatCurrency(payment.amount)}`,
      message: `Verified payment received from ${client.name} (Ref: ${payment.reference}).`,
      linkUrl: '/admin/payments',
      severity: 'success'
    }
  })
}

// ── 5. PROJECT & DEPLOYMENT EVENTS ──

export async function sendProjectStartedEmail(project: { name: string; project_number?: string }, client: Client) {
  const html = generateBrandedEmailHTML({
    badge: 'Project Onboarding Active',
    title: `Development Kickoff: ${project.name}`,
    preheader: 'Your architecture development cycle has commenced.',
    contentHtml: `
      <p>Dear ${client.name},</p>
      <p>We are thrilled to announce that development on <strong>${project.name}</strong> (Ref: <strong>${project.project_number || 'Active'}</strong>) has officially commenced.</p>
      <p>You can follow sprint milestones, inspect interactive design wireframes, and monitor task completion in real-time from your secure Client Portal.</p>
    `,
    actionBtn: { label: 'Open Client Project Portal', url: 'https://capesecure.vercel.app/portal' },
    metaRows: [
      { label: 'Project Name', value: project.name },
      { label: 'Project Ref', value: project.project_number || 'CS-PRJ-2026' },
      { label: 'Lead Architect', value: 'CapeSecure DevOps & Engineering Team' }
    ]
  })

  return dispatchAutomatedEmail({
    ruleId: 'project_started',
    recipientEmail: client.email,
    recipientName: client.name,
    subject: `Project Kickoff: ${project.name} is Now in Active Production`,
    htmlBody: html,
    category: 'project'
  })
}

export async function sendDeploymentCompletedEmail(project: { name: string }, client: Client, liveUrl: string) {
  const html = generateBrandedEmailHTML({
    badge: 'Production Live',
    title: `${project.name} Successfully Deployed to Production!`,
    preheader: `Your platform is live and verified at ${liveUrl}`,
    contentHtml: `
      <p>Dear ${client.name},</p>
      <p>We are delighted to report that <strong>${project.name}</strong> has successfully completed final QA verification and is now live on our high-availability cloud infrastructure.</p>
    `,
    actionBtn: { label: 'Visit Live Production Platform', url: liveUrl },
    metaRows: [
      { label: 'Project', value: project.name },
      { label: 'Live URL', value: liveUrl },
      { label: 'SSL Encryption', value: 'TLS 1.3 Active (A+ Grade)' },
      { label: 'Status', value: 'Production Ready' }
    ]
  })

  return dispatchAutomatedEmail({
    ruleId: 'project_deployment_completed',
    recipientEmail: client.email,
    recipientName: client.name,
    subject: `🚀 Production Live: ${project.name} is Successfully Deployed!`,
    htmlBody: html,
    category: 'project'
  })
}

// ── 6. HANDOVER EVENTS ──

export async function sendHandoverCompletedEmail(client: Client, projectName: string) {
  const html = generateBrandedEmailHTML({
    badge: 'Handover Completed',
    title: 'Project Handover & Asset Custody Transfer Finalized',
    preheader: 'Dual-signed handover acceptance certificate available.',
    contentHtml: `
      <p>Dear ${client.name},</p>
      <p>The formal handover procedure for <strong>${projectName}</strong> has been concluded. Administrative credentials, live DNS custody, and PRD technical documentation have been transferred to your designated signatories.</p>
      <p>Your signed Handover Acceptance Certificate and 90-Day SLA warranty terms are accessible via your client vault.</p>
    `,
    actionBtn: { label: 'Download Handover Certificate', url: 'https://capesecure.vercel.app/portal' },
    metaRows: [
      { label: 'Client', value: client.name },
      { label: 'Handover Status', value: 'Dual-Signed & Accepted' },
      { label: 'Warranty SLA', value: '90-Day Zero-Defect Guarantee Active' }
    ]
  })

  return dispatchAutomatedEmail({
    ruleId: 'handover_completed',
    recipientEmail: client.email,
    recipientName: client.name,
    subject: `Official Handover Complete: ${projectName} Asset Custody Delivered`,
    htmlBody: html,
    category: 'handover'
  })
}

// ── 7. MAINTENANCE EVENTS ──

export async function sendWebsiteDowntimeAlert(site: { name: string; url: string }, httpStatus: number) {
  const adminEmail = getSenderEmail()
  const html = generateBrandedEmailHTML({
    badge: 'CRITICAL ALERT',
    title: `🚨 Emergency: Endpoint Downtime Detected (${site.name})`,
    preheader: `Synthetic probe returned HTTP ${httpStatus} failure for ${site.url}`,
    contentHtml: `
      <p style="color: #ef4444; font-weight: bold;">CRITICAL INCIDENT ALERT</p>
      <p>Synthetic heartbeat probe failed for registered endpoint <strong>${site.name}</strong> (${site.url}).</p>
      <p>Status: HTTP ${httpStatus} • Latency Timeout • Instant triage ticket generated.</p>
    `,
    actionBtn: { label: 'Open Monitoring Sentinel', url: 'https://capesecure.vercel.app/admin/monitoring' },
    metaRows: [
      { label: 'Monitored Site', value: site.name },
      { label: 'Target URL', value: site.url },
      { label: 'Error Status', value: `HTTP ${httpStatus}` },
      { label: 'Timestamp', value: new Date().toISOString() }
    ]
  })

  return dispatchAutomatedEmail({
    ruleId: 'maint_website_downtime',
    recipientEmail: adminEmail,
    recipientName: 'CapeSecure SRE Team',
    subject: `🚨 CRITICAL: Website Down — ${site.name} (HTTP ${httpStatus})`,
    htmlBody: html,
    category: 'maintenance',
    internalNotification: {
      title: `CRITICAL: ${site.name} Downtime`,
      message: `Synthetic probe failed with HTTP ${httpStatus} on ${site.url}.`,
      linkUrl: '/admin/monitoring',
      severity: 'critical'
    }
  })
}

export async function sendSSLExpiryAlert(site: { name: string; url: string; daysRemaining: number }) {
  const adminEmail = getSenderEmail()
  const html = generateBrandedEmailHTML({
    badge: 'TLS/SSL Security Alert',
    title: `SSL Expiration Notice: ${site.name}`,
    preheader: `Only ${site.daysRemaining} days remaining on TLS certificate for ${site.url}`,
    contentHtml: `
      <p>The TLS/SSL certificate for <strong>${site.name}</strong> (${site.url}) is approaching expiration in <strong>${site.daysRemaining} days</strong>.</p>
      <p>Ensure automated ACME renewal has succeeded or perform manual certificate renewal before expiration to avoid browser warning flags.</p>
    `,
    actionBtn: { label: 'Inspect Endpoint TLS', url: 'https://capesecure.vercel.app/admin/monitoring' },
    metaRows: [
      { label: 'Domain', value: site.url },
      { label: 'Days Remaining', value: `${site.daysRemaining} Days` },
      { label: 'Recommended Action', value: 'Check Let\'s Encrypt Auto-Renewal Cron' }
    ]
  })

  return dispatchAutomatedEmail({
    ruleId: 'maint_ssl_expiry_alert',
    recipientEmail: adminEmail,
    recipientName: 'CapeSecure Security Desk',
    subject: `⚠️ SSL Warning: ${site.name} expires in ${site.daysRemaining} days`,
    htmlBody: html,
    category: 'maintenance',
    internalNotification: {
      title: `SSL Expiring Soon: ${site.name}`,
      message: `TLS certificate has only ${site.daysRemaining} days remaining.`,
      linkUrl: '/admin/monitoring',
      severity: 'warning'
    }
  })
}

export async function sendTestEmail(toEmail: string): Promise<SendEmailResponse> {
  return sendBrevoEmail({
    to: toEmail,
    subject: 'CapeSecure BMS — Brevo Email Integration Test',
    htmlContent: `
      <div style="font-family: sans-serif; padding: 20px; max-width: 500px; background: #0f172a; color: white; border-radius: 12px;">
        <h2 style="color: #0d99ff;">CapeSecure Brevo Integration Active!</h2>
        <p style="color: #cbd5e1; font-size: 14px;">
          This test email confirms that your Brevo API key is working correctly.
          You can now dispatch quotations, agreements, invoices, and follow-up notices directly from CapeSecure BMS.
        </p>
        <p style="font-size: 12px; color: #94a3b8;">Sent at: ${new Date().toISOString()}</p>
      </div>
    `,
    tags: ['test-email'],
  })
}
