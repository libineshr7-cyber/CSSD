# CapeSecure Business Management System (BMS)
## Production Deployment & Infrastructure Runbook

---

### 1. Pre-Deployment Configuration Matrix

Before initiating production deployment, ensure the following environment variables are securely provisioned in your hosting environment (e.g., Vercel Project Settings) and local `.env.local` file:

```env
# ─── Supabase Cloud Infrastructure ───
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-publishable-anon-key>

# ─── Brevo Transactional Email Engine ───
VITE_BREVO_API_KEY=xkeysib-<your-verified-brevo-v3-api-key>
VITE_BREVO_SENDER_EMAIL=contact@capesecure.com
VITE_BREVO_SENDER_NAME=CapeSecure Solutions

# ─── Application Environment ───
NODE_ENV=production
VITE_APP_URL=https://capesecure.vercel.app
```

> [!IMPORTANT]
> Never commit secrets or service keys (`service_role_key`) to source control. The frontend only requires the public publishable anon key (`VITE_SUPABASE_ANON_KEY`), as all data access is guarded by PostgreSQL Row Level Security (RLS).

---

### 2. Database Migration Deployment Order

Execute all 11 SQL migrations in sequence against your production Supabase database via the Supabase SQL Editor or Supabase CLI:

```bash
# Sequential Migration Execution List:
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_auth_and_rbac.sql
supabase/migrations/003_client_and_lead_enhancements.sql
supabase/migrations/004_quotation_management.sql
supabase/migrations/005_agreement_management.sql
supabase/migrations/006_finance_and_payments.sql
supabase/migrations/007_project_management.sql
supabase/migrations/008_testing_deployment_handover.sql
supabase/migrations/009_document_management_and_storage.sql
supabase/migrations/010_maintenance_and_monitoring.sql
supabase/migrations/011_email_and_business_automation.sql
```

#### Verification Query:
Verify that all core tables and sequences exist and RLS is enabled:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

---

### 3. Supabase Storage Buckets & Access Security

Create the following storage buckets in Supabase Storage with **Public Access Disabled**:

1. `documents`: Encrypted private client documents and specifications.
2. `signatures`: Digital signature audit tokens and signed agreement scans.
3. `receipts`: Verified payment receipts and bank UTR evidence.
4. `previews`: UI/UX design mockups and staging screenshots.

#### Storage Security Policy:
Execute the following RLS policy on storage objects to restrict direct access to authorized administrators and authenticated signed URLs:
```sql
-- Allow authenticated staff read/write access to storage
CREATE POLICY "Allow authenticated staff access"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id IN ('documents', 'signatures', 'receipts', 'previews'));

-- Enforce client folder scoping for portal downloads
CREATE POLICY "Allow signed url client access"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id IN ('documents', 'previews'));
```

---

### 4. Vercel Production Build & Deployment

#### 4.1 Project Configuration
- **Framework Preset:** Vite
- **Root Directory:** `./`
- **Build Command:** `npm run build` (`tsc && vite build`)
- **Output Directory:** `dist`
- **Node.js Version:** `18.x` or `20.x`

#### 4.2 Single-Page Application (SPA) Rewrite Rule
To ensure that deep URLs (such as `/admin/projects`, `/portal`, and `/quote/:id`) resolve properly on page reload without HTTP 404 errors, create or verify `vercel.json` in the project root:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

---

### 5. Custom Domain & DNS Configuration

To configure a custom enterprise domain (e.g. `bms.capesecure.com` or `capesecure.com`):

1. **Vercel Domains:** In the Vercel project dashboard, navigate to **Settings > Domains** and add your custom domain.
2. **DNS Records (at your domain registrar, e.g. Cloudflare / GoDaddy):**
   - **Apex Domain (`@`):** `A` record pointing to `76.76.21.21`.
   - **Subdomain (`bms` or `www`):** `CNAME` record pointing to `cname.vercel-dns.com`.
3. **TLS/SSL Validation:** Vercel automatically negotiates Let's Encrypt TLS 1.3 certificates within 10 minutes of DNS propagation.

---

### 6. Brevo Transactional Email & Deliverability Setup

To ensure 99.9% email inbox placement and eliminate spam flagging for proposals, invoices, and alerts:

1. **Sender Authentication:** In your Brevo dashboard (**Senders & IP > Domains**), add your domain `capesecure.com`.
2. **DNS Deliverability Records:**
   - **SPF Record:** `v=spf1 include:spf.brevo.com ~all`
   - **DKIM Key:** Add the `TXT` record with selector provided in your Brevo console (e.g. `mail._domainkey.capesecure.com`).
   - **DMARC Record:** `v=DMARC1; p=quarantine; sp=quarantine; rua=mailto:dmarc-reports@capesecure.com`
3. **Verify API Key:** Test transactional dispatch using the **Settings > Email & Business Automation > Send Test** button in the CapeSecure admin portal.

---

### 7. Backup, Disaster Recovery & Verification Procedures

#### 7.1 Automated Database Snapshots
- Managed PostgreSQL continuous WAL archiving with daily point-in-time recovery (PITR).
- Secondary automated encrypted logical dumps retained for 30 days.

#### 7.2 Secondary Cold Storage Strategy
- As configured in Phase 9, monthly cold archives of documents and metadata are replicated to secondary cold storage (AWS S3 Glacier) with SHA-256 integrity hash verification.

#### 7.3 Routine Restoration Drill Protocol
- Every quarter, administrators execute a non-destructive restoration drill in **Documents > Disaster Recovery** to verify checksum consistency and measure recovery time objective (RTO < 30 minutes).
