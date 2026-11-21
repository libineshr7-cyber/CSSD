import type { Requirement, Client, Lead, Quotation } from '../types/database'
import { formatCurrency, formatDate } from './utils'

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

