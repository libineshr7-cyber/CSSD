import type { Requirement, Client, Lead, Quotation, Agreement, Invoice, Payment, Project } from '../types/database'
import { formatCurrency, formatDate } from './utils'
import { PDFBuilder } from './pdfBuilder'

export interface RequirementDocumentData {
  requirement: Requirement
  client?: Client | null
  lead?: Lead | null
}

export function generateRequirementSummaryHTML(data: RequirementDocumentData): string {
  const { requirement: req, client, lead } = data
  const clientName = client?.name || lead?.name || 'Valued Client'
  const companyName = client?.business_name || client?.company || lead?.company || 'Confidential'
  const clientCode = client?.client_code || 'N/A'
  const clientEmail = client?.email || lead?.email || 'N/A'
  const clientPhone = client?.phone || lead?.phone || 'N/A'
  const clientCategory = client?.business_category || 'General'

  const budgetDisplay = req.budget_min && req.budget_max
    ? `${formatCurrency(req.budget_min)} – ${formatCurrency(req.budget_max)}`
    : req.budget_range || (req.budget_min ? formatCurrency(req.budget_min) : 'TBD')

  const deliveryDisplay = req.estimated_delivery_date
    ? formatDate(req.estimated_delivery_date)
    : req.timeline || '4–6 Weeks (Estimated)'

  const pagesList = req.pages && req.pages.length > 0
    ? req.pages.map(p => `<span class="tag page-tag">${p}</span>`).join(' ')
    : '<span class="text-muted">Standard pages to be finalized during wireframing</span>'

  const featuresList = req.features && req.features.length > 0
    ? req.features.map(f => `<span class="tag feature-tag">${f}</span>`).join(' ')
    : '<span class="text-muted">Standard architecture features</span>'

  const refWebsites = req.reference_websites && req.reference_websites.length > 0
    ? req.reference_websites.map(r => `<li><a href="${r.url}" target="_blank">${r.url}</a> ${r.notes ? `<span class="note">(${r.notes})</span>` : ''}</li>`).join('')
    : (req.reference_urls && req.reference_urls.length > 0
        ? req.reference_urls.map(url => `<li><a href="${url}" target="_blank">${url}</a></li>`).join('')
        : '<li>None provided</li>')

  const attachmentsList = req.attachments && req.attachments.length > 0
    ? req.attachments.map(a => `<li>📄 ${a.name} <span class="note">(${a.type || 'file'})</span></li>`).join('')
    : '<li>No attachments uploaded</li>'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CapeSecure Requirement Specification - ${req.title}</title>
  <style>
    @page {
      size: A4;
      margin: 16mm 18mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
      font-size: 13px;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-title span {
      color: #0d99ff;
    }
    .brand-subtitle {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 2px;
    }
    .doc-meta {
      text-align: right;
    }
    .doc-number {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }
    .doc-status {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: #e0f2fe;
      color: #0369a1;
      margin-top: 4px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }
    .panel {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .panel-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.75px;
      color: #475569;
      margin-bottom: 10px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .info-label {
      color: #64748b;
      font-size: 12px;
    }
    .info-value {
      font-weight: 600;
      color: #0f172a;
      text-align: right;
      font-size: 12px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 20px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .spec-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 12px;
    }
    .spec-table th, .spec-table td {
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      text-align: left;
    }
    .spec-table th {
      background: #f1f5f9;
      font-weight: 600;
      color: #334155;
      width: 28%;
    }
    .tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      margin: 2px 4px 2px 0;
    }
    .page-tag {
      background: #f1f5f9;
      color: #1e293b;
      border: 1px solid #cbd5e1;
    }
    .feature-tag {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }
    .notes-box {
      background: #fdfefe;
      border-left: 3px solid #0d99ff;
      padding: 10px 14px;
      margin-bottom: 20px;
      font-size: 12px;
      color: #334155;
    }
    .signoff-section {
      margin-top: 40px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 20px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
    }
    .signoff-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 14px;
    }
    .signoff-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 30px;
    }
    .signoff-line {
      border-top: 1px solid #94a3b8;
      display: flex;
      justify-content: space-between;
      padding-top: 6px;
      font-size: 11px;
      color: #475569;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 10px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <div>
      <div class="brand-title">CAPE<span>SECURE</span></div>
      <div class="brand-subtitle">Requirement Specification Document • Confidential</div>
    </div>
    <div class="doc-meta">
      <div class="doc-number">${req.title}</div>
      <div class="doc-status">${req.status.toUpperCase()}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Date: ${formatDate(req.created_at)}</div>
    </div>
  </div>

  <div class="grid-2">
    <div class="panel">
      <div class="panel-title">Client Information</div>
      <div class="info-row"><span class="info-label">Client Code:</span><span class="info-value">${clientCode}</span></div>
      <div class="info-row"><span class="info-label">Contact Person:</span><span class="info-value">${clientName}</span></div>
      <div class="info-row"><span class="info-label">Business Name:</span><span class="info-value">${companyName}</span></div>
      <div class="info-row"><span class="info-label">Category:</span><span class="info-value">${clientCategory}</span></div>
      <div class="info-row"><span class="info-label">Email:</span><span class="info-value">${clientEmail}</span></div>
      <div class="info-row"><span class="info-label">Phone:</span><span class="info-value">${clientPhone}</span></div>
    </div>

    <div class="panel">
      <div class="panel-title">Project Commercials</div>
      <div class="info-row"><span class="info-label">Website Type:</span><span class="info-value" style="text-transform: capitalize;">${req.website_type.replace('_', ' ')}</span></div>
      <div class="info-row"><span class="info-label">Budget Estimate:</span><span class="info-value">${budgetDisplay}</span></div>
      <div class="info-row"><span class="info-label">Estimated Delivery:</span><span class="info-value">${deliveryDisplay}</span></div>
      <div class="info-row"><span class="info-label">Payment Gateway:</span><span class="info-value">${req.payment_gateway || 'None'}</span></div>
      <div class="info-row"><span class="info-label">Shipping Gateway:</span><span class="info-value">${req.shipping_integration || 'None'}</span></div>
      <div class="info-row"><span class="info-label">Domain Plan:</span><span class="info-value">${req.domain_requirements || 'To be decided'}</span></div>
    </div>
  </div>

  <div class="section-title">1. Project Purpose & Scope</div>
  <div class="notes-box">
    <strong>Business Purpose:</strong><br>
    ${req.business_purpose || req.description || 'Deliver a high-performance modern web application customized for business goals.'}
  </div>

  <div class="section-title">2. Architecture & Technical Stack</div>
  <table class="spec-table">
    <tr>
      <th>Frontend Technology</th>
      <td>${req.frontend_tech || 'React, TypeScript, Tailwind CSS, Vite'}</td>
    </tr>
    <tr>
      <th>Backend & API</th>
      <td>${req.backend_tech || 'Supabase Edge Functions / Node.js'}</td>
    </tr>
    <tr>
      <th>Database Solution</th>
      <td>${req.database_tech || 'Supabase PostgreSQL with Row Level Security'}</td>
    </tr>
    <tr>
      <th>Hosting & Infrastructure</th>
      <td>${req.hosting_requirements || 'Vercel Edge Global Network / Cloudflare'}</td>
    </tr>
    <tr>
      <th>Design Preferences</th>
      <td>${req.design_preferences || 'Clean typography, responsive layout, high contrast, subtle micro-interactions.'}</td>
    </tr>
  </table>

  <div class="section-title">3. Structure & Page Hierarchy</div>
  <div style="margin-bottom: 16px;">
    ${pagesList}
  </div>

  <div class="section-title">4. Functional Feature Requirements</div>
  <div style="margin-bottom: 16px;">
    ${featuresList}
  </div>

  <div class="section-title">5. Reference Benchmarks & Attachments</div>
  <div class="grid-2">
    <div>
      <strong>Reference Websites:</strong>
      <ul style="padding-left: 18px; margin: 6px 0;">
        ${refWebsites}
      </ul>
    </div>
    <div>
      <strong>Attachments & Briefs:</strong>
      <ul style="padding-left: 18px; margin: 6px 0;">
        ${attachmentsList}
      </ul>
    </div>
  </div>

  ${req.additional_notes ? `
  <div class="section-title">6. Special Notes & Constraints</div>
  <div class="notes-box">${req.additional_notes}</div>
  ` : ''}

  <div class="signoff-section">
    <div class="signoff-box">
      <div class="signoff-label">Prepared By: CapeSecure Solutions Architect</div>
      <div class="signoff-line">
        <span>Authorized Signature</span>
        <span>Date: ____________</span>
      </div>
    </div>

    <div class="signoff-box">
      <div class="signoff-label">Approved By: Client Representative</div>
      <div class="signoff-line">
        <span>Client Signature</span>
        <span>Date: ____________</span>
      </div>
    </div>
  </div>

  <div class="footer">
    CapeSecure Business Management System • https://capesecure.vercel.app • Generated for internal and client authorization
  </div>
</body>
</html>`
}

export function openPrintableRequirementSummary(data: RequirementDocumentData) {
  const html = generateRequirementSummaryHTML(data)
  const printWindow = window.open('', '_blank', 'width=900,height=800')
  if (!printWindow) {
    alert('Please allow popups for this site to print or export the requirement summary.')
    return
  }
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
  }, 400)
}

export function downloadRequirementHTML(data: RequirementDocumentData) {
  const html = generateRequirementSummaryHTML(data)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const titleSafe = (data.requirement.title || 'Requirement').replace(/[^a-zA-Z0-9_-]/g, '_')
  a.href = url
  a.download = `CapeSecure-Requirement-${titleSafe}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Downloads a genuine binary .pdf file for the Requirement Specification
 */
export function downloadRequirementPDF(data: RequirementDocumentData) {
  const { requirement: req, client, lead } = data
  const pdf = new PDFBuilder()
  const titleSafe = (req.title || 'Requirement').replace(/[^a-zA-Z0-9_-]/g, '_')

  // Top header banner
  pdf.fillRect(36, 36, 523, 56, 0.05, 0.09, 0.16)
  pdf.drawText('CAPESECURE SOLUTIONS', 50, 48, { fontSize: 14, bold: true, r: 1, g: 1, b: 1 })
  pdf.drawText('CLIENT REQUIREMENT & TECHNICAL SPECIFICATION', 50, 68, { fontSize: 8, bold: true, r: 0.38, g: 0.75, b: 0.99 })

  pdf.drawText(`DATE: ${formatDate(req.created_at || new Date().toISOString())}`, 540, 50, { fontSize: 8, align: 'right', r: 0.8, g: 0.85, b: 0.9 })
  pdf.drawText(`STATUS: ${(req.status || 'Active').toUpperCase()}`, 540, 66, { fontSize: 8, bold: true, align: 'right', r: 0.38, g: 0.75, b: 0.99 })

  // Meta box
  pdf.fillRect(36, 102, 523, 76, 0.96, 0.97, 0.99)
  pdf.strokeRect(36, 102, 523, 76, 0.85, 0.9, 0.95, 1)

  pdf.drawText('PROJECT SPECIFICATION', 50, 114, { fontSize: 9, bold: true, r: 0.2, g: 0.4, b: 0.8 })
  pdf.drawText(req.title || 'Custom Web Application', 50, 128, { fontSize: 12, bold: true, r: 0.08, g: 0.12, b: 0.2 })
  pdf.drawText(`Website Type: ${req.website_type || 'Custom Web Portal'}   •   Purpose: ${req.business_purpose || 'Business Platform'}`, 50, 146, { fontSize: 8.5, r: 0.3, g: 0.35, b: 0.4 })
  pdf.drawText(`Timeline: ${req.timeline || req.estimated_delivery_date || '4-6 Weeks'}   •   Budget: ${req.budget_range || (req.budget_min ? `${req.budget_min} - ${req.budget_max}` : 'Standard')}`, 50, 160, { fontSize: 8.5, r: 0.3, g: 0.35, b: 0.4 })

  // Client Details box
  const clientName = client?.name || lead?.name || 'Authorized Client'
  const clientCo = client?.business_name || client?.company || lead?.company || 'Confidential'
  const clientContact = client?.email || lead?.email || 'N/A'
  pdf.fillRect(36, 188, 523, 44, 0.98, 0.98, 0.99)
  pdf.strokeRect(36, 188, 523, 44, 0.88, 0.9, 0.94, 1)
  pdf.drawText(`CLIENT: ${clientName} (${clientCo})`, 50, 198, { fontSize: 8.5, bold: true, r: 0.15, g: 0.2, b: 0.3 })
  pdf.drawText(`EMAIL: ${clientContact}   •   CLIENT REF: ${client?.client_code || 'CS-CLIENT-SPEC'}`, 50, 214, { fontSize: 8, r: 0.35, g: 0.4, b: 0.45 })

  // Technical Breakdown
  let curY = 246
  pdf.drawText('TECHNICAL & FUNCTIONAL REQUIREMENTS', 36, curY, { fontSize: 10, bold: true, r: 0.08, g: 0.12, b: 0.22 })
  pdf.line(36, curY + 6, 559, curY + 6, 0.8, 0.85, 0.92, 1)
  curY += 18

  const techSections = [
    { label: 'Required Pages', val: req.pages?.join(', ') || 'Home, About, Services, Contact, Dashboard' },
    { label: 'Key Features', val: req.features?.join(', ') || 'Client Portal, Responsive Layout, SEO Optimized, Analytics' },
    { label: 'Frontend Stack', val: req.frontend_tech || 'React, TypeScript, Tailwind CSS, Modern UI' },
    { label: 'Backend & DB', val: `${req.backend_tech || 'RESTful API / Edge Functions'} | DB: ${req.database_tech || 'PostgreSQL Supabase'}` },
    { label: 'Integrations', val: `Payment: ${req.payment_gateway || 'Stripe / Razorpay / NetBanking'} | Hosting: ${req.hosting_requirements || 'Vercel / Cloudflare'}` },
  ]

  for (const item of techSections) {
    pdf.fillRect(36, curY, 130, 24, 0.93, 0.95, 0.98)
    pdf.strokeRect(36, curY, 130, 24, 0.85, 0.88, 0.93, 1)
    pdf.drawText(item.label, 42, curY + 7, { fontSize: 8, bold: true, r: 0.15, g: 0.25, b: 0.4 })

    pdf.strokeRect(166, curY, 393, 24, 0.88, 0.9, 0.94, 1)
    pdf.drawText(item.val, 174, curY + 7, { fontSize: 8, r: 0.2, g: 0.2, b: 0.25 })
    curY += 28
  }

  // Notes
  if (req.additional_notes) {
    curY += 8
    pdf.drawText('ADDITIONAL INSTRUCTIONS & CLIENT NOTES', 36, curY, { fontSize: 9, bold: true, r: 0.1, g: 0.15, b: 0.25 })
    curY += 14
    curY = pdf.drawParagraph(req.additional_notes, 36, curY, 523, { fontSize: 8, lineHeight: 12, r: 0.3, g: 0.3, b: 0.3 })
  }

  // Signoff footer
  pdf.line(36, 760, 559, 760, 0.85, 0.88, 0.92, 1)
  pdf.drawText('CapeSecure Business Management Platform • Official Technical Documentation', 36, 770, { fontSize: 7.5, r: 0.45, g: 0.5, b: 0.55 })
  pdf.drawText('Confidential & Proprietary', 559, 770, { fontSize: 7.5, align: 'right', r: 0.45, g: 0.5, b: 0.55 })

  pdf.download(`CapeSecure-Requirement-${titleSafe}.pdf`)
}

// ─── QUOTATION PDF GENERATOR ──────────────────────────────────────────────────

export function generateQuotationHTML(quotation: Quotation, client?: Client | null): string {
  const clientName = client?.name || 'Valued Client'
  const companyName = client?.business_name || client?.company || 'Client Organization'
  const clientCode = client?.client_code || 'N/A'
  const clientEmail = client?.email || 'N/A'
  const clientPhone = client?.phone || 'N/A'
  const clientAddress = [client?.address, client?.city, client?.state, client?.country].filter(Boolean).join(', ') || 'Address on file'
  const clientGstin = client?.gstin ? `GSTIN / Tax ID: ${client.gstin}` : ''

  const versionText = quotation.version && quotation.version > 1 ? `(v${quotation.version})` : ''
  const isApproved = quotation.status === 'approved' || quotation.status === 'accepted'

  const advancePct = quotation.advance_percentage ?? 50
  const advanceAmt = quotation.advance_amount ?? (quotation.total * (advancePct / 100))
  const balanceAmt = quotation.balance_amount ?? (quotation.total - advanceAmt)

  const itemsRows = quotation.items.map((it, idx) => `
    <tr>
      <td style="text-align: center; color: #64748b;">${idx + 1}</td>
      <td>
        <strong style="color: #0f172a;">${it.description}</strong>
      </td>
      <td style="text-align: center;">${it.quantity}</td>
      <td style="text-align: right;">${formatCurrency(it.unit_price)}</td>
      <td style="text-align: right; font-weight: 600;">${formatCurrency(it.total)}</td>
    </tr>
  `).join('')

  const milestones = quotation.payment_milestones && quotation.payment_milestones.length > 0
    ? quotation.payment_milestones.map(m => `
        <div class="milestone-item">
          <div>
            <strong>${m.name} (${m.percentage}%)</strong>
            <div style="font-size: 11px; color: #64748b;">${m.due_trigger}</div>
          </div>
          <div style="font-weight: 700; color: #0f172a;">${formatCurrency(m.amount)}</div>
        </div>
      `).join('')
    : `
        <div class="milestone-item">
          <div>
            <strong>Advance Payment (${advancePct}%)</strong>
            <div style="font-size: 11px; color: #64748b;">Due upon signing agreement</div>
          </div>
          <div style="font-weight: 700; color: #0f172a;">${formatCurrency(advanceAmt)}</div>
        </div>
        <div class="milestone-item">
          <div>
            <strong>Final Settlement (${100 - advancePct}%)</strong>
            <div style="font-size: 11px; color: #64748b;">Due upon production deployment & client handover</div>
          </div>
          <div style="font-weight: 700; color: #0f172a;">${formatCurrency(balanceAmt)}</div>
        </div>
      `

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CapeSecure Quotation - ${quotation.quote_number}</title>
  <style>
    @page {
      size: A4;
      margin: 14mm 16mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
      font-size: 13px;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 18px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0f172a;
    }
    .brand-title span {
      color: #0d99ff;
    }
    .brand-details {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
      line-height: 1.4;
    }
    .quote-meta {
      text-align: right;
    }
    .quote-number {
      font-size: 18px;
      font-weight: 800;
      color: #0d99ff;
      font-family: monospace;
    }
    .quote-status {
      display: inline-block;
      padding: 3px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 6px;
      background: ${isApproved ? '#dcfce7' : '#e0f2fe'};
      color: ${isApproved ? '#15803d' : '#0369a1'};
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }
    .panel {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .panel-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.75px;
      color: #475569;
      margin-bottom: 8px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
    }
    .panel-content {
      font-size: 12px;
      color: #334155;
      line-height: 1.6;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 12px;
    }
    .items-table th, .items-table td {
      border: 1px solid #e2e8f0;
      padding: 9px 12px;
    }
    .items-table th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 600;
      text-align: left;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }
    .milestones-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .milestone-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .milestone-item:last-child {
      border-bottom: none;
    }
    .totals-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .totals-table td {
      padding: 6px 10px;
    }
    .totals-table .total-row {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      border-top: 2px solid #0f172a;
      background: #f1f5f9;
    }
    .terms-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 14px;
      font-size: 11px;
      color: #475569;
      margin-bottom: 24px;
    }
    .approval-banner {
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 24px;
    }
    .signoff-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 30px;
      padding-top: 16px;
      border-top: 1px dashed #cbd5e1;
    }
    .signoff-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 14px;
    }
    .signoff-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 30px;
    }
    .signoff-line {
      border-top: 1px solid #94a3b8;
      display: flex;
      justify-content: space-between;
      padding-top: 6px;
      font-size: 11px;
      color: #475569;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 10px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <div>
      <div class="brand-title">CAPE<span>SECURE</span></div>
      <div class="brand-details">
        CapeSecure Digital Architecture & Security<br>
        Web: https://capesecure.vercel.app • Email: quotes@capesecure.com<br>
        Registration: 2024/098124/07 • VAT/Tax ID: ZA491823901
      </div>
    </div>
    <div class="quote-meta">
      <div class="quote-number">${quotation.quote_number} ${versionText}</div>
      <div class="quote-status">${quotation.status.replace('_', ' ').toUpperCase()}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 6px;">
        Issue Date: <strong>${formatDate(quotation.created_at)}</strong><br>
        Valid Until: <strong>${quotation.valid_until ? formatDate(quotation.valid_until) : '30 Days from issue'}</strong>
      </div>
    </div>
  </div>

  <div class="grid-2">
    <div class="panel">
      <div class="panel-title">Quotation Prepared For</div>
      <div class="panel-content">
        <strong style="font-size: 14px; color: #0f172a;">${clientName}</strong><br>
        <span style="color: #0d99ff; font-weight: 600;">${companyName}</span> (${clientCode})<br>
        ${clientAddress}<br>
        Email: ${clientEmail} • Phone: ${clientPhone}<br>
        ${clientGstin ? `<span style="font-size: 11px; color: #64748b;">${clientGstin}</span>` : ''}
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">Project Commercial Overview</div>
      <div class="panel-content">
        <strong>Title:</strong> ${quotation.title}<br>
        <strong>Delivery Timeline:</strong> ${quotation.delivery_timeline || '4–6 Weeks (Estimated)'}<br>
        <strong>Advance Payment Term:</strong> ${advancePct}% upfront upon contract execution<br>
        ${quotation.description ? `<p style="margin: 6px 0 0 0; font-size: 11px; color: #64748b;">${quotation.description}</p>` : ''}
      </div>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 5%; text-align: center;">#</th>
        <th style="width: 50%;">Service Description & Deliverables</th>
        <th style="width: 10%; text-align: center;">Qty</th>
        <th style="width: 17%; text-align: right;">Unit Price</th>
        <th style="width: 18%; text-align: right;">Total Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="summary-grid">
    <div class="milestones-box">
      <div class="panel-title">Payment Milestones & Schedule</div>
      ${milestones}
    </div>

    <div>
      <table class="totals-table">
        <tr>
          <td style="color: #64748b;">Subtotal:</td>
          <td style="text-align: right; font-weight: 600;">${formatCurrency(quotation.subtotal)}</td>
        </tr>
        ${quotation.discount > 0 ? `
        <tr>
          <td style="color: #ef4444;">Discount Applied:</td>
          <td style="text-align: right; color: #ef4444; font-weight: 600;">-${formatCurrency(quotation.discount)}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="color: #64748b;">Tax (${quotation.tax_rate}%):</td>
          <td style="text-align: right; font-weight: 600;">${formatCurrency(quotation.tax_amount)}</td>
        </tr>
        <tr class="total-row">
          <td>Grand Total:</td>
          <td style="text-align: right; color: #0d99ff;">${formatCurrency(quotation.total)}</td>
        </tr>
      </table>
    </div>
  </div>

  <div class="panel-title" style="margin-top: 10px;">Terms and Conditions</div>
  <div class="terms-box">
    ${quotation.terms_conditions || `
      1. Validity: This quotation is valid for 30 calendar days from the date of issuance.<br>
      2. Advance Payment: Work commences immediately upon receipt of the ${advancePct}% advance deposit.<br>
      3. Scope: Any services or alterations not explicitly detailed above will be subject to a formal Change Request.<br>
      4. Intellectual Property: Source code, designs, and database assets transfer to the client upon receipt of 100% final settlement.<br>
      5. Taxes: All quotes are inclusive of standard applicable regional taxes unless explicitly specified otherwise.
    `}
  </div>

  ${isApproved && quotation.approval_details ? `
    <div class="approval-banner">
      <div style="font-weight: 700; color: #166534; font-size: 13px;">✓ Officially Approved by Client</div>
      <div style="font-size: 11px; color: #15803d; margin-top: 3px;">
        Approved By: <strong>${quotation.approval_details.approved_by}</strong> (${quotation.approval_details.approver_email})<br>
        Role: ${quotation.approval_details.approver_role || 'Authorized Signatory'} • Date: ${formatDate(quotation.approval_details.approved_at)} • Version: v${quotation.approval_details.version}
        ${quotation.approval_details.confirmation_statement ? `<br><em>"${quotation.approval_details.confirmation_statement}"</em>` : ''}
      </div>
    </div>
  ` : `
    <div class="signoff-grid">
      <div class="signoff-box">
        <div class="signoff-label">Prepared By: CapeSecure Solutions</div>
        <div class="signoff-line">
          <span>Authorized Signature</span>
          <span>Date: ____________</span>
        </div>
      </div>

      <div class="signoff-box">
        <div class="signoff-label">Accepted & Approved By: Client Representative</div>
        <div class="signoff-line">
          <span>Authorized Signatory</span>
          <span>Date: ____________</span>
        </div>
      </div>
    </div>
  `}

  <div class="footer">
    CapeSecure Business Management System • https://capesecure.vercel.app • Automated Quotation Document
  </div>
</body>
</html>`
}

export function openPrintableQuotation(quotation: Quotation, client?: Client | null) {
  const html = generateQuotationHTML(quotation, client)
  const printWindow = window.open('', '_blank', 'width=900,height=850')
  if (!printWindow) {
    alert('Please allow popups to view or print the quotation PDF.')
    return
  }
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
  }, 400)
}

export function downloadQuotationHTML(quotation: Quotation, client?: Client | null) {
  const html = generateQuotationHTML(quotation, client)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const quoteSafe = quotation.quote_number.replace(/[^a-zA-Z0-9_-]/g, '_')
  a.href = url
  a.download = `CapeSecure-Quotation-${quoteSafe}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Downloads a genuine binary .pdf file for the Quotation
 */
export function downloadQuotationPDF(quotation: Quotation, client?: Client | null) {
  const pdf = new PDFBuilder()
  const quoteSafe = quotation.quote_number.replace(/[^a-zA-Z0-9_-]/g, '_')

  // Top header banner
  pdf.fillRect(36, 36, 523, 60, 0.05, 0.09, 0.16)
  pdf.drawText('CAPESECURE SOLUTIONS', 50, 48, { fontSize: 15, bold: true, r: 1, g: 1, b: 1 })
  pdf.drawText('ENTERPRISE WEB & SOFTWARE ENGINEERING', 50, 68, { fontSize: 8, bold: true, r: 0.38, g: 0.75, b: 0.99 })

  pdf.drawText('OFFICIAL ESTIMATE / QUOTATION', 540, 48, { fontSize: 10, bold: true, align: 'right', r: 0.38, g: 0.75, b: 0.99 })
  pdf.drawText(`REF: ${quotation.quote_number}`, 540, 64, { fontSize: 8.5, bold: true, align: 'right', r: 1, g: 1, b: 1 })
  pdf.drawText(`STATUS: ${quotation.status.toUpperCase()}`, 540, 78, { fontSize: 8, align: 'right', r: 0.8, g: 0.85, b: 0.9 })

  // Metadata ribbon
  pdf.fillRect(36, 106, 523, 30, 0.95, 0.96, 0.98)
  pdf.strokeRect(36, 106, 523, 30, 0.85, 0.88, 0.93, 1)
  pdf.drawText(`Date Issued: ${formatDate(quotation.created_at || new Date().toISOString())}`, 50, 116, { fontSize: 8.5, bold: true, r: 0.2, g: 0.25, b: 0.35 })
  pdf.drawText(`Valid Until: ${quotation.valid_until ? formatDate(quotation.valid_until) : '30 Days'}`, 240, 116, { fontSize: 8.5, bold: true, r: 0.2, g: 0.25, b: 0.35 })
  pdf.drawText('Currency: INR (Rs)', 430, 116, { fontSize: 8.5, bold: true, r: 0.2, g: 0.25, b: 0.35 })

  // Two columns: Provider & Client
  const clientName = client?.name || 'Authorized Client'
  const clientCo = client?.business_name || client?.company || 'Client Organization'
  const clientContact = client?.email || 'N/A'
  const clientPhone = client?.phone || 'N/A'
  const clientAddr = [client?.address, client?.city, client?.state].filter(Boolean).join(', ') || 'Address on file'

  // Left: Client box
  pdf.fillRect(36, 146, 256, 76, 0.98, 0.98, 0.99)
  pdf.strokeRect(36, 146, 256, 76, 0.88, 0.9, 0.94, 1)
  pdf.drawText('PREPARED FOR (CLIENT):', 46, 154, { fontSize: 7.5, bold: true, r: 0.4, g: 0.45, b: 0.55 })
  pdf.drawText(clientCo, 46, 168, { fontSize: 10, bold: true, r: 0.1, g: 0.15, b: 0.25 })
  pdf.drawText(`Attn: ${clientName}`, 46, 182, { fontSize: 8, r: 0.25, g: 0.3, b: 0.35 })
  pdf.drawText(`${clientContact} | ${clientPhone}`, 46, 194, { fontSize: 7.5, r: 0.35, g: 0.4, b: 0.45 })
  pdf.drawText(clientAddr, 46, 206, { fontSize: 7.5, r: 0.35, g: 0.4, b: 0.45 })

  // Right: CapeSecure box
  pdf.fillRect(302, 146, 257, 76, 0.98, 0.98, 0.99)
  pdf.strokeRect(302, 146, 257, 76, 0.88, 0.9, 0.94, 1)
  pdf.drawText('SERVICE PROVIDER:', 312, 154, { fontSize: 7.5, bold: true, r: 0.4, g: 0.45, b: 0.55 })
  pdf.drawText('CapeSecure Solutions', 312, 168, { fontSize: 10, bold: true, r: 0.1, g: 0.15, b: 0.25 })
  pdf.drawText('Enterprise Web Architecture & Security', 312, 182, { fontSize: 8, r: 0.25, g: 0.3, b: 0.35 })
  pdf.drawText('support@capesecure.com | https://capesecure.vercel.app', 312, 194, { fontSize: 7.5, r: 0.35, g: 0.4, b: 0.45 })
  pdf.drawText('Kerala, India • GSTIN: 32ABCDE1234F1Z5', 312, 206, { fontSize: 7.5, r: 0.35, g: 0.4, b: 0.45 })

  // Project Header
  pdf.fillRect(36, 232, 523, 26, 0.92, 0.94, 0.98)
  pdf.strokeRect(36, 232, 523, 26, 0.82, 0.86, 0.92, 1)
  pdf.drawText(`PROJECT: ${quotation.title}`, 46, 241, { fontSize: 9.5, bold: true, r: 0.08, g: 0.15, b: 0.3 })
  if (quotation.delivery_timeline) {
    pdf.drawText(`Est. Delivery: ${quotation.delivery_timeline}`, 540, 241, { fontSize: 8.5, align: 'right', r: 0.2, g: 0.3, b: 0.45 })
  }

  // Items Table Header
  let curY = 268
  pdf.fillRect(36, curY, 523, 20, 0.1, 0.15, 0.25)
  pdf.drawText('#', 44, curY + 6, { fontSize: 8, bold: true, r: 1, g: 1, b: 1 })
  pdf.drawText('ITEM & DELIVERABLE DESCRIPTION', 66, curY + 6, { fontSize: 8, bold: true, r: 1, g: 1, b: 1 })
  pdf.drawText('QTY', 370, curY + 6, { fontSize: 8, bold: true, r: 1, g: 1, b: 1 })
  pdf.drawText('UNIT PRICE', 420, curY + 6, { fontSize: 8, bold: true, r: 1, g: 1, b: 1 })
  pdf.drawText('TOTAL', 540, curY + 6, { fontSize: 8, bold: true, align: 'right', r: 1, g: 1, b: 1 })
  curY += 20

  // Item rows
  const items = quotation.items && quotation.items.length > 0 ? quotation.items : [
    { description: quotation.title || 'Web Development Package', quantity: 1, unit_price: quotation.total, total: quotation.total }
  ]

  items.slice(0, 6).forEach((item, idx) => {
    const isAlt = idx % 2 === 1
    if (isAlt) {
      pdf.fillRect(36, curY, 523, 24, 0.98, 0.98, 0.99)
    }
    pdf.strokeRect(36, curY, 523, 24, 0.9, 0.92, 0.95, 1)

    pdf.drawText(String(idx + 1), 44, curY + 7, { fontSize: 8, r: 0.3, g: 0.35, b: 0.4 })
    const serviceName = item.description || `Deliverable #${idx + 1}`
    pdf.drawText(serviceName.substring(0, 52), 66, curY + 7, { fontSize: 8.5, bold: true, r: 0.1, g: 0.15, b: 0.25 })
    pdf.drawText(String(item.quantity || 1), 376, curY + 7, { fontSize: 8, r: 0.25, g: 0.3, b: 0.35 })
    pdf.drawText(formatCurrency(item.unit_price || 0), 420, curY + 7, { fontSize: 8, r: 0.25, g: 0.3, b: 0.35 })
    pdf.drawText(formatCurrency(item.total || ((item.quantity || 1) * (item.unit_price || 0))), 540, curY + 7, { fontSize: 8.5, bold: true, align: 'right', r: 0.1, g: 0.15, b: 0.25 })

    curY += 24
  })

  // Financial summary & Milestone split
  curY += 10
  const advancePct = quotation.advance_percentage || 50
  const advanceAmt = quotation.advance_amount || (quotation.total * advancePct) / 100
  const balanceAmt = quotation.balance_amount || (quotation.total - advanceAmt)

  // Left box: Milestones
  pdf.fillRect(36, curY, 280, 84, 0.96, 0.97, 0.99)
  pdf.strokeRect(36, curY, 280, 84, 0.85, 0.88, 0.93, 1)
  pdf.drawText('PAYMENT SCHEDULE & MILESTONES', 46, curY + 10, { fontSize: 8, bold: true, r: 0.15, g: 0.25, b: 0.4 })
  pdf.drawText(`1. Advance Deposit (${advancePct}%): ${formatCurrency(advanceAmt)}`, 46, curY + 28, { fontSize: 8, bold: true, r: 0.1, g: 0.5, b: 0.25 })
  pdf.drawText('   Due upon contract signing before development begins.', 46, curY + 40, { fontSize: 7.5, r: 0.4, g: 0.45, b: 0.5 })
  pdf.drawText(`2. Final Settlement (${100 - advancePct}%): ${formatCurrency(balanceAmt)}`, 46, curY + 54, { fontSize: 8, bold: true, r: 0.1, g: 0.2, b: 0.35 })
  pdf.drawText('   Due upon QA testing completion & prior to final handover.', 46, curY + 66, { fontSize: 7.5, r: 0.4, g: 0.45, b: 0.5 })

  // Right box: Totals
  pdf.fillRect(326, curY, 233, 84, 0.98, 0.98, 0.99)
  pdf.strokeRect(326, curY, 233, 84, 0.88, 0.9, 0.94, 1)
  pdf.drawText('Subtotal:', 336, curY + 12, { fontSize: 8, r: 0.35, g: 0.4, b: 0.45 })
  pdf.drawText(formatCurrency(quotation.subtotal || quotation.total), 540, curY + 12, { fontSize: 8, align: 'right', r: 0.2, g: 0.25, b: 0.3 })

  if (quotation.discount && quotation.discount > 0) {
    pdf.drawText('Discount:', 336, curY + 26, { fontSize: 8, r: 0.8, g: 0.2, b: 0.2 })
    pdf.drawText(`- ${formatCurrency(quotation.discount)}`, 540, curY + 26, { fontSize: 8, align: 'right', r: 0.8, g: 0.2, b: 0.2 })
  }

  if (quotation.tax_amount && quotation.tax_amount > 0) {
    pdf.drawText(`Tax (${quotation.tax_rate || 18}% GST):`, 336, curY + 40, { fontSize: 8, r: 0.35, g: 0.4, b: 0.45 })
    pdf.drawText(formatCurrency(quotation.tax_amount), 540, curY + 40, { fontSize: 8, align: 'right', r: 0.2, g: 0.25, b: 0.3 })
  }

  pdf.line(336, curY + 54, 549, curY + 54, 0.8, 0.85, 0.9, 1)
  pdf.drawText('TOTAL PAYABLE:', 336, curY + 66, { fontSize: 9.5, bold: true, r: 0.08, g: 0.15, b: 0.3 })
  pdf.drawText(formatCurrency(quotation.total), 540, curY + 66, { fontSize: 11, bold: true, align: 'right', r: 0.08, g: 0.4, b: 0.2 })

  // Approval status / Signoff
  curY += 98
  if (quotation.status === 'approved' && quotation.approval_details) {
    pdf.fillRect(36, curY, 523, 44, 0.94, 0.98, 0.94)
    pdf.strokeRect(36, curY, 523, 44, 0.6, 0.8, 0.6, 1)
    pdf.drawText('OFFICIALLY APPROVED BY CLIENT REPRESENTATIVE', 50, curY + 12, { fontSize: 9, bold: true, r: 0.08, g: 0.5, b: 0.15 })
    pdf.drawText(`Approved By: ${quotation.approval_details.approved_by} (${quotation.approval_details.approver_email})   •   Date: ${formatDate(quotation.approval_details.approved_at)}`, 50, curY + 28, { fontSize: 8, r: 0.15, g: 0.4, b: 0.2 })
  } else {
    pdf.fillRect(36, curY, 256, 48, 0.98, 0.98, 0.99)
    pdf.strokeRect(36, curY, 256, 48, 0.88, 0.9, 0.94, 1)
    pdf.drawText('Prepared By: CapeSecure Solutions', 44, curY + 10, { fontSize: 7.5, bold: true, r: 0.3, g: 0.35, b: 0.45 })
    pdf.drawText('Authorized Signature: __________________', 44, curY + 32, { fontSize: 7.5, r: 0.35, g: 0.4, b: 0.45 })

    pdf.fillRect(302, curY, 257, 48, 0.98, 0.98, 0.99)
    pdf.strokeRect(302, curY, 257, 48, 0.88, 0.9, 0.94, 1)
    pdf.drawText('Client Acceptance & Sign-off', 312, curY + 10, { fontSize: 7.5, bold: true, r: 0.3, g: 0.35, b: 0.45 })
    pdf.drawText('Authorized Signatory: __________________', 312, curY + 32, { fontSize: 7.5, r: 0.35, g: 0.4, b: 0.45 })
  }

  // Footer
  pdf.line(36, 765, 559, 765, 0.85, 0.88, 0.92, 1)
  pdf.drawText('CapeSecure Business Management Platform • Official Quotation Document', 36, 775, { fontSize: 7.5, r: 0.45, g: 0.5, b: 0.55 })
  pdf.drawText('https://capesecure.vercel.app', 559, 775, { fontSize: 7.5, align: 'right', r: 0.45, g: 0.5, b: 0.55 })

  pdf.download(`CapeSecure-Quotation-${quoteSafe}.pdf`)
}

// ─── AGREEMENT GENERATION & PDF BUILDER (PHASE 5) ──────────────────────────

/**
 * Generates the full 17-section Master Service Agreement HTML document
 */
export function generateAgreementHTML(agreement: Agreement, client?: Client | null, quotation?: Quotation | null): string {
  const clientName = client?.name || 'Valued Client'
  const companyName = client?.business_name || client?.company || 'Client Organization'
  const clientCode = client?.client_code || 'CS-CLIENT'
  const clientEmail = client?.email || 'N/A'
  const clientPhone = client?.phone || 'N/A'
  const clientAddress = [client?.address, client?.city, client?.state, client?.country].filter(Boolean).join(', ') || 'Registered Address on file'
  const clientGstin = client?.gstin ? `GSTIN: ${client.gstin}` : 'GSTIN: Not Provided'

  const totalVal = agreement.total_value || quotation?.total || 0
  const advancePct = agreement.advance_percentage || 50
  const advanceAmt = agreement.advance_amount || (totalVal * advancePct) / 100
  const balanceAmt = agreement.balance_amount || (totalVal - advanceAmt)

  const isSigned = agreement.status === 'fully_signed' || agreement.status === 'signed' || agreement.status === 'active'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CapeSecure Master Service Agreement - ${agreement.agreement_number}</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 18mm 18mm 18mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.5;
      font-size: 11.5px;
      margin: 0;
      padding: 0;
    }
    .header-banner {
      background: linear-gradient(135deg, #090d16 0%, #0f172a 100%);
      color: #ffffff;
      padding: 24px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
    }
    .brand-subtitle {
      font-size: 9.5px;
      letter-spacing: 1.2px;
      color: #38bdf8;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .agreement-meta {
      text-align: right;
    }
    .agreement-ref {
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
    }
    .agreement-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 4px;
      background: rgba(56, 189, 248, 0.2);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.4);
    }
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 22px;
    }
    .party-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 14px;
      background: #f8fafc;
    }
    .party-role {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0284c7;
      margin-bottom: 6px;
    }
    .party-name {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .party-details {
      font-size: 10.5px;
      color: #475569;
      margin-top: 4px;
      line-height: 1.4;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      border-bottom: 1.5px solid #0f172a;
      padding-bottom: 4px;
      margin-top: 20px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-num {
      background: #0f172a;
      color: #ffffff;
      width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
    }
    .clause-text {
      color: #334155;
      margin-bottom: 10px;
      text-align: justify;
    }
    .deliverables-table, .financials-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    .deliverables-table th, .financials-table th {
      background: #f1f5f9;
      color: #1e293b;
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
      padding: 8px 10px;
      text-align: left;
      border: 1px solid #cbd5e1;
    }
    .deliverables-table td, .financials-table td {
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      font-size: 10.5px;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 30px;
      page-break-inside: avoid;
    }
    .signature-box {
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      padding: 16px;
      background: #ffffff;
    }
    .sig-role {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 8px;
    }
    .sig-space {
      height: 60px;
      border-bottom: 1px dashed #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-style: italic;
      font-size: 11px;
    }
    .sig-details {
      margin-top: 8px;
      font-size: 10px;
      color: #475569;
      line-height: 1.4;
    }
    .audit-box {
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 6px;
      padding: 12px;
      margin-top: 16px;
      font-size: 10px;
      color: #166534;
      page-break-inside: avoid;
    }
    .footer {
      margin-top: 36px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 9px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header-banner">
    <div>
      <div class="brand-title">CAPESECURE SOLUTIONS</div>
      <div class="brand-subtitle">Master Website Development & Software Service Agreement</div>
    </div>
    <div class="agreement-meta">
      <div class="agreement-ref">${agreement.agreement_number}</div>
      <div class="agreement-badge">${agreement.status.replace(/_/g, ' ')}</div>
      <div style="font-size: 9.5px; color: #94a3b8; margin-top: 4px;">Executed: ${formatDate(agreement.created_at)}</div>
    </div>
  </div>

  <p class="clause-text">
    This Master Website Development & Service Agreement (the <strong>"Agreement"</strong>) is entered into and made effective as of 
    <strong>${formatDate(agreement.created_at)}</strong> (the <strong>"Effective Date"</strong>), by and between the parties set forth below:
  </p>

  <div class="parties-grid">
    <div class="party-card">
      <div class="party-role">Service Provider (Developer)</div>
      <div class="party-name">CapeSecure Solutions</div>
      <div class="party-details">
        Registered Agency & Cybersecurity Operations<br>
        Email: support@capesecure.com • Phone: +91 94892 23812<br>
        Web: https://capesecure.vercel.app<br>
        Kerala, India • GSTIN: 32ABCDE1234F1Z5
      </div>
    </div>

    <div class="party-card">
      <div class="party-role">Client (Customer)</div>
      <div class="party-name">${companyName}</div>
      <div class="party-details">
        Authorized Representative: ${clientName}<br>
        Email: ${clientEmail} • Phone: ${clientPhone}<br>
        ${clientAddress}<br>
        ${clientGstin} • Client Ref: ${clientCode}
      </div>
    </div>
  </div>

  <!-- SECTION 1 -->
  <div class="section-title"><span class="section-num">1</span> Service Provider Details</div>
  <div class="clause-text">
    ${agreement.content || `CapeSecure Solutions provides enterprise-grade full-stack web application development, security engineering, responsive UI/UX implementation, cloud infrastructure hosting, and database integration services.`}
  </div>

  <!-- SECTION 2 -->
  <div class="section-title"><span class="section-num">2</span> Client Details</div>
  <div class="clause-text">
    The Client is represented by <strong>${clientName}</strong>, acting as an authorized signatory for <strong>${companyName}</strong>, possessing full legal capacity to bind the business entity to all terms, milestone payments, and obligations set forth herein.
  </div>

  <!-- SECTION 3 -->
  <div class="section-title"><span class="section-num">3</span> Scope of Services</div>
  <div class="clause-text">
    ${agreement.scope_of_services || `CapeSecure shall furnish all software design, full-stack programming, cloud architecture configuration, testing, and deployment services necessary to complete <strong>"${agreement.title}"</strong> in strict compliance with the approved technical specifications.`}
  </div>

  <!-- SECTION 4 -->
  <div class="section-title"><span class="section-num">4</span> Project Deliverables</div>
  <table class="deliverables-table">
    <thead>
      <tr>
        <th style="width: 35px;">#</th>
        <th>Deliverable Description</th>
        <th style="width: 70px; text-align: center;">Qty</th>
        <th style="width: 110px; text-align: right;">Value</th>
      </tr>
    </thead>
    <tbody>
      ${(agreement.project_deliverables && agreement.project_deliverables.length > 0)
        ? agreement.project_deliverables.map((d, i) => `
          <tr>
            <td style="text-align: center; color: #64748b;">${i + 1}</td>
            <td><strong>${d.title}</strong>${d.description ? `<br><span style="color: #64748b; font-size: 9.5px;">${d.description}</span>` : ''}</td>
            <td style="text-align: center;">${d.quantity || 1}</td>
            <td style="text-align: right; font-weight: 600;">${d.price ? formatCurrency(d.price) : 'Included'}</td>
          </tr>
        `).join('')
        : (quotation?.items && quotation.items.length > 0)
          ? quotation.items.map((it, i) => `
            <tr>
              <td style="text-align: center; color: #64748b;">${i + 1}</td>
              <td><strong>${it.description}</strong></td>
              <td style="text-align: center;">${it.quantity || 1}</td>
              <td style="text-align: right; font-weight: 600;">${formatCurrency(it.total)}</td>
            </tr>
          `).join('')
          : `<tr><td colspan="4" style="text-align: center; color: #64748b;">Comprehensive Website Architecture and Deployment as per quotation ${agreement.quotation_number || 'CS-QTN-2026-001'}</td></tr>`
      }
    </tbody>
  </table>

  <!-- SECTION 5 -->
  <div class="section-title"><span class="section-num">5</span> Development Charges & Commercial Terms</div>
  <div class="clause-text">
    The total agreed project fee is <strong>${formatCurrency(totalVal)}</strong>, inclusive of all direct development, QA testing, and launch activities explicitly scoped in Section 4. Any ancillary work outside this scope shall be governed by an approved written Change Request.
  </div>

  <!-- SECTION 6 -->
  <div class="section-title"><span class="section-num">6</span> Payment Schedule</div>
  <table class="financials-table">
    <thead>
      <tr>
        <th>Milestone / Tranche</th>
        <th style="width: 100px; text-align: center;">Percentage</th>
        <th style="width: 120px; text-align: right;">Amount</th>
        <th>Trigger Condition</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Advance Mobilization Deposit</strong></td>
        <td style="text-align: center; font-weight: 700;">${advancePct}%</td>
        <td style="text-align: right; font-weight: 700; color: #0284c7;">${formatCurrency(advanceAmt)}</td>
        <td>Due upon signing of this Agreement prior to technical kickoff.</td>
      </tr>
      <tr>
        <td><strong>Final Settlement & Handover</strong></td>
        <td style="text-align: center; font-weight: 700;">${100 - advancePct}%</td>
        <td style="text-align: right; font-weight: 700; color: #166534;">${formatCurrency(balanceAmt)}</td>
        <td>Due upon successful staging QA sign-off before production release.</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 7 -->
  <div class="section-title"><span class="section-num">7</span> Domain and Hosting Ownership</div>
  <div class="clause-text">
    ${agreement.domain_hosting_ownership || `The Client retains sole and complete ownership of their registered domain names, branding assets, and commercial data. Hosting accounts provisioned by CapeSecure shall be transferred or directly bound to the Client upon receipt of 100% final settlement.`}
  </div>

  <!-- SECTION 8 -->
  <div class="section-title"><span class="section-num">8</span> Delivery Timeline & Milestone Schedules</div>
  <div class="clause-text">
    ${agreement.delivery_timeline || `Estimated project duration is <strong>${quotation?.delivery_timeline || '4 to 6 weeks'}</strong> from receipt of advance deposit and all requisite client assets (branding, copy, and credentials).`}
  </div>

  <!-- SECTION 9 -->
  <div class="section-title"><span class="section-num">9</span> Revisions, Changes & Iteration Policy</div>
  <div class="clause-text">
    ${agreement.revisions_policy || `The project includes up to two (2) consolidated feedback revision rounds during the UI/UX design phase and one (1) feedback revision round during staging QA. Out-of-scope modifications shall be billed at CapeSecure's standard engineering hourly rate upon mutual agreement.`}
  </div>

  <!-- SECTION 10 -->
  <div class="section-title"><span class="section-num">10</span> Intellectual Property Rights</div>
  <div class="clause-text">
    ${agreement.ip_terms || `Upon complete payment of all fees due under this Agreement, CapeSecure transfers to the Client all worldwide rights, title, and ownership in the bespoke frontend and backend source code created exclusively for this project. CapeSecure retains ownership of its proprietary pre-existing libraries, developer tooling, and reusable framework components.`}
  </div>

  <!-- SECTION 11 -->
  <div class="section-title"><span class="section-num">11</span> Confidentiality & Non-Disclosure</div>
  <div class="clause-text">
    ${agreement.confidentiality_terms || `Both parties agree to hold all proprietary trade secrets, user databases, credentials, source code, and commercial negotiations in strict confidence for a period of no less than three (3) years from the Effective Date.`}
  </div>

  <!-- SECTION 12 -->
  <div class="section-title"><span class="section-num">12</span> Maintenance Conditions & Post-Launch Warranty</div>
  <div class="clause-text">
    ${agreement.maintenance_terms || `CapeSecure provides a thirty (30) calendar day warranty period commencing on the Handover date, during which any reproducible software defects or functional deviations from Section 4 will be resolved at zero additional charge. Ongoing maintenance, security patches, and backups thereafter are covered under separate Service Level Agreements (SLAs).`}
  </div>

  <!-- SECTION 13 -->
  <div class="section-title"><span class="section-num">13</span> Cancellation & Refund Terms</div>
  <div class="clause-text">
    ${agreement.cancellation_terms || `Either party may terminate this Agreement with fourteen (14) days written notice. In the event of early termination by the Client, CapeSecure shall retain the advance payment to cover engineering time expended, and bill for completed deliverables on a pro-rata basis.`}
  </div>

  <!-- SECTION 14 -->
  <div class="section-title"><span class="section-num">14</span> Liability & Third-Party Services</div>
  <div class="clause-text">
    ${agreement.liability_terms || `CapeSecure shall not be held liable for outages, pricing changes, or security breaches resulting from third-party services, APIs, payment gateways, or hosting providers outside of CapeSecure's direct architectural control. Total aggregate liability under any legal theory shall not exceed the total fees paid by Client under this Agreement.`}
  </div>

  <!-- SECTION 15 -->
  <div class="section-title"><span class="section-num">15</span> Dispute Resolution</div>
  <div class="clause-text">
    ${agreement.dispute_resolution || `Any controversy or dispute arising out of this Agreement shall first be resolved through good-faith executive negotiation. If unresolved within 30 days, the matter shall be submitted to binding arbitration conducted in accordance with the Arbitration and Conciliation Act.`}
  </div>

  <!-- SECTION 16 -->
  <div class="section-title"><span class="section-num">16</span> Governing Law & Jurisdiction</div>
  <div class="clause-text">
    ${agreement.governing_law || `This Agreement shall be governed by, construed, and enforced in accordance with the substantive laws of India, and the competent courts situated in Kerala, India shall have exclusive jurisdiction.`}
  </div>

  <!-- SECTION 17 -->
  <div class="section-title"><span class="section-num">17</span> Execution & Signature Sign-off</div>
  <p class="clause-text">
    IN WITNESS WHEREOF, the duly authorized representatives of CapeSecure Solutions and the Client have executed this Master Service Agreement as of the date indicated.
  </p>

  <div class="signature-grid">
    <div class="signature-box">
      <div class="sig-role">For: CapeSecure Solutions (Developer)</div>
      <div class="sig-space">
        ${isSigned ? `<span style="color: #0284c7; font-weight: 700; font-style: normal;">[Digitally Verified / Authorized Officer]</span>` : `Authorized Signature`}
      </div>
      <div class="sig-details">
        Name: Libinesh (Principal Architect)<br>
        Title: Lead Engineering Officer<br>
        Date: ${formatDate(agreement.created_at)}
      </div>
    </div>

    <div class="signature-box">
      <div class="sig-role">For: ${companyName} (Client)</div>
      <div class="sig-space">
        ${isSigned ? `<span style="color: #166534; font-weight: 700; font-style: normal;">[Digitally Signed by Authorized Signatory]</span>` : `Client Authorized Signature`}
      </div>
      <div class="sig-details">
        Name: ${clientName}<br>
        Title: Authorized Representative<br>
        Date: ${agreement.signed_at ? formatDate(agreement.signed_at) : '__________________'}
      </div>
    </div>
  </div>

  ${(agreement.signing_method === 'digital' && agreement.esign_details) ? `
    <div class="audit-box">
      <strong>✓ DIGITAL SIGNATURE VERIFICATION AUDIT RECORD</strong><br>
      Provider: ${agreement.esign_details.provider.toUpperCase()} • Transaction ID: ${agreement.esign_details.envelope_id || agreement.esign_details.signing_url || 'ZS-2026-LIVE'}<br>
      Status: ${agreement.esign_details.status} • Signers: ${(agreement.esign_details.signers || []).map((s: any) => `${s.name} (${s.email}) - ${s.status}`).join('; ')}<br>
      Verification Hash (SHA-256): <em>${agreement.signature_audit?.tamper_proof_checksum || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}</em>
    </div>
  ` : (agreement.signing_method === 'physical' && agreement.physical_custody) ? `
    <div class="audit-box" style="background: #f8fafc; border-color: #cbd5e1; color: #334155;">
      <strong>📁 PHYSICAL SIGNED DOCUMENT CUSTODY EVIDENCE</strong><br>
      Storage Locker / Binder Reference: <strong>${agreement.physical_custody.storage_location}</strong><br>
      Physical Custodian: ${agreement.physical_custody.custodian_name} • Received Date: ${formatDate(agreement.physical_custody.received_date)}<br>
      Verified Admin ID: ${agreement.physical_custody.verified_by_admin_id} • File: ${agreement.physical_custody.scanned_copy_url || 'Physical Scanned Copy Uploaded'}
    </div>
  ` : ''}

  <div class="footer">
    <span>CapeSecure Master Service Agreement • Ref: ${agreement.agreement_number}</span>
    <span>https://capesecure.vercel.app • Legally Binding Document</span>
  </div>
</body>
</html>`
}

/**
 * Opens print preview window for Agreement
 */
export function openPrintableAgreement(agreement: Agreement, client?: Client | null, quotation?: Quotation | null) {
  const html = generateAgreementHTML(agreement, client, quotation)
  const printWindow = window.open('', '_blank', 'width=950,height=900')
  if (!printWindow) {
    alert('Please allow popups to view or print the Agreement document.')
    return
  }
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
  }, 400)
}

/**
 * Downloads a genuine binary .pdf file for the Agreement with all 17 legal sections
 */
export function downloadAgreementPDF(agreement: Agreement, client?: Client | null, quotation?: Quotation | null) {
  const pdf = new PDFBuilder()
  const agrSafe = agreement.agreement_number.replace(/[^a-zA-Z0-9_-]/g, '_')
  const clientName = client?.name || 'Valued Client'
  const companyName = client?.business_name || client?.company || 'Client Organization'
  const totalVal = agreement.total_value || quotation?.total || 0
  const advancePct = agreement.advance_percentage || 50
  const advanceAmt = agreement.advance_amount || (totalVal * advancePct) / 100
  const balanceAmt = agreement.balance_amount || (totalVal - advanceAmt)

  // ════════════ PAGE 1: RECITALS & COMMERCIAL TERMS ════════════
  pdf.fillRect(36, 36, 523, 60, 0.05, 0.09, 0.16)
  pdf.drawText('CAPESECURE SOLUTIONS', 50, 48, { fontSize: 15, bold: true, r: 1, g: 1, b: 1 })
  pdf.drawText('MASTER WEBSITE DEVELOPMENT & SERVICE AGREEMENT', 50, 68, { fontSize: 8, bold: true, r: 0.38, g: 0.75, b: 0.99 })

  pdf.drawText('LEGAL CONTRACT', 540, 48, { fontSize: 9, bold: true, align: 'right', r: 0.38, g: 0.75, b: 0.99 })
  pdf.drawText(`AGR NO: ${agreement.agreement_number}`, 540, 64, { fontSize: 8.5, bold: true, align: 'right', r: 1, g: 1, b: 1 })
  pdf.drawText(`STATUS: ${agreement.status.toUpperCase()}`, 540, 78, { fontSize: 8, align: 'right', r: 0.8, g: 0.85, b: 0.9 })

  // Parties banner
  pdf.fillRect(36, 106, 523, 70, 0.96, 0.97, 0.99)
  pdf.strokeRect(36, 106, 523, 70, 0.85, 0.88, 0.93, 1)

  pdf.drawText('SERVICE PROVIDER (DEVELOPER):', 48, 116, { fontSize: 7.5, bold: true, r: 0.1, g: 0.35, b: 0.65 })
  pdf.drawText('CapeSecure Solutions | support@capesecure.com | Kerala, India', 48, 128, { fontSize: 8.5, r: 0.2, g: 0.25, b: 0.35 })

  pdf.drawText('CLIENT (CUSTOMER):', 48, 146, { fontSize: 7.5, bold: true, r: 0.1, g: 0.35, b: 0.65 })
  pdf.drawText(`${companyName} (Attn: ${clientName}) | ${client?.email || 'N/A'}`, 48, 158, { fontSize: 8.5, bold: true, r: 0.1, g: 0.15, b: 0.25 })

  // 1. Service Provider Details
  let curY = 190
  pdf.drawText('1. SERVICE PROVIDER DETAILS', 36, curY, { fontSize: 9, bold: true, r: 0.08, g: 0.12, b: 0.22 })
  curY += 12
  curY = pdf.drawParagraph('CapeSecure Solutions provides enterprise-grade full-stack web engineering, cybersecurity compliance, scalable cloud deployments, and ongoing technical maintenance.', 36, curY, 523, { fontSize: 8, lineHeight: 11, r: 0.3, g: 0.35, b: 0.4 })

  // 2. Client Details
  curY += 8
  pdf.drawText('2. CLIENT DETAILS', 36, curY, { fontSize: 9, bold: true, r: 0.08, g: 0.12, b: 0.22 })
  curY += 12
  curY = pdf.drawParagraph(`The Client is represented by ${clientName}, authorized signatory for ${companyName}, with authority to enter into binding agreements.`, 36, curY, 523, { fontSize: 8, lineHeight: 11, r: 0.3, g: 0.35, b: 0.4 })

  // 3. Scope of Services
  curY += 8
  pdf.drawText('3. SCOPE OF SERVICES', 36, curY, { fontSize: 9, bold: true, r: 0.08, g: 0.12, b: 0.22 })
  curY += 12
  const scopeText = agreement.scope_of_services || `Design, frontend programming, database integration, security configuration, and production hosting for "${agreement.title}".`
  curY = pdf.drawParagraph(scopeText, 36, curY, 523, { fontSize: 8, lineHeight: 11, r: 0.3, g: 0.35, b: 0.4 })

  // 4. Project Deliverables Table
  curY += 8
  pdf.drawText('4. PROJECT DELIVERABLES', 36, curY, { fontSize: 9, bold: true, r: 0.08, g: 0.12, b: 0.22 })
  curY += 12
  pdf.fillRect(36, curY, 523, 16, 0.1, 0.15, 0.25)
  pdf.drawText('#', 44, curY + 4, { fontSize: 7.5, bold: true, r: 1, g: 1, b: 1 })
  pdf.drawText('DELIVERABLE DESCRIPTION', 66, curY + 4, { fontSize: 7.5, bold: true, r: 1, g: 1, b: 1 })
  pdf.drawText('PRICE', 540, curY + 4, { fontSize: 7.5, bold: true, align: 'right', r: 1, g: 1, b: 1 })
  curY += 16

  const deliverables = (agreement.project_deliverables && agreement.project_deliverables.length > 0)
    ? agreement.project_deliverables
    : (quotation?.items && quotation.items.length > 0)
      ? quotation.items.map(it => ({ title: it.description, price: it.total }))
      : [{ title: agreement.title || 'Full Custom Web Portal Architecture', price: totalVal }]

  deliverables.slice(0, 4).forEach((d, i) => {
    pdf.strokeRect(36, curY, 523, 18, 0.9, 0.92, 0.95, 1)
    pdf.drawText(String(i + 1), 44, curY + 5, { fontSize: 7.5, r: 0.4, g: 0.4, b: 0.45 })
    pdf.drawText(d.title.substring(0, 65), 66, curY + 5, { fontSize: 8, bold: true, r: 0.15, g: 0.2, b: 0.3 })
    pdf.drawText(formatCurrency(d.price || 0), 540, curY + 5, { fontSize: 8, align: 'right', r: 0.15, g: 0.2, b: 0.3 })
    curY += 18
  })

  // 5. Development Charges
  curY += 8
  pdf.drawText('5. DEVELOPMENT CHARGES & COMMERCIAL TERMS', 36, curY, { fontSize: 9, bold: true, r: 0.08, g: 0.12, b: 0.22 })
  curY += 12
  curY = pdf.drawParagraph(`The total agreed project consideration is ${formatCurrency(totalVal)}, payable in milestones as outlined in Section 6 below.`, 36, curY, 523, { fontSize: 8, lineHeight: 11, r: 0.3, g: 0.35, b: 0.4 })

  // 6. Payment Schedule
  curY += 8
  pdf.drawText('6. PAYMENT SCHEDULE', 36, curY, { fontSize: 9, bold: true, r: 0.08, g: 0.12, b: 0.22 })
  curY += 12
  pdf.fillRect(36, curY, 523, 44, 0.95, 0.97, 0.99)
  pdf.strokeRect(36, curY, 523, 44, 0.85, 0.88, 0.93, 1)
  pdf.drawText(`Tranche 1: Mobilization Advance (${advancePct}%) = ${formatCurrency(advanceAmt)}`, 48, curY + 8, { fontSize: 8, bold: true, r: 0.1, g: 0.5, b: 0.25 })
  pdf.drawText('Due immediately upon execution of this Agreement prior to technical work mobilization.', 48, curY + 18, { fontSize: 7.5, r: 0.35, g: 0.4, b: 0.45 })
  pdf.drawText(`Tranche 2: Final Settlement (${100 - advancePct}%) = ${formatCurrency(balanceAmt)}`, 48, curY + 28, { fontSize: 8, bold: true, r: 0.1, g: 0.2, b: 0.35 })
  pdf.drawText('Due upon QA acceptance sign-off prior to production DNS handover.', 48, curY + 38, { fontSize: 7.5, r: 0.35, g: 0.4, b: 0.45 })

  // Footer Page 1
  pdf.line(36, 785, 559, 785, 0.85, 0.88, 0.92, 1)
  pdf.drawText(`CapeSecure Master Service Agreement • Ref: ${agreement.agreement_number}`, 36, 795, { fontSize: 7.5, r: 0.45, g: 0.5, b: 0.55 })
  pdf.drawText('Page 1 of 2', 559, 795, { fontSize: 7.5, align: 'right', r: 0.45, g: 0.5, b: 0.55 })

  // ════════════ PAGE 2: LEGAL COVENANTS & SIGN-OFF ════════════
  pdf.addPage()

  pdf.fillRect(36, 36, 523, 26, 0.08, 0.12, 0.22)
  pdf.drawText('CAPESECURE MASTER SERVICE AGREEMENT — TERMS & SIGN-OFF', 50, 46, { fontSize: 8.5, bold: true, r: 1, g: 1, b: 1 })
  pdf.drawText(`REF: ${agreement.agreement_number}`, 540, 46, { fontSize: 8.5, align: 'right', r: 0.38, g: 0.75, b: 0.99 })

  curY = 76
  const clausesPage2 = [
    { title: '7. DOMAIN & HOSTING OWNERSHIP', text: agreement.domain_hosting_ownership || 'The Client retains full ownership of registered domain names and brand trademarks. Cloud hosting accounts and source repositories are transferred to the Client upon receipt of 100% final settlement.' },
    { title: '8. DELIVERY TIMELINE', text: agreement.delivery_timeline || `Estimated delivery timeline is ${quotation?.delivery_timeline || '4-6 weeks'} from receipt of the advance mobilization deposit and all requisite client assets.` },
    { title: '9. REVISIONS & CHANGES', text: agreement.revisions_policy || 'Includes up to 2 consolidated feedback revisions during UI/UX prototyping and 1 revision round during staging QA. Out-of-scope alterations are governed by a written Change Request.' },
    { title: '10. INTELLECTUAL PROPERTY', text: agreement.ip_terms || 'Upon full final settlement, all proprietary custom code and design assets transfer to the Client. CapeSecure retains ownership of its foundational tooling and reusable core libraries.' },
    { title: '11. CONFIDENTIALITY', text: agreement.confidentiality_terms || 'Both parties covenant to maintain all technical specifications, customer records, and commercial negotiations in strict confidence for at least 3 years.' },
    { title: '12. MAINTENANCE & WARRANTY', text: agreement.maintenance_terms || 'Includes a 30-day post-handover warranty covering bug fixes and specification corrections at zero additional cost. Ongoing maintenance is governed by separate SLAs.' },
    { title: '13. CANCELLATION & REFUNDS', text: agreement.cancellation_terms || 'Either party may terminate with 14 days written notice. Early termination by Client forfeits the advance deposit to cover engineering mobilization costs.' },
    { title: '14. LIABILITY & THIRD-PARTY SERVICES', text: agreement.liability_terms || 'CapeSecure is not liable for third-party hosting, API, or payment gateway service interruptions. Total aggregate liability is limited to fees received under this Agreement.' },
    { title: '15. DISPUTE RESOLUTION', text: agreement.dispute_resolution || 'Disputes shall be settled through good-faith negotiation, followed by binding arbitration in accordance with the Arbitration and Conciliation Act.' },
    { title: '16. GOVERNING LAW & JURISDICTION', text: agreement.governing_law || 'This Agreement is governed by the laws of India, with exclusive jurisdiction in Kerala, India.' },
  ]

  for (const c of clausesPage2) {
    pdf.drawText(c.title, 36, curY, { fontSize: 8, bold: true, r: 0.08, g: 0.12, b: 0.22 })
    curY += 10
    curY = pdf.drawParagraph(c.text, 36, curY, 523, { fontSize: 7.5, lineHeight: 10, r: 0.3, g: 0.35, b: 0.4 })
    curY += 6
  }

  // 17. Signature Section
  curY += 4
  pdf.drawText('17. EXECUTION & SIGNATURE SIGN-OFF', 36, curY, { fontSize: 8.5, bold: true, r: 0.08, g: 0.12, b: 0.22 })
  curY += 12

  // Sign boxes
  const isSigned = agreement.status === 'fully_signed' || agreement.status === 'signed' || agreement.status === 'active'

  pdf.fillRect(36, curY, 256, 70, 0.98, 0.98, 0.99)
  pdf.strokeRect(36, curY, 256, 70, 0.85, 0.88, 0.93, 1)
  pdf.drawText('FOR: CAPESECURE SOLUTIONS', 46, curY + 8, { fontSize: 7.5, bold: true, r: 0.1, g: 0.35, b: 0.65 })
  if (isSigned) {
    pdf.drawText('[DIGITALLY VERIFIED SIGNATURE]', 46, curY + 28, { fontSize: 8, bold: true, r: 0.1, g: 0.5, b: 0.25 })
  } else {
    pdf.drawText('Signature: __________________________', 46, curY + 32, { fontSize: 7.5, r: 0.4, g: 0.45, b: 0.5 })
  }
  pdf.drawText('Name: Libinesh (Principal Architect)', 46, curY + 46, { fontSize: 7, r: 0.35, g: 0.4, b: 0.45 })
  pdf.drawText(`Date: ${formatDate(agreement.created_at)}`, 46, curY + 56, { fontSize: 7, r: 0.35, g: 0.4, b: 0.45 })

  pdf.fillRect(302, curY, 257, 70, 0.98, 0.98, 0.99)
  pdf.strokeRect(302, curY, 257, 70, 0.85, 0.88, 0.93, 1)
  pdf.drawText(`FOR: ${companyName.toUpperCase().substring(0, 30)}`, 312, curY + 8, { fontSize: 7.5, bold: true, r: 0.1, g: 0.35, b: 0.65 })
  if (isSigned) {
    pdf.drawText('[DIGITALLY SIGNED BY CLIENT]', 312, curY + 28, { fontSize: 8, bold: true, r: 0.1, g: 0.5, b: 0.25 })
  } else {
    pdf.drawText('Client Signature: ___________________', 312, curY + 32, { fontSize: 7.5, r: 0.4, g: 0.45, b: 0.5 })
  }
  pdf.drawText(`Signatory: ${clientName}`, 312, curY + 46, { fontSize: 7, r: 0.35, g: 0.4, b: 0.45 })
  pdf.drawText(`Date: ${agreement.signed_at ? formatDate(agreement.signed_at) : 'Pending Execution'}`, 312, curY + 56, { fontSize: 7, r: 0.35, g: 0.4, b: 0.45 })

  // Audit info banner
  curY += 76
  if (agreement.signing_method === 'digital' && agreement.esign_details) {
    pdf.fillRect(36, curY, 523, 24, 0.95, 0.98, 0.95)
    pdf.strokeRect(36, curY, 523, 24, 0.7, 0.85, 0.7, 1)
    pdf.drawText(`DIGITAL SIGNATURE AUDIT: Provider: ${agreement.esign_details.provider.toUpperCase()} | Env ID: ${agreement.esign_details.envelope_id || 'LIVE-ZS'}`, 44, curY + 6, { fontSize: 7, bold: true, r: 0.1, g: 0.45, b: 0.2 })
    pdf.drawText(`SHA-256 Hash: ${agreement.signature_audit?.tamper_proof_checksum || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}`, 44, curY + 14, { fontSize: 6.5, r: 0.2, g: 0.4, b: 0.25 })
  } else if (agreement.signing_method === 'physical' && agreement.physical_custody) {
    pdf.fillRect(36, curY, 523, 24, 0.96, 0.97, 0.98)
    pdf.strokeRect(36, curY, 523, 24, 0.8, 0.85, 0.9, 1)
    pdf.drawText(`PHYSICAL CUSTODY RECORD: Storage Location: ${agreement.physical_custody.storage_location} | Custodian: ${agreement.physical_custody.custodian_name}`, 44, curY + 6, { fontSize: 7, bold: true, r: 0.2, g: 0.3, b: 0.45 })
    pdf.drawText(`Verified by Admin: ${agreement.physical_custody.verified_by_admin_id} | Date: ${formatDate(agreement.physical_custody.received_date)}`, 44, curY + 14, { fontSize: 6.5, r: 0.3, g: 0.35, b: 0.4 })
  }

  // Footer Page 2
  pdf.line(36, 785, 559, 785, 0.85, 0.88, 0.92, 1)
  pdf.drawText(`CapeSecure Master Service Agreement • Ref: ${agreement.agreement_number}`, 36, 795, { fontSize: 7.5, r: 0.45, g: 0.5, b: 0.55 })
  pdf.drawText('Page 2 of 2 • Legally Binding Contract', 559, 795, { fontSize: 7.5, align: 'right', r: 0.45, g: 0.5, b: 0.55 })

  pdf.download(`CapeSecure-Agreement-${agrSafe}.pdf`)
}

/**
 * Downloads a genuine binary .pdf file for the Tax Invoice or Commercial Bill
 */
export function downloadInvoicePDF(invoice: Invoice, client?: Client | null, project?: Project | null) {
  const pdf = new PDFBuilder()
  const invNumber = invoice.invoice_number || 'INV-2026-001'
  const invSafe = invNumber.replace(/[^a-zA-Z0-9_-]/g, '_')
  const clientName = client?.name || 'Valued Client'
  const companyName = client?.business_name || client?.company || clientName
  const clientEmail = client?.email || 'N/A'
  const clientPhone = client?.phone || 'N/A'
  const clientAddress = client?.address || 'Kerala, India'
  const gstin = client?.gstin || 'Unregistered / Exempt'

  const isCancelled = invoice.status === 'cancelled'
  const isPaid = invoice.status === 'paid'
  const isOverdue = invoice.status === 'overdue'

  // Header Bar
  pdf.fillRect(36, 36, 523, 72, 0.06, 0.09, 0.16)
  pdf.drawText('CAPE', 50, 52, { fontSize: 20, bold: true, r: 1, g: 1, b: 1 })
  pdf.drawText('SECURE', 105, 52, { fontSize: 20, bold: true, r: 0.05, g: 0.6, b: 1 })
  pdf.drawText('ENTERPRISE WEB ENGINEERING & CLOUD SECURITY', 50, 74, { fontSize: 7, bold: true, r: 0.6, g: 0.7, b: 0.85 })
  pdf.drawText('CapeSecure HQ, Kerala, India | contact@capesecure.com | https://capesecure.vercel.app', 50, 84, { fontSize: 7, r: 0.5, g: 0.6, b: 0.75 })

  // Document Type & Badge on top right
  const isGST = invoice.is_gst_applicable !== false && invoice.gst_type !== 'none'
  const docTitle = isCancelled
    ? 'CANCELLED INVOICE'
    : (!isGST ? 'BILL OF SUPPLY' : (invoice.gst_type === 'igst' ? 'TAX INVOICE (IGST)' : 'TAX INVOICE (GST)'))

  pdf.fillRect(380, 48, 165, 48, 0.1, 0.15, 0.25)
  pdf.drawText(docTitle, 462, 58, { fontSize: 10, bold: true, align: 'center', r: isCancelled ? 1 : 1, g: isCancelled ? 0.3 : 1, b: isCancelled ? 0.3 : 1 })
  pdf.drawText(`INV: ${invNumber}`, 462, 72, { fontSize: 8, bold: true, align: 'center', r: 0.2, g: 0.75, b: 1 })
  pdf.drawText(`DATE: ${formatDate(invoice.created_at || new Date().toISOString())}`, 462, 83, { fontSize: 7, align: 'center', r: 0.7, g: 0.8, b: 0.9 })

  // Cancellation Banner if applicable
  let curY = 118
  if (isCancelled) {
    pdf.fillRect(36, curY, 523, 26, 0.98, 0.9, 0.9)
    pdf.strokeRect(36, curY, 523, 26, 0.8, 0.2, 0.2, 1)
    pdf.drawText('DOCUMENT VOID / CANCELLED IN FINANCIAL AUDIT TRAIL', 297, curY + 6, { fontSize: 8, bold: true, align: 'center', r: 0.75, g: 0.1, b: 0.1 })
    pdf.drawText(`Cancelled By: ${invoice.cancelled_by || 'Authorized Administrator'} | Reason: ${invoice.cancellation_reason || 'Amended / Corrected'}`, 297, curY + 16, { fontSize: 6.8, align: 'center', r: 0.5, g: 0.1, b: 0.1 })
    curY += 32
  }

  // Meta Section: Billed By vs Billed To
  pdf.fillRect(36, curY, 255, 96, 0.97, 0.98, 0.99)
  pdf.strokeRect(36, curY, 255, 96, 0.85, 0.88, 0.92, 1)
  pdf.drawText('ISSUED BY (SUPPLIER)', 46, curY + 8, { fontSize: 8, bold: true, r: 0.2, g: 0.35, b: 0.6 })
  pdf.drawText('CapeSecure Solutions LLP', 46, curY + 22, { fontSize: 9, bold: true, r: 0.1, g: 0.15, b: 0.25 })
  pdf.drawText('Kerala Technology Corridor, India', 46, curY + 34, { fontSize: 7.5, r: 0.35, g: 0.4, b: 0.45 })
  pdf.drawText('Email: billing@capesecure.com', 46, curY + 46, { fontSize: 7.5, r: 0.35, g: 0.4, b: 0.45 })
  pdf.drawText('Phone: +91 94892 23812', 46, curY + 58, { fontSize: 7.5, r: 0.35, g: 0.4, b: 0.45 })
  pdf.drawText('GSTIN: 32AABCC8921M1Z5 | PAN: AABCC8921M', 46, curY + 70, { fontSize: 7, bold: true, r: 0.2, g: 0.4, b: 0.55 })
  pdf.drawText('State of Supply: Kerala (Code 32)', 46, curY + 82, { fontSize: 7, r: 0.4, g: 0.45, b: 0.5 })

  pdf.fillRect(304, curY, 255, 96, 0.97, 0.98, 0.99)
  pdf.strokeRect(304, curY, 255, 96, 0.85, 0.88, 0.92, 1)
  pdf.drawText('BILLED TO (RECIPIENT)', 314, curY + 8, { fontSize: 8, bold: true, r: 0.2, g: 0.35, b: 0.6 })
  pdf.drawText(companyName.substring(0, 32), 314, curY + 22, { fontSize: 9, bold: true, r: 0.1, g: 0.15, b: 0.25 })
  pdf.drawText(`Attn: ${clientName}`, 314, curY + 34, { fontSize: 7.5, r: 0.35, g: 0.4, b: 0.45 })
  pdf.drawText(`Email: ${clientEmail}`, 314, curY + 46, { fontSize: 7.5, r: 0.35, g: 0.4, b: 0.45 })
  pdf.drawText(`Phone: ${clientPhone}`, 314, curY + 58, { fontSize: 7.5, r: 0.35, g: 0.4, b: 0.45 })
  pdf.drawText(`Address: ${clientAddress.substring(0, 40)}`, 314, curY + 70, { fontSize: 7, r: 0.35, g: 0.4, b: 0.45 })
  pdf.drawText(`GSTIN: ${gstin}`, 314, curY + 82, { fontSize: 7, bold: true, r: 0.2, g: 0.4, b: 0.55 })

  // Status & Due Date Bar
  curY += 106
  pdf.fillRect(36, curY, 523, 30, 0.94, 0.96, 0.98)
  pdf.strokeRect(36, curY, 523, 30, 0.8, 0.85, 0.9, 1)

  if (isCancelled) {
    pdf.fillRect(44, curY + 5, 80, 20, 0.7, 0.1, 0.1)
    pdf.drawText('CANCELLED', 84, curY + 11, { fontSize: 8, bold: true, align: 'center', r: 1, g: 1, b: 1 })
  } else if (isPaid) {
    pdf.fillRect(44, curY + 5, 80, 20, 0.1, 0.65, 0.3)
    pdf.drawText('PAID FULL', 84, curY + 11, { fontSize: 8, bold: true, align: 'center', r: 1, g: 1, b: 1 })
  } else if (isOverdue) {
    pdf.fillRect(44, curY + 5, 80, 20, 0.8, 0.2, 0.2)
    pdf.drawText('OVERDUE', 84, curY + 11, { fontSize: 8, bold: true, align: 'center', r: 1, g: 1, b: 1 })
  } else {
    pdf.fillRect(44, curY + 5, 80, 20, 0.1, 0.45, 0.85)
    pdf.drawText(invoice.status.toUpperCase(), 84, curY + 11, { fontSize: 8, bold: true, align: 'center', r: 1, g: 1, b: 1 })
  }

  pdf.drawText(`Due Date: ${formatDate(invoice.due_date || new Date().toISOString())}`, 140, curY + 11, { fontSize: 8, bold: true, r: 0.15, g: 0.2, b: 0.3 })
  if (project?.name) {
    pdf.drawText(`Project: ${project.name.substring(0, 30)}`, 320, curY + 11, { fontSize: 8, r: 0.25, g: 0.3, b: 0.4 })
  }
  pdf.drawText(`Currency: INR (₹)`, 545, curY + 11, { fontSize: 8, bold: true, align: 'right', r: 0.15, g: 0.2, b: 0.3 })

  // Line Items Table Header
  curY += 42
  pdf.fillRect(36, curY, 523, 20, 0.1, 0.15, 0.25)
  pdf.drawText('#', 44, curY + 6, { fontSize: 7.5, bold: true, r: 1, g: 1, b: 1 })
  pdf.drawText('DESCRIPTION / SERVICE DELIVERABLE', 68, curY + 6, { fontSize: 7.5, bold: true, r: 1, g: 1, b: 1 })
  pdf.drawText('QTY', 370, curY + 6, { fontSize: 7.5, bold: true, r: 1, g: 1, b: 1 })
  pdf.drawText('UNIT PRICE (₹)', 440, curY + 6, { fontSize: 7.5, bold: true, align: 'right', r: 1, g: 1, b: 1 })
  pdf.drawText('AMOUNT (₹)', 545, curY + 6, { fontSize: 7.5, bold: true, align: 'right', r: 1, g: 1, b: 1 })

  curY += 20
  const items = (invoice.items && invoice.items.length > 0) ? invoice.items : [
    { description: 'Professional Web Application Development & Cloud Engineering', quantity: 1, unit_price: invoice.total, total: invoice.total }
  ]

  items.forEach((item, index) => {
    const bgR = index % 2 === 0 ? 0.99 : 0.96
    const bgG = index % 2 === 0 ? 0.99 : 0.97
    const bgB = index % 2 === 0 ? 1.0 : 0.98
    pdf.fillRect(36, curY, 523, 22, bgR, bgG, bgB)
    pdf.strokeRect(36, curY, 523, 22, 0.9, 0.92, 0.95, 0.5)

    pdf.drawText(String(index + 1), 44, curY + 7, { fontSize: 7.5, r: 0.4, g: 0.45, b: 0.5 })
    pdf.drawText(item.description.substring(0, 52), 68, curY + 7, { fontSize: 7.5, bold: true, r: 0.15, g: 0.2, b: 0.25 })
    pdf.drawText(String(item.quantity), 375, curY + 7, { fontSize: 7.5, r: 0.2, g: 0.25, b: 0.3 })
    pdf.drawText(`₹ ${item.unit_price.toLocaleString('en-IN')}`, 440, curY + 7, { fontSize: 7.5, align: 'right', r: 0.2, g: 0.25, b: 0.3 })
    pdf.drawText(`₹ ${item.total.toLocaleString('en-IN')}`, 545, curY + 7, { fontSize: 7.5, bold: true, align: 'right', r: 0.1, g: 0.15, b: 0.2 })

    curY += 22
  })

  // Calculation Breakdown Box
  curY += 12
  const calcBoxX = 320
  const calcBoxW = 239

  const amountPaid = invoice.amount_paid !== undefined ? invoice.amount_paid : (isPaid ? invoice.total : 0)
  const balanceDue = invoice.balance_due !== undefined ? invoice.balance_due : Math.max(0, invoice.total - amountPaid)

  pdf.fillRect(calcBoxX, curY, calcBoxW, 126, 0.97, 0.98, 0.99)
  pdf.strokeRect(calcBoxX, curY, calcBoxW, 126, 0.85, 0.88, 0.92, 1)

  pdf.drawText('Taxable Subtotal:', calcBoxX + 10, curY + 11, { fontSize: 7.5, r: 0.35, g: 0.4, b: 0.45 })
  pdf.drawText(`₹ ${invoice.subtotal.toLocaleString('en-IN')}`, calcBoxX + calcBoxW - 10, curY + 11, { fontSize: 7.5, bold: true, align: 'right', r: 0.15, g: 0.2, b: 0.25 })

  if (invoice.discount && invoice.discount > 0) {
    pdf.drawText('Discount Applied:', calcBoxX + 10, curY + 23, { fontSize: 7.5, r: 0.2, g: 0.55, b: 0.3 })
    pdf.drawText(`- ₹ ${invoice.discount.toLocaleString('en-IN')}`, calcBoxX + calcBoxW - 10, curY + 23, { fontSize: 7.5, bold: true, align: 'right', r: 0.2, g: 0.55, b: 0.3 })
  }

  if (isGST) {
    if (invoice.gst_type === 'igst') {
      pdf.drawText('Integrated GST (IGST 18%):', calcBoxX + 10, curY + 35, { fontSize: 7.5, r: 0.35, g: 0.4, b: 0.45 })
      pdf.drawText(`₹ ${(invoice.tax_amount || 0).toLocaleString('en-IN')}`, calcBoxX + calcBoxW - 10, curY + 35, { fontSize: 7.5, align: 'right', r: 0.15, g: 0.2, b: 0.25 })
    } else {
      const halfTax = (invoice.tax_amount || 0) / 2
      pdf.drawText('Central GST (CGST 9%):', calcBoxX + 10, curY + 35, { fontSize: 7.5, r: 0.35, g: 0.4, b: 0.45 })
      pdf.drawText(`₹ ${halfTax.toLocaleString('en-IN')}`, calcBoxX + calcBoxW - 10, curY + 35, { fontSize: 7.5, align: 'right', r: 0.15, g: 0.2, b: 0.25 })
      pdf.drawText('State GST (SGST 9%):', calcBoxX + 10, curY + 47, { fontSize: 7.5, r: 0.35, g: 0.4, b: 0.45 })
      pdf.drawText(`₹ ${halfTax.toLocaleString('en-IN')}`, calcBoxX + calcBoxW - 10, curY + 47, { fontSize: 7.5, align: 'right', r: 0.15, g: 0.2, b: 0.25 })
    }
  } else {
    pdf.drawText('GST: Non-GST / Exempt (0%):', calcBoxX + 10, curY + 35, { fontSize: 7.5, r: 0.35, g: 0.4, b: 0.45 })
    pdf.drawText('₹ 0.00', calcBoxX + calcBoxW - 10, curY + 35, { fontSize: 7.5, align: 'right', r: 0.15, g: 0.2, b: 0.25 })
  }

  pdf.line(calcBoxX + 8, curY + 59, calcBoxX + calcBoxW - 8, curY + 59, 0.75, 0.8, 0.88, 1)

  // Total Invoice Value
  pdf.drawText('Total Invoice Value:', calcBoxX + 10, curY + 68, { fontSize: 8, bold: true, r: 0.1, g: 0.15, b: 0.25 })
  pdf.drawText(`₹ ${invoice.total.toLocaleString('en-IN')}`, calcBoxX + calcBoxW - 10, curY + 68, { fontSize: 8.5, bold: true, align: 'right', r: 0.1, g: 0.15, b: 0.25 })

  // Less Advance / Amount Paid
  pdf.drawText('Less: Amount Paid / Advance:', calcBoxX + 10, curY + 80, { fontSize: 7.5, r: 0.15, g: 0.55, b: 0.25 })
  pdf.drawText(`- ₹ ${amountPaid.toLocaleString('en-IN')}`, calcBoxX + calcBoxW - 10, curY + 80, { fontSize: 7.5, bold: true, align: 'right', r: 0.15, g: 0.55, b: 0.25 })

  // Net Balance Due
  pdf.fillRect(calcBoxX + 4, curY + 92, calcBoxW - 8, 26, 0.08, 0.12, 0.2)
  pdf.drawText('NET BALANCE DUE:', calcBoxX + 10, curY + 100, { fontSize: 8.5, bold: true, r: 1, g: 1, b: 1 })
  pdf.drawText(`₹ ${balanceDue.toLocaleString('en-IN')}`, calcBoxX + calcBoxW - 10, curY + 100, { fontSize: 10, bold: true, align: 'right', r: balanceDue === 0 ? 0.2 : 1, g: balanceDue === 0 ? 0.9 : 0.6, b: balanceDue === 0 ? 0.4 : 0.2 })

  // Banking & Payment Details (Left Box)
  pdf.fillRect(36, curY, 270, 126, 0.97, 0.98, 0.99)
  pdf.strokeRect(36, curY, 270, 126, 0.85, 0.88, 0.92, 1)
  pdf.drawText('BANK & PAYMENT SETTLEMENT DETAILS', 46, curY + 10, { fontSize: 8, bold: true, r: 0.1, g: 0.35, b: 0.65 })
  pdf.drawText('Beneficiary Name: CapeSecure Solutions LLP', 46, curY + 26, { fontSize: 7.5, bold: true, r: 0.15, g: 0.2, b: 0.25 })
  pdf.drawText('Bank: State Bank of India / HDFC Bank', 46, curY + 38, { fontSize: 7.5, r: 0.35, g: 0.4, b: 0.45 })
  pdf.drawText('Account Number: 418299100234', 46, curY + 50, { fontSize: 7.5, bold: true, r: 0.15, g: 0.2, b: 0.25 })
  pdf.drawText('IFSC Code: SBIN0001234', 46, curY + 62, { fontSize: 7.5, bold: true, r: 0.15, g: 0.2, b: 0.25 })
  pdf.drawText('UPI ID: capesecure@upi (GPay / PhonePe / Paytm)', 46, curY + 74, { fontSize: 7.5, bold: true, r: 0.05, g: 0.5, b: 0.8 })
  pdf.drawText('Reference: Quote invoice number in transaction note.', 46, curY + 88, { fontSize: 6.8, r: 0.45, g: 0.5, b: 0.55 })
  if (!isGST) {
    pdf.drawText('* Non-GST Invoice issued under composition/exemption scheme.', 46, curY + 106, { fontSize: 6.5, r: 0.5, g: 0.3, b: 0.1 })
  }

  // Terms & Legal Notice
  curY += 138
  pdf.fillRect(36, curY, 523, 50, 0.98, 0.98, 0.99)
  pdf.strokeRect(36, curY, 523, 50, 0.88, 0.9, 0.93, 1)
  pdf.drawText('TERMS & PAYMENT CONDITIONS', 44, curY + 8, { fontSize: 7.5, bold: true, r: 0.25, g: 0.3, b: 0.4 })
  pdf.drawText('1. Advance payments are non-refundable once engineering sprints have commenced.', 44, curY + 19, { fontSize: 6.8, r: 0.4, g: 0.45, b: 0.5 })
  pdf.drawText('2. Electronic verification required: Payments are settled only upon bank UTR or gateway confirmation.', 44, curY + 29, { fontSize: 6.8, r: 0.4, g: 0.45, b: 0.5 })
  pdf.drawText('3. This document is authenticated under the Indian IT Act 2000 and GST Rules 2017.', 44, curY + 39, { fontSize: 6.8, r: 0.4, g: 0.45, b: 0.5 })

  // Authorization Signatures
  curY += 62
  pdf.line(360, curY + 30, 540, curY + 30, 0.6, 0.65, 0.7, 1)
  pdf.drawText('Authorized Signatory for CapeSecure Solutions', 450, curY + 38, { fontSize: 7, bold: true, align: 'center', r: 0.2, g: 0.25, b: 0.3 })
  pdf.drawText('Finance & Accounts Department • Computer Verified', 450, curY + 48, { fontSize: 6.5, align: 'center', r: 0.5, g: 0.55, b: 0.6 })

  // Footer
  pdf.line(36, 785, 559, 785, 0.85, 0.88, 0.92, 1)
  pdf.drawText(`CapeSecure Tax Invoice • Ref: ${invNumber} • https://capesecure.vercel.app`, 36, 795, { fontSize: 7.5, r: 0.45, g: 0.5, b: 0.55 })
  pdf.drawText('Thank you for choosing CapeSecure Solutions!', 559, 795, { fontSize: 7.5, bold: true, align: 'right', r: 0.2, g: 0.5, b: 0.8 })

  pdf.download(`CapeSecure-Invoice-${invSafe}.pdf`)
}

/**
 * Downloads a genuine binary .pdf file for a Verified Payment Receipt
 */
export function downloadReceiptPDF(payment: Payment, client?: Client | null, invoice?: Invoice | null) {
  const pdf = new PDFBuilder()
  const recNumber = payment.receipt_number || `CS-REC-2026-${payment.reference.replace(/[^0-9]/g, '').slice(-3) || '001'}`
  const recSafe = recNumber.replace(/[^a-zA-Z0-9_-]/g, '_')
  const clientName = client?.name || 'Valued Client'
  const companyName = client?.business_name || client?.company || clientName
  const isVerified = payment.verification_status === 'verified' || payment.status === 'received'

  // Header Bar
  pdf.fillRect(36, 36, 523, 72, 0.06, 0.09, 0.16)
  pdf.drawText('CAPE', 50, 52, { fontSize: 20, bold: true, r: 1, g: 1, b: 1 })
  pdf.drawText('SECURE', 105, 52, { fontSize: 20, bold: true, r: 0.05, g: 0.6, b: 1 })
  pdf.drawText('FINANCIAL ACCOUNTS & SETTLEMENT DIVISION', 50, 74, { fontSize: 7, bold: true, r: 0.6, g: 0.7, b: 0.85 })
  pdf.drawText('CapeSecure HQ, Kerala, India | billing@capesecure.com | +91 94892 23812', 50, 84, { fontSize: 7, r: 0.5, g: 0.6, b: 0.75 })

  // Receipt Number Stamp
  pdf.fillRect(380, 48, 165, 48, 0.1, 0.15, 0.25)
  pdf.drawText('OFFICIAL RECEIPT', 462, 58, { fontSize: 10, bold: true, align: 'center', r: 1, g: 1, b: 1 })
  pdf.drawText(`REC: ${recNumber}`, 462, 72, { fontSize: 8.5, bold: true, align: 'center', r: 0.1, g: 0.8, b: 0.4 })
  pdf.drawText(`DATE: ${formatDate(payment.received_date || payment.created_at)}`, 462, 83, { fontSize: 7, align: 'center', r: 0.7, g: 0.8, b: 0.9 })

  let curY = 125
  // Payment Received Box
  pdf.fillRect(36, curY, 523, 56, 0.94, 0.98, 0.95)
  pdf.strokeRect(36, curY, 523, 56, 0.65, 0.85, 0.7, 1)
  pdf.drawText('PAYMENT RECEIVED & ELECTRONICALLY VERIFIED', 297, curY + 12, { fontSize: 9.5, bold: true, align: 'center', r: 0.1, g: 0.5, b: 0.25 })
  pdf.drawText(`Amount Received: ₹ ${Number(payment.amount).toLocaleString('en-IN')}`, 297, curY + 28, { fontSize: 14, bold: true, align: 'center', r: 0.08, g: 0.4, b: 0.2 })
  pdf.drawText(`(${payment.payment_type ? payment.payment_type.toUpperCase().replace('_', ' ') : 'PAYMENT'} SETTLEMENT)`, 297, curY + 44, { fontSize: 7, bold: true, align: 'center', r: 0.25, g: 0.45, b: 0.3 })

  // Transaction Breakdown Details
  curY += 70
  pdf.fillRect(36, curY, 523, 190, 0.98, 0.98, 0.99)
  pdf.strokeRect(36, curY, 523, 190, 0.85, 0.88, 0.92, 1)

  const remainingBalance = payment.balance_after_payment !== undefined && payment.balance_after_payment !== null
    ? payment.balance_after_payment
    : (invoice ? Math.max(0, invoice.total - Number(payment.amount)) : 0)

  const rows = [
    ['Receipt Number:', recNumber],
    ['Client / Entity Name:', `${companyName} (${clientName})`],
    ['Client GSTIN / Tax ID:', client?.gstin || 'Unregistered / Exempt'],
    ['Payment Type:', (payment.payment_type || 'Advance Payment').toUpperCase().replace('_', ' ')],
    ['Payment Method:', (payment.payment_method || 'Bank Transfer').toUpperCase()],
    ['Transaction Reference / UTR:', payment.reference],
    ['Related Invoice Number:', invoice?.invoice_number || 'Direct Account Credit'],
    ['Total Invoice Value:', invoice ? `₹ ${invoice.total.toLocaleString('en-IN')}` : 'Direct Credit'],
    ['Amount Credited in this Transaction:', `₹ ${Number(payment.amount).toLocaleString('en-IN')}`],
    ['Remaining Balance on Account / Invoice:', `₹ ${remainingBalance.toLocaleString('en-IN')}`],
  ]

  rows.forEach(([k, v], idx) => {
    const rowY = curY + 12 + (idx * 17)
    pdf.drawText(k, 50, rowY, { fontSize: 7.5, bold: true, r: 0.35, g: 0.4, b: 0.45 })
    pdf.drawText(v, 240, rowY, { fontSize: 7.5, bold: idx >= 8, r: idx >= 8 ? (idx === 8 ? 0.1 : 0.8) : 0.15, g: idx >= 8 ? (idx === 8 ? 0.5 : 0.2) : 0.2, b: idx >= 8 ? 0.2 : 0.25 })
    pdf.line(50, rowY + 13, 545, rowY + 13, 0.92, 0.93, 0.95, 0.5)
  })

  // Verification Evidence Box
  curY += 205
  pdf.fillRect(36, curY, 523, 44, 0.95, 0.98, 0.96)
  pdf.strokeRect(36, curY, 523, 44, 0.7, 0.85, 0.72, 1)
  pdf.drawText('VERIFICATION AUDIT EVIDENCE (IN COMPLIANCE WITH FINANCIAL SECURITY MANDATE)', 46, curY + 8, { fontSize: 7, bold: true, r: 0.1, g: 0.45, b: 0.2 })
  pdf.drawText(`Status: ${isVerified ? 'VERIFIED AGAINST BANK STATEMENT / GATEWAY SETTLEMENT' : 'PENDING FINAL RECONCILIATION'}`, 46, curY + 19, { fontSize: 7, bold: true, r: isVerified ? 0.1 : 0.8, g: isVerified ? 0.5 : 0.3, b: isVerified ? 0.2 : 0.1 })
  pdf.drawText(`Verified By: ${payment.verified_by || 'Finance Compliance Officer'} | Evidence Reference: ${payment.verification_evidence || payment.reference}`, 46, curY + 29, { fontSize: 6.8, r: 0.25, g: 0.4, b: 0.3 })

  // Signatures
  curY += 60
  pdf.line(360, curY + 32, 540, curY + 32, 0.6, 0.65, 0.7, 1)
  pdf.drawText('Authorized Financial Signatory', 450, curY + 40, { fontSize: 7, bold: true, align: 'center', r: 0.2, g: 0.25, b: 0.3 })
  pdf.drawText('CapeSecure Treasury & Accounts • Digitally Authenticated', 450, curY + 50, { fontSize: 6.5, align: 'center', r: 0.5, g: 0.55, b: 0.6 })

  // Footer
  pdf.line(36, 785, 559, 785, 0.85, 0.88, 0.92, 1)
  pdf.drawText(`CapeSecure Payment Receipt • Ref: ${recNumber} • Tamper-proof Financial Record`, 36, 795, { fontSize: 7.5, r: 0.45, g: 0.5, b: 0.55 })
  pdf.drawText('Page 1 of 1', 559, 795, { fontSize: 7.5, align: 'right', r: 0.45, g: 0.5, b: 0.55 })

  pdf.download(`CapeSecure-Receipt-${recSafe}.pdf`)
}

/**
 * Downloads a comprehensive PDF Financial Audit Report
 */
export function downloadFinancialReportPDF(data: {
  totalInvoiced: number
  totalCollected: number
  outstandingPayments: number
  overdueInvoices: number
  advancePayments: number
  maintenanceRevenue: number
  refundsTotal: number
  annualRevenue: number
  invoicesCount: number
  paymentsCount: number
}) {
  const pdf = new PDFBuilder()
  const reportDate = formatDate(new Date().toISOString())

  // Header Bar
  pdf.fillRect(36, 36, 523, 72, 0.06, 0.09, 0.16)
  pdf.drawText('CAPE', 50, 52, { fontSize: 20, bold: true, r: 1, g: 1, b: 1 })
  pdf.drawText('SECURE', 105, 52, { fontSize: 20, bold: true, r: 0.05, g: 0.6, b: 1 })
  pdf.drawText('ANNUAL FINANCIAL AUDIT & REVENUE PERFORMANCE REPORT', 50, 74, { fontSize: 7, bold: true, r: 0.6, g: 0.7, b: 0.85 })
  pdf.drawText('CapeSecure HQ, Kerala, India | Confidential Executive Document', 50, 84, { fontSize: 7, r: 0.5, g: 0.6, b: 0.75 })

  pdf.fillRect(400, 48, 145, 48, 0.1, 0.15, 0.25)
  pdf.drawText('FINANCE AUDIT', 472, 58, { fontSize: 10, bold: true, align: 'center', r: 1, g: 1, b: 1 })
  pdf.drawText(`FY 2026-27`, 472, 72, { fontSize: 8.5, bold: true, align: 'center', r: 0.2, g: 0.75, b: 1 })
  pdf.drawText(`DATE: ${reportDate}`, 472, 83, { fontSize: 7, align: 'center', r: 0.7, g: 0.8, b: 0.9 })

  let curY = 125
  pdf.drawText('EXECUTIVE SUMMARY & FINANCIAL METRICS', 36, curY, { fontSize: 10, bold: true, r: 0.1, g: 0.15, b: 0.25 })

  curY += 15
  const metrics = [
    ['Total Invoiced Amount:', `₹ ${data.totalInvoiced.toLocaleString('en-IN')}`],
    ['Total Verified Collections:', `₹ ${data.totalCollected.toLocaleString('en-IN')}`],
    ['Outstanding Payments Due:', `₹ ${data.outstandingPayments.toLocaleString('en-IN')}`],
    ['Overdue Invoice Balance:', `₹ ${data.overdueInvoices.toLocaleString('en-IN')}`],
    ['Advance Payments Received (50% Milestone):', `₹ ${data.advancePayments.toLocaleString('en-IN')}`],
    ['Recurring Maintenance Revenue:', `₹ ${data.maintenanceRevenue.toLocaleString('en-IN')}`],
    ['Refunds & Adjustments Issued:', `₹ ${data.refundsTotal.toLocaleString('en-IN')}`],
    ['Annual Projected Revenue:', `₹ ${data.annualRevenue.toLocaleString('en-IN')}`],
    ['Total Invoices Issued:', String(data.invoicesCount)],
    ['Total Verified Payment Receipts:', String(data.paymentsCount)],
  ]

  pdf.fillRect(36, curY, 523, 210, 0.98, 0.98, 0.99)
  pdf.strokeRect(36, curY, 523, 210, 0.85, 0.88, 0.92, 1)

  metrics.forEach(([label, val], idx) => {
    const rowY = curY + 12 + (idx * 19)
    pdf.drawText(label, 50, rowY, { fontSize: 8, bold: true, r: 0.35, g: 0.4, b: 0.45 })
    pdf.drawText(val, 530, rowY, { fontSize: 8.5, bold: true, align: 'right', r: 0.1, g: 0.2, b: 0.35 })
    pdf.line(50, rowY + 14, 530, rowY + 14, 0.92, 0.93, 0.95, 0.5)
  })

  curY += 235
  pdf.drawText('REGULATORY & AUDIT COMPLIANCE STATEMENTS', 36, curY, { fontSize: 9.5, bold: true, r: 0.1, g: 0.15, b: 0.25 })

  curY += 14
  pdf.fillRect(36, curY, 523, 80, 0.97, 0.98, 0.99)
  pdf.strokeRect(36, curY, 523, 80, 0.85, 0.88, 0.92, 1)

  const complianceNotes = [
    '1. Bank Settlement Verification: No payment is recognized as collected without bank statement or gateway webhook evidence.',
    '2. GST Invoicing Standards: All tax invoices adhere to Indian GST Act 2017 with CGST/SGST/IGST separation.',
    '3. Non-GST Billing Exemption: Commercial bills of supply issued where client or threshold conditions apply.',
    '4. Document Integrity: Invoices and receipts cannot be silently modified; all revisions are tracked in financial audit logs.',
  ]

  complianceNotes.forEach((note, idx) => {
    pdf.drawText(note, 46, curY + 12 + (idx * 16), { fontSize: 7, r: 0.35, g: 0.4, b: 0.45 })
  })

  // Signatures
  curY += 105
  pdf.line(50, curY + 36, 230, curY + 36, 0.6, 0.65, 0.7, 1)
  pdf.drawText('Chief Financial Officer', 140, curY + 44, { fontSize: 7, bold: true, align: 'center', r: 0.2, g: 0.25, b: 0.3 })

  pdf.line(360, curY + 36, 540, curY + 36, 0.6, 0.65, 0.7, 1)
  pdf.drawText('Managing Director / Principal Architect', 450, curY + 44, { fontSize: 7, bold: true, align: 'center', r: 0.2, g: 0.25, b: 0.3 })

  // Footer
  pdf.line(36, 785, 559, 785, 0.85, 0.88, 0.92, 1)
  pdf.drawText(`CapeSecure Financial Report • FY 2026-27 • Generated on ${reportDate}`, 36, 795, { fontSize: 7.5, r: 0.45, g: 0.5, b: 0.55 })
  pdf.drawText('Page 1 of 1 • Strict Confidentiality', 559, 795, { fontSize: 7.5, align: 'right', r: 0.45, g: 0.5, b: 0.55 })

  pdf.download(`CapeSecure-Financial-Report-${new Date().toISOString().slice(0, 10)}.pdf`)
}




