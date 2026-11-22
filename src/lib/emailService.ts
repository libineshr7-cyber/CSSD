import { supabase } from './supabase'
import { formatCurrency, formatDate } from './utils'
import type { Quotation, Client, Agreement, Invoice } from '../types/database'

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

    // Log email action in Supabase audit_logs
    try {
      await (supabase as any).from('audit_logs').insert({
        action: 'EMAIL_SENT_BREVO',
        resource_type: 'email',
        resource_id: responseData.messageId || null,
        metadata: {
          recipient: payload.to,
          subject: payload.subject,
          sender: senderEmail,
          messageId: responseData.messageId,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (_) {}

    return {
      success: true,
      messageId: responseData.messageId,
    }
  } catch (err: any) {
    console.error('Brevo network or CORS error:', err)
    return {
      success: false,
      error: err.message || 'Network error while contacting Brevo API.',
    }
  }
}

// ─── Transactional Templates ──────────────────────────────────────────────────

/**
 * Send Commercial Quotation Email with Branded Layout & Action Link
 */
export async function sendQuotationEmail(
  quote: Quotation,
  client?: Client | null,
  customMessage?: string
): Promise<SendEmailResponse> {
  const recipientEmail = client?.email || quote.email_sent_to || 'client@example.com'
  const recipientName = client?.name || 'Valued Client'
  const quoteUrl = `${window.location.origin}/quote/${quote.id}`

  const advancePct = quote.advance_percentage ?? 50
  const advanceAmt = quote.advance_amount ?? (quote.total * (advancePct / 100))

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    .header { background: #0f172a; padding: 24px; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .header h1 span { color: #0d99ff; }
    .body { padding: 24px; }
    .quote-box { background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .btn { display: inline-block; padding: 12px 24px; background: #0d99ff; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 13px; margin: 16px 0; }
    .footer { text-align: center; font-size: 11px; color: #94a3b8; padding: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>CAPE<span>SECURE</span></h1>
      <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Commercial Proposal • ${quote.quote_number}</div>
    </div>
    <div class="body">
      <p>Dear ${recipientName},</p>
      ${customMessage ? `<p>${customMessage.replace(/\n/g, '<br>')}</p>` : `
      <p>Please find attached the official commercial quotation for <strong>${quote.title}</strong>.</p>
      `}

      <div class="quote-box">
        <table style="width: 100%; font-size: 13px;">
          <tr>
            <td style="color: #64748b;">Quotation Reference:</td>
            <td style="text-align: right; font-weight: 700;">${quote.quote_number}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Total Proposal Value:</td>
            <td style="text-align: right; font-weight: 800; color: #0d99ff;">${formatCurrency(quote.total)}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Advance Deposit Required (${advancePct}%):</td>
            <td style="text-align: right; font-weight: 700;">${formatCurrency(advanceAmt)}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Estimated Delivery Timeline:</td>
            <td style="text-align: right;">${quote.delivery_timeline || '4–6 Weeks'}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Valid Until:</td>
            <td style="text-align: right;">${quote.valid_until ? formatDate(quote.valid_until) : '30 Days from issue'}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center;">
        <a href="${quoteUrl}" class="btn">View & Officially Approve Quotation</a>
      </div>

      <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
        You can also download the formal PDF or submit questions and scope adjustments directly via the secure portal link above.
      </p>

      <p style="margin-top: 30px;">
        Warm regards,<br>
        <strong>CapeSecure Solutions Team</strong><br>
        <span style="font-size: 11px; color: #64748b;">Enterprise Web Architecture & Security • https://capesecure.vercel.app</span>
      </p>
    </div>
    <div class="footer">
      CapeSecure BMS • Sent via Brevo Transactional Email Engine
    </div>
  </div>
</body>
</html>`

  return sendBrevoEmail({
    to: recipientEmail,
    toName: recipientName,
    subject: `Quotation ${quote.quote_number}: ${quote.title} — CapeSecure Solutions`,
    htmlContent: html,
    tags: ['quotation', 'commercial-proposal'],
  })
}

/**
 * Send Service Agreement Signing Link Email
 */
export async function sendAgreementEmail(
  agreement: Agreement,
  client?: Client | null,
  customMessage?: string
): Promise<SendEmailResponse> {
  const recipientEmail = client?.email || 'client@example.com'
  const recipientName = client?.name || 'Valued Client'
  const agreementUrl = `${window.location.origin}/agreement/${agreement.id}`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    .header { background: #0f172a; padding: 24px; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; }
    .header h1 span { color: #0d99ff; }
    .body { padding: 24px; }
    .btn { display: inline-block; padding: 12px 24px; background: #10b981; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 13px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>CAPE<span>SECURE</span></h1>
      <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Service Agreement Ready for Execution • ${agreement.agreement_number}</div>
    </div>
    <div class="body">
      <p>Dear ${recipientName},</p>
      ${customMessage ? `<p>${customMessage.replace(/\n/g, '<br>')}</p>` : `
      <p>Your CapeSecure Service Agreement for <strong>${agreement.title}</strong> is prepared and ready for digital signing.</p>
      `}
      <div style="text-align: center;">
        <a href="${agreementUrl}" class="btn">Review & Sign Agreement</a>
      </div>
      <p style="font-size: 12px; color: #64748b;">Total Value: ${formatCurrency(agreement.total_value)} • Advance: ${formatCurrency(agreement.advance_amount)}</p>
    </div>
  </div>
</body>
</html>`

  return sendBrevoEmail({
    to: recipientEmail,
    toName: recipientName,
    subject: `Service Agreement ${agreement.agreement_number}: ${agreement.title} — CapeSecure`,
    htmlContent: html,
    tags: ['agreement', 'e-sign'],
  })
}

/**
 * Send Invoice Email
 */
export async function sendInvoiceEmail(
  invoice: Invoice,
  client?: Client | null,
  customMessage?: string
): Promise<SendEmailResponse> {
  const recipientEmail = client?.email || 'client@example.com'
  const recipientName = client?.name || 'Valued Client'
  const invoiceUrl = `${window.location.origin}/invoice/${invoice.id}`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    .header { background: #0f172a; padding: 24px; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; }
    .header h1 span { color: #0d99ff; }
    .body { padding: 24px; }
    .btn { display: inline-block; padding: 12px 24px; background: #0d99ff; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 13px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>CAPE<span>SECURE</span></h1>
      <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Invoice ${invoice.invoice_number}</div>
    </div>
    <div class="body">
      <p>Dear ${recipientName},</p>
      ${customMessage ? `<p>${customMessage.replace(/\n/g, '<br>')}</p>` : `
      <p>Please find attached Invoice <strong>${invoice.invoice_number}</strong> for the amount of <strong>${formatCurrency(invoice.total)}</strong>.</p>
      `}
      <div style="text-align: center;">
        <a href="${invoiceUrl}" class="btn">View & Pay Invoice</a>
      </div>
      <p style="font-size: 12px; color: #64748b;">Due Date: ${formatDate(invoice.due_date)}</p>
    </div>
  </div>
</body>
</html>`

  return sendBrevoEmail({
    to: recipientEmail,
    toName: recipientName,
    subject: `Invoice ${invoice.invoice_number} from CapeSecure Solutions (${formatCurrency(invoice.total)})`,
    htmlContent: html,
    tags: ['invoice', 'billing'],
  })
}

/**
 * Send Live Test Email to verify Brevo API Key
 */
export async function sendTestEmail(toEmail: string): Promise<SendEmailResponse> {
  return sendBrevoEmail({
    to: toEmail,
    subject: 'CapeSecure BMS — Brevo Email Integration Test',
    htmlContent: `
      <div style="font-family: sans-serif; padding: 20px; max-width: 500px;">
        <h2 style="color: #0f172a;">CapeSecure Brevo Integration Active!</h2>
        <p style="color: #475569; font-size: 14px;">
          This test email confirms that your Brevo API key is working correctly.
          You can now dispatch quotations, agreements, invoices, and follow-up notices directly from CapeSecure BMS.
        </p>
        <p style="font-size: 12px; color: #94a3b8;">Sent at: ${new Date().toISOString()}</p>
      </div>
    `,
    tags: ['test-email'],
  })
}

/**
 * Send Maintenance Subscription Renewal Reminder Email
 */
export async function sendMaintenanceRenewalReminderEmail(params: {
  toEmail: string
  clientName: string
  planName: string
  price: number
  renewalDate: string
  daysLeft: number
  websiteUrl?: string
}): Promise<SendEmailResponse> {
  const { toEmail, clientName, planName, price, renewalDate, daysLeft, websiteUrl } = params

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { background: #0f172a; padding: 28px; border-bottom: 1px solid #334155; text-align: center; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; background: rgba(13,153,255,0.15); color: #0d99ff; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
    .body { padding: 28px; font-size: 14px; line-height: 1.6; color: #cbd5e1; }
    .highlight-box { background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 18px; margin: 20px 0; }
    .btn { display: inline-block; padding: 12px 28px; background: #0d99ff; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; }
    .footer { padding: 20px 28px; background: #0f172a; border-top: 1px solid #334155; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">CapeSecure Maintenance Desk</div>
      <h1 style="margin: 0; color: #ffffff; font-size: 22px;">Website Maintenance Renewal Notice</h1>
    </div>
    <div class="body">
      <p>Dear ${clientName},</p>
      <p>This is a formal reminder regarding your upcoming website maintenance and security coverage. Your active plan <strong>${planName}</strong> is scheduled for renewal in <strong>${daysLeft} days</strong> (Renewal Date: <strong>${formatDate(renewalDate)}</strong>).</p>
      
      <div class="highlight-box">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="color: #94a3b8; padding: 6px 0;">Subscription Plan:</td>
            <td style="color: #ffffff; font-weight: 600; text-align: right;">${planName}</td>
          </tr>
          ${websiteUrl ? `
          <tr>
            <td style="color: #94a3b8; padding: 6px 0;">Covered Domain:</td>
            <td style="color: #0d99ff; font-weight: 600; text-align: right;">${websiteUrl}</td>
          </tr>` : ''}
          <tr>
            <td style="color: #94a3b8; padding: 6px 0;">Annual Investment:</td>
            <td style="color: #0acf83; font-weight: 700; text-align: right;">${formatCurrency(price)}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 6px 0;">SLA Protection:</td>
            <td style="color: #ffffff; text-align: right;">99.5%+ Uptime & Defect Warranty</td>
          </tr>
        </table>
      </div>

      <p>Maintaining an active subscription guarantees uninterrupted weekly security patches, off-site encrypted backup verification, TLS/SSL auto-renewal, and immediate priority support response.</p>
      
      <div style="text-align: center; margin: 28px 0;">
        <a href="https://capesecure.vercel.app/portal" class="btn">View & Renew Subscription in Client Portal</a>
      </div>

      <p style="font-size: 12px; color: #94a3b8;">Note: As per CapeSecure compliance policy, no automatic card charges will occur without an authorized mandate.</p>
    </div>
    <div class="footer">
      CapeSecure Solutions LLP • Enterprise Infrastructure & Security Management<br>
      For billing inquiries: billing@capesecure.com
    </div>
  </div>
</body>
</html>`

  return sendBrevoEmail({
    to: toEmail,
    toName: clientName,
    subject: `Urgent: Maintenance Renewal Reminder for ${clientName} (${daysLeft} Days Remaining)`,
    htmlContent: html,
    tags: ['maintenance', 'renewal-reminder'],
  })
}

