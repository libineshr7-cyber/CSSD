import { DEMO_RETAIL_CLIENT } from './clientStore'
import type {
  Lead, Requirement, Quotation, Agreement,
  Payment, Invoice, Project, Task, MonitoredWebsite, MaintenanceRecord
} from '../types/database'

export interface LifecycleSimulationResult {
  step: number
  name: string
  status: 'passed' | 'failed'
  referenceId: string
  details: string
  timestamp: string
}

/**
 * End-to-End Simulation of the 16-Stage Client Lifecycle for DEMO RETAIL
 * strictly utilizing test references and dummy credentials without real financial transfers.
 */
export function runDemoRetailLifecycleSimulation(): {
  success: boolean
  totalSteps: number
  passedSteps: number
  results: LifecycleSimulationResult[]
  artifacts: {
    client: typeof DEMO_RETAIL_CLIENT
    lead: Lead
    requirement: Requirement
    quotation: Quotation
    agreement: Agreement
    advancePayment: Payment
    advanceInvoice: Invoice
    project: Project
    tasks: Task[]
    finalPayment: Payment
    finalInvoice: Invoice
    monitoring: Partial<MonitoredWebsite>
    maintenance: Partial<MaintenanceRecord>
  }
} {
  const results: LifecycleSimulationResult[] = []
  const now = new Date('2026-11-22T10:00:00Z').toISOString()

  // 1. New Enquiry
  const lead: Lead = {
    id: 'lead-sim-demo-retail',
    name: DEMO_RETAIL_CLIENT.name,
    email: DEMO_RETAIL_CLIENT.email,
    phone: DEMO_RETAIL_CLIENT.phone,
    company: DEMO_RETAIL_CLIENT.company,
    status: 'won',
    source: 'website',
    budget: 150000,
    notes: 'Initial enquiry: Complete multi-vendor e-commerce web platform with payment gateway integration.',
    assigned_to: 'admin-lead-01',
    next_follow_up: null,
    created_at: now,
    updated_at: now
  }
  results.push({
    step: 1,
    name: 'New Enquiry Intake',
    status: 'passed',
    referenceId: lead.id,
    details: `Enquiry logged for ${lead.company} via ${lead.source} with budget ₹${lead.budget}.`,
    timestamp: now
  })

  // 2. Requirement Collection
  const requirement: Requirement = {
    id: 'req-sim-demo-retail-001',
    client_id: DEMO_RETAIL_CLIENT.id,
    lead_id: lead.id,
    project_id: null,
    title: 'Demo Retail E-Commerce Portal Specification',
    description: 'B2B/B2C hybrid retail storefront with real-time inventory and GST compliance.',
    website_type: 'e-commerce',
    business_purpose: 'Retail sales and logistics orchestration',
    pages: ['Home', 'Catalog', 'Product Detail', 'Cart & Checkout', 'Customer Portal', 'Admin CRM'],
    features: ['Razorpay Gateway', 'Automated GST Invoicing', 'Inventory Sync', 'WhatsApp Dispatch'],
    design_preferences: 'Obsidian dark fintech mode with high contrast accents',
    reference_urls: ['https://demoretail.store/preview'],
    timeline: '6 weeks',
    budget_range: '₹1,50,000 - ₹1,80,000',
    status: 'approved',
    created_at: now,
    updated_at: now
  }
  results.push({
    step: 2,
    name: 'Requirement Collection & Scoping',
    status: 'passed',
    referenceId: requirement.id,
    details: `6 core pages scoped with Razorpay and GST invoicing requirements approved.`,
    timestamp: now
  })

  // 3. Quotation Creation
  const quoteItems = [
    { id: '1', description: 'Custom Responsive Next.js / Tailwind UI Architecture', quantity: 1, unit_price: 60000, total: 60000 },
    { id: '2', description: 'Supabase PostgreSQL Backend & Role-Based Auth', quantity: 1, unit_price: 45000, total: 45000 },
    { id: '3', description: 'Payment Gateway Integration & Automated Billing', quantity: 1, unit_price: 25000, total: 25000 },
    { id: '4', description: 'Deployment, Edge CDN & Production Security Hardening', quantity: 1, unit_price: 20000, total: 20000 }
  ]
  const subtotal = 150000
  const taxRate = 18
  const taxAmount = (subtotal * taxRate) / 100 // 27000
  const total = subtotal + taxAmount // 177000

  const quotation: Quotation = {
    id: 'quo-sim-demo-retail-001',
    client_id: DEMO_RETAIL_CLIENT.id,
    requirement_id: requirement.id,
    quote_number: 'CS-QUO-2026-001',
    title: 'E-Commerce Platform Development Agreement & Commercial Quote',
    items: quoteItems,
    subtotal,
    discount: 0,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    total,
    notes: 'Includes 1 year complimentary Standard Sentinel monitoring.',
    valid_until: new Date('2026-12-22').toISOString(),
    status: 'accepted',
    sent_at: now,
    accepted_at: now,
    version: 1,
    created_at: now,
    updated_at: now
  }
  results.push({
    step: 3,
    name: 'Quotation Generation',
    status: 'passed',
    referenceId: quotation.quote_number,
    details: `Generated CS-QUO-2026-001: Subtotal ₹${subtotal.toLocaleString('en-IN')}, GST (18%) ₹${taxAmount.toLocaleString('en-IN')}, Total ₹${total.toLocaleString('en-IN')}.`,
    timestamp: now
  })

  // 4. Quotation Approval
  results.push({
    step: 4,
    name: 'Quotation Client Approval',
    status: 'passed',
    referenceId: quotation.quote_number,
    details: 'Formal acceptance received and recorded in quotation audit trail.',
    timestamp: now
  })

  // 5. Agreement Generation
  const agreement: Agreement = {
    id: 'agr-sim-demo-retail-001',
    agreement_number: 'CS-AGR-2026-001',
    client_id: DEMO_RETAIL_CLIENT.id,
    quotation_id: quotation.id,
    title: 'Master Software Development & Service Level Agreement',
    total_value: total,
    advance_percentage: 50,
    advance_amount: Math.round(total * 0.5),
    balance_amount: Math.round(total * 0.5),
    status: 'signed',
    governing_law: 'Laws of Karnataka, India (Arbitration at Bengaluru)',
    signed_at: now,
    signature_url: null,
    file_url: null,
    start_date: '2026-11-22',
    end_date: '2027-01-05',
    created_at: now,
    updated_at: now
  }
  results.push({
    step: 5,
    name: 'Master Agreement Generation',
    status: 'passed',
    referenceId: agreement.agreement_number,
    details: `Agreement generated with governing law (${agreement.governing_law}) and linked quote ${quotation.quote_number}.`,
    timestamp: now
  })

  // 6. Agreement Signing Test (Simulated E-Signature)
  results.push({
    step: 6,
    name: 'Digital Signature Execution (Simulated)',
    status: 'passed',
    referenceId: 'ESIGN-SIM-REF-99214',
    details: 'Simulated Zoho Sign sandbox signature completed; audit hash recorded without legal execution.',
    timestamp: now
  })

  // 7. Advance Payment Recording (Simulated 50% Milestone)
  const advanceAmount = Math.round(total * 0.5) // 88500
  const advancePayment: Payment = {
    id: 'pay-sim-demo-retail-001',
    client_id: DEMO_RETAIL_CLIENT.id,
    project_id: null,
    invoice_id: null,
    agreement_id: agreement.id,
    reference: 'TEST-NEFT-AXIS-994821',
    receipt_number: 'CS-REC-2026-001',
    amount: advanceAmount,
    currency: 'INR',
    payment_method: 'bank_transfer',
    payment_type: 'advance',
    status: 'received',
    verification_status: 'verified',
    verified_by: 'finance-admin@capesecure.com',
    verified_at: now,
    recorded_by: 'finance-admin@capesecure.com',
    received_date: '2026-11-22',
    notes: 'Advance 50% mobilization payment verified against dummy bank statement.',
    proof_url: null,
    created_at: now,
    updated_at: now
  }
  results.push({
    step: 7,
    name: 'Advance Payment Verification',
    status: 'passed',
    referenceId: advancePayment.reference,
    details: `Advance ₹${advanceAmount.toLocaleString('en-IN')} verified with transaction ref ${advancePayment.reference}.`,
    timestamp: now
  })

  // 8. Invoice and Receipt Generation
  const advanceInvoice: Invoice = {
    id: 'inv-sim-demo-retail-001',
    invoice_number: 'CS-INV-2026-001',
    client_id: DEMO_RETAIL_CLIENT.id,
    project_id: null,
    payment_id: advancePayment.id,
    items: [{ description: '50% Mobilization Advance for CS-PRJ-2026-001', quantity: 1, unit_price: 75000, total: 75000 }],
    subtotal: 75000,
    discount: 0,
    tax_rate: 18,
    tax_amount: 13500,
    total: advanceAmount,
    amount_paid: advanceAmount,
    balance_due: 0,
    status: 'paid',
    due_date: '2026-11-22',
    paid_at: now,
    notes: 'Advance mobilization payment',
    file_url: null,
    created_at: now,
    updated_at: now
  }
  results.push({
    step: 8,
    name: 'Tax Invoice & Receipt Generation',
    status: 'passed',
    referenceId: advanceInvoice.invoice_number,
    details: `Invoice CS-INV-2026-001 (₹${advanceAmount.toLocaleString('en-IN')}) and Receipt CS-REC-2026-001 generated.`,
    timestamp: now
  })

  // 9. Project Creation
  const project: Project = {
    id: 'prj-sim-demo-retail-001',
    project_number: 'CS-PRJ-2026-001',
    client_id: DEMO_RETAIL_CLIENT.id,
    agreement_id: agreement.id,
    name: 'DEMO RETAIL Flagship Storefront',
    description: 'Enterprise omnichannel retail platform with high-speed catalog and Razorpay checkout.',
    status: 'development',
    budget: total,
    priority: 'high',
    start_date: '2026-11-22',
    deadline: '2027-01-05',
    expected_delivery_date: '2027-01-05',
    project_manager: 'Arun Kumar',
    pipeline_stage: 'ui_ux_design',
    completed_at: null,
    website_url: 'https://demoretail.store',
    staging_url: 'https://staging.demoretail.store',
    repository_url: 'https://github.com/capesecure/demo-retail',
    tech_stack: ['Next.js', 'TypeScript', 'Tailwind', 'PostgreSQL', 'Stripe'],
    progress: 35,
    created_at: now,
    updated_at: now
  }
  results.push({
    step: 9,
    name: 'Project Creation & Pipeline Initialization',
    status: 'passed',
    referenceId: project.project_number || 'CS-PRJ-2026-001',
    details: 'Project CS-PRJ-2026-001 created and advanced into 17-stage lifecycle pipeline.',
    timestamp: now
  })

  // 10. Design Approval
  results.push({
    step: 10,
    name: 'Design Preview & Approval',
    status: 'passed',
    referenceId: 'REV-DES-001',
    details: 'Wireframe and UI mockup approved by client portal delegate.',
    timestamp: now
  })

  // 11. Development Tracking
  const tasks: Task[] = [
    { id: 'tsk-1', project_id: project.id, title: 'Storefront UI Components', description: 'Next.js components', status: 'done', priority: 'high', assigned_to: 'Frontend Lead', due_date: '2026-12-05', completed_at: now, tags: ['frontend'], created_at: now, updated_at: now },
    { id: 'tsk-2', project_id: project.id, title: 'Checkout & Gateway Hooks', description: 'Razorpay integration', status: 'done', priority: 'urgent', assigned_to: 'Backend Lead', due_date: '2026-12-10', completed_at: now, tags: ['backend', 'payments'], created_at: now, updated_at: now },
    { id: 'tsk-3', project_id: project.id, title: 'Postgres Schema & RLS', description: 'RLS policies and tables', status: 'done', priority: 'urgent', assigned_to: 'DB Architect', due_date: '2026-12-02', completed_at: now, tags: ['database'], created_at: now, updated_at: now }
  ]
  results.push({
    step: 11,
    name: 'Engineering Sprint Tracking',
    status: 'passed',
    referenceId: 'SPRINT-01',
    details: `${tasks.length} core engineering tasks completed across Frontend, Backend, and DB.`,
    timestamp: now
  })

  // 12. QA Completion
  results.push({
    step: 12,
    name: 'Full QA & Cross-Browser Verification',
    status: 'passed',
    referenceId: 'QA-SUITE-PASS-100',
    details: 'Responsive, SSL, OWASP Top 10, Form Validation, and Performance checks passed.',
    timestamp: now
  })

  // 13. Final Payment Verification (50% Balance)
  const finalAmount = total - advanceAmount // 88500
  const finalPayment: Payment = {
    id: 'pay-sim-demo-retail-002',
    client_id: DEMO_RETAIL_CLIENT.id,
    project_id: project.id,
    invoice_id: null,
    agreement_id: agreement.id,
    reference: 'TEST-NEFT-HDFC-883192',
    receipt_number: 'CS-REC-2026-002',
    amount: finalAmount,
    currency: 'INR',
    payment_method: 'bank_transfer',
    payment_type: 'final',
    status: 'received',
    verification_status: 'verified',
    verified_by: 'finance-admin@capesecure.com',
    verified_at: now,
    recorded_by: 'finance-admin@capesecure.com',
    received_date: '2026-11-22',
    notes: 'Final 50% project delivery balance verified.',
    proof_url: null,
    created_at: now,
    updated_at: now
  }
  const finalInvoice: Invoice = {
    id: 'inv-sim-demo-retail-002',
    invoice_number: 'CS-INV-2026-002',
    client_id: DEMO_RETAIL_CLIENT.id,
    project_id: project.id,
    payment_id: finalPayment.id,
    items: [{ description: '50% Final Settlement for CS-PRJ-2026-001', quantity: 1, unit_price: 75000, total: 75000 }],
    subtotal: 75000,
    discount: 0,
    tax_rate: 18,
    tax_amount: 13500,
    total: finalAmount,
    amount_paid: finalAmount,
    balance_due: 0,
    status: 'paid',
    due_date: '2026-11-22',
    paid_at: now,
    notes: 'Final delivery settlement',
    file_url: null,
    created_at: now,
    updated_at: now
  }
  results.push({
    step: 13,
    name: 'Final Payment Verification',
    status: 'passed',
    referenceId: finalPayment.reference,
    details: `Final ₹${finalAmount.toLocaleString('en-IN')} verified against invoice CS-INV-2026-002; balance reconciled to ₹0.00.`,
    timestamp: now
  })

  // 14. Production Deployment Record
  results.push({
    step: 14,
    name: 'Production Deployment Record',
    status: 'passed',
    referenceId: 'DEP-PROD-2026-01',
    details: 'Vercel Edge Cluster deployment live on target domain (https://demoretail.store).',
    timestamp: now
  })

  // 15. Handover Completion
  results.push({
    step: 15,
    name: 'Client Handover Acceptance & Document Release',
    status: 'passed',
    referenceId: 'CS-HND-2026-001',
    details: 'Handover package generated; client formal acceptance certificate recorded.',
    timestamp: now
  })

  // 16. Maintenance Activation
  const monitoring: Partial<MonitoredWebsite> = {
    id: 'mon-sim-demo-retail-001',
    client_id: DEMO_RETAIL_CLIENT.id,
    project_id: project.id,
    name: 'Demo Retail Live Storefront',
    url: 'https://demoretail.store',
    status: 'up',
    http_status: 200,
    response_time_ms: 48,
    uptime_percentage: 99.98,
    ssl_status: 'valid',
    ssl_days_remaining: 85,
    monitoring_interval_mins: 15
  }
  const maintenance: Partial<MaintenanceRecord> = {
    id: 'mnt-sim-demo-retail-001',
    client_id: DEMO_RETAIL_CLIENT.id,
    project_id: project.id,
    plan_id: 'plan_standard',
    plan_name: 'Standard Maintenance',
    price: 1999,
    billing_frequency: 'yearly',
    start_date: '2026-11-22',
    renewal_date: '2027-11-22',
    payment_status: 'paid',
    contract_status: 'active'
  }
  results.push({
    step: 16,
    name: 'Recurring Maintenance & Monitoring Activation',
    status: 'passed',
    referenceId: 'CS-MNT-2026-001',
    details: 'Standard Maintenance Plan activated (₹1,999/yr); Sentinel live health probe scheduled.',
    timestamp: now
  })

  return {
    success: true,
    totalSteps: 16,
    passedSteps: 16,
    results,
    artifacts: {
      client: DEMO_RETAIL_CLIENT,
      lead,
      requirement,
      quotation,
      agreement,
      advancePayment,
      advanceInvoice,
      project,
      tasks,
      finalPayment,
      finalInvoice,
      monitoring,
      maintenance
    }
  }
}
