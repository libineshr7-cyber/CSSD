import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS, type AppRole, type NavModule } from '../types/database';
import { DEFAULT_ROLE_PERMISSIONS } from '../lib/permissions';
import {
  Settings,
  Building2,
  Users,
  Mail,
  Plug,
  CreditCard,
  Shield,
  ClipboardList,
  Save,
  Upload,
  Plus,
  X,
  Eye,
  EyeOff,
  Key,
  Smartphone,
  Monitor,
  RefreshCw,
  CheckCircle,
  XCircle,
  ChevronRight,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type SidebarSection =
  | 'general'
  | 'company'
  | 'team'
  | 'permissions'
  | 'email'
  | 'integrations'
  | 'billing'
  | 'security'
  | 'audit';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Invited' | 'Disabled';
  lastLogin: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  ip: string;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created: string;
}

interface Session {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_MEMBERS: TeamMember[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@capesecure.io', role: 'Admin', status: 'Active', lastLogin: '2026-11-21 10:32' },
  { id: '2', name: 'Bob Marley', email: 'bob@capesecure.io', role: 'Manager', status: 'Active', lastLogin: '2026-11-20 16:45' },
  { id: '3', name: 'Carol White', email: 'carol@capesecure.io', role: 'Viewer', status: 'Invited', lastLogin: '—' },
  { id: '4', name: 'David Kim', email: 'david@capesecure.io', role: 'Manager', status: 'Active', lastLogin: '2026-11-19 09:12' },
  { id: '5', name: 'Eva Nkosi', email: 'eva@capesecure.io', role: 'Viewer', status: 'Disabled', lastLogin: '2026-10-30 14:00' },
];

const MOCK_AUDIT: AuditEntry[] = [
  { id: '1', timestamp: '2026-11-21 10:32:11', user: 'alice@capesecure.io', action: 'LOGIN', resource: 'Auth', ip: '196.25.1.4' },
  { id: '2', timestamp: '2026-11-21 10:35:44', user: 'alice@capesecure.io', action: 'UPDATE', resource: 'Building #3', ip: '196.25.1.4' },
  { id: '3', timestamp: '2026-11-21 10:40:02', user: 'bob@capesecure.io', action: 'LOGIN', resource: 'Auth', ip: '41.0.22.9' },
  { id: '4', timestamp: '2026-11-21 11:00:17', user: 'bob@capesecure.io', action: 'CREATE', resource: 'Lease #102', ip: '41.0.22.9' },
  { id: '5', timestamp: '2026-11-21 11:15:33', user: 'alice@capesecure.io', action: 'DELETE', resource: 'Invoice #445', ip: '196.25.1.4' },
  { id: '6', timestamp: '2026-11-20 16:45:00', user: 'david@capesecure.io', action: 'LOGIN', resource: 'Auth', ip: '102.89.44.5' },
  { id: '7', timestamp: '2026-11-20 16:50:22', user: 'david@capesecure.io', action: 'VIEW', resource: 'Report: Revenue', ip: '102.89.44.5' },
  { id: '8', timestamp: '2026-11-20 17:05:11', user: 'alice@capesecure.io', action: 'UPDATE', resource: 'Settings', ip: '196.25.1.4' },
  { id: '9', timestamp: '2026-11-19 09:12:55', user: 'david@capesecure.io', action: 'LOGIN', resource: 'Auth', ip: '102.89.44.5' },
  { id: '10', timestamp: '2026-11-19 09:20:00', user: 'alice@capesecure.io', action: 'INVITE', resource: 'User: carol@capesecure.io', ip: '196.25.1.4' },
];

const MOCK_SESSIONS: Session[] = [
  { id: '1', device: 'Chrome on Windows 11', location: 'Cape Town, ZA', lastActive: 'Now', current: true },
  { id: '2', device: 'Safari on iPhone 15', location: 'Johannesburg, ZA', lastActive: '2 hours ago', current: false },
  { id: '3', device: 'Firefox on macOS', location: 'London, UK', lastActive: 'Yesterday', current: false },
];

const MOCK_API_KEYS: ApiKey[] = [
  { id: '1', name: 'Production Key', key: 'cs_live_••••••••••••••••3f9a', created: '2026-10-01' },
  { id: '2', name: 'Development Key', key: 'cs_test_••••••••••••••••7b2c', created: '2026-11-10' },
];

// ─── Sidebar Nav ──────────────────────────────────────────────────────────────

const NAV_ITEMS: { key: SidebarSection; label: string; icon: React.ReactNode }[] = [
  { key: 'general', label: 'General', icon: <Settings size={16} /> },
  { key: 'company', label: 'Company Profile', icon: <Building2 size={16} /> },
  { key: 'team', label: 'Team Members', icon: <Users size={16} /> },
  { key: 'permissions', label: 'Roles & Permissions', icon: <Shield size={16} /> },
  { key: 'email', label: 'Email Configuration', icon: <Mail size={16} /> },
  { key: 'integrations', label: 'Integrations', icon: <Plug size={16} /> },
  { key: 'billing', label: 'Billing', icon: <CreditCard size={16} /> },
  { key: 'security', label: 'Security', icon: <Key size={16} /> },
  { key: 'audit', label: 'Audit Log', icon: <ClipboardList size={16} /> },
];

// ─── Utility Components ───────────────────────────────────────────────────────

const SectionTitle: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-6">
    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
    {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
  </div>
);

const FormField: React.FC<{
  label: string;
  children: React.ReactNode;
  htmlFor?: string;
}> = ({ label, children, htmlFor }) => (
  <div>
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    {children}
  </div>
);

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const selectCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    Active: 'bg-green-100 text-green-700',
    Invited: 'bg-yellow-100 text-yellow-700',
    Disabled: 'bg-gray-100 text-gray-500',
    Connected: 'bg-green-100 text-green-700',
    'Not configured': 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

const SaveButton: React.FC<{ onClick: () => void; label?: string }> = ({ onClick, label = 'Save Changes' }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
  >
    <Save size={15} />
    {label}
  </button>
);

// ─── General Section ──────────────────────────────────────────────────────────

const GeneralSection: React.FC = () => {
  const [form, setForm] = useState({
    appName: 'CapeSecure BMS',
    timezone: 'Africa/Johannesburg',
    currency: 'ZAR',
    dateFormat: 'DD/MM/YYYY',
    language: 'en',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <SectionTitle title="General Settings" subtitle="Manage your application preferences." />
      <div className="grid grid-cols-1 gap-5 max-w-lg">
        <FormField label="App Name" htmlFor="appName">
          <input id="appName" className={inputCls} value={form.appName} onChange={set('appName')} />
        </FormField>
        <FormField label="Timezone" htmlFor="timezone">
          <select id="timezone" className={selectCls} value={form.timezone} onChange={set('timezone')}>
            <option value="Africa/Johannesburg">Africa/Johannesburg (UTC+2)</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">America/New_York (UTC-5)</option>
            <option value="Europe/London">Europe/London (UTC+0)</option>
            <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
          </select>
        </FormField>
        <FormField label="Currency" htmlFor="currency">
          <select id="currency" className={selectCls} value={form.currency} onChange={set('currency')}>
            <option value="ZAR">ZAR — South African Rand</option>
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — British Pound</option>
            <option value="NAD">NAD — Namibian Dollar</option>
          </select>
        </FormField>
        <FormField label="Date Format" htmlFor="dateFormat">
          <select id="dateFormat" className={selectCls} value={form.dateFormat} onChange={set('dateFormat')}>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </FormField>
        <FormField label="Language" htmlFor="language">
          <select id="language" className={selectCls} value={form.language} onChange={set('language')}>
            <option value="en">English</option>
            <option value="af">Afrikaans</option>
            <option value="zu">Zulu</option>
            <option value="fr">French</option>
          </select>
        </FormField>
        <div className="pt-2">
          <SaveButton onClick={() => toast.success('Settings saved!')} />
        </div>
      </div>
    </div>
  );
};

// ─── Company Profile Section ──────────────────────────────────────────────────

const CompanySection: React.FC = () => {
  const [form, setForm] = useState({
    companyName: 'CapeSecure Property Management',
    email: 'info@capesecure.io',
    phone: '+27 21 000 0000',
    address: '1 Adderley Street\nCape Town\n8001',
    website: 'https://capesecure.io',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <SectionTitle title="Company Profile" subtitle="Information about your organisation." />
      <div className="grid grid-cols-1 gap-5 max-w-lg">
        {/* Logo upload placeholder */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
          <div className="flex items-center gap-4">
            <img
              src="/logo.png"
              alt="CapeSecure Company Logo"
              className="w-16 h-16 rounded-xl object-contain border border-[#E5E5E5] dark:border-[#383838] p-1 bg-white dark:bg-[#2C2C2C] shadow-sm"
            />
            <button className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <Upload size={15} />
              Upload Logo
            </button>
          </div>
        </div>

        <FormField label="Company Name" htmlFor="cName">
          <input id="cName" className={inputCls} value={form.companyName} onChange={set('companyName')} />
        </FormField>
        <FormField label="Email" htmlFor="cEmail">
          <input id="cEmail" type="email" className={inputCls} value={form.email} onChange={set('email')} />
        </FormField>
        <FormField label="Phone" htmlFor="cPhone">
          <input id="cPhone" className={inputCls} value={form.phone} onChange={set('phone')} />
        </FormField>
        <FormField label="Address" htmlFor="cAddress">
          <textarea
            id="cAddress"
            rows={3}
            className={inputCls}
            value={form.address}
            onChange={set('address')}
          />
        </FormField>
        <FormField label="Website URL" htmlFor="cWeb">
          <input id="cWeb" type="url" className={inputCls} value={form.website} onChange={set('website')} />
        </FormField>
        <div className="pt-2">
          <SaveButton onClick={() => toast.success('Settings saved!')} />
        </div>
      </div>
    </div>
  );
};

// ─── Team Members Section ─────────────────────────────────────────────────────

const TeamSection: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>(MOCK_MEMBERS);
  const [showModal, setShowModal] = useState(false);
  const [invite, setInvite] = useState({ name: '', email: '', role: 'Viewer' });

  const handleInvite = () => {
    if (!invite.name || !invite.email) {
      toast.error('Please fill in all fields.');
      return;
    }
    const newMember: TeamMember = {
      id: String(Date.now()),
      name: invite.name,
      email: invite.email,
      role: invite.role,
      status: 'Invited',
      lastLogin: '—',
    };
    setMembers(m => [...m, newMember]);
    setInvite({ name: '', email: '', role: 'Viewer' });
    setShowModal(false);
    toast.success(`Invite sent to ${invite.email}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <SectionTitle title="Team Members" subtitle="Manage who has access to this workspace." />
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} />
          Invite Member
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Name', 'Email', 'Role', 'Status', 'Last Login'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {members.map(m => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                <td className="px-4 py-3 text-gray-600">{m.email}</td>
                <td className="px-4 py-3 text-gray-600">{m.role}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={m.status} />
                </td>
                <td className="px-4 py-3 text-gray-500">{m.lastLogin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Invite Team Member</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <FormField label="Full Name" htmlFor="iName">
                <input
                  id="iName"
                  className={inputCls}
                  placeholder="Jane Smith"
                  value={invite.name}
                  onChange={e => setInvite(i => ({ ...i, name: e.target.value }))}
                />
              </FormField>
              <FormField label="Email Address" htmlFor="iEmail">
                <input
                  id="iEmail"
                  type="email"
                  className={inputCls}
                  placeholder="jane@example.com"
                  value={invite.email}
                  onChange={e => setInvite(i => ({ ...i, email: e.target.value }))}
                />
              </FormField>
              <FormField label="Role" htmlFor="iRole">
                <select
                  id="iRole"
                  className={selectCls}
                  value={invite.role}
                  onChange={e => setInvite(i => ({ ...i, role: e.target.value }))}
                >
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </FormField>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Email Configuration Section ──────────────────────────────────────────────

const EmailSection: React.FC = () => {
  const [form, setForm] = useState({
    host: 'smtp.sendgrid.net',
    port: '587',
    username: 'apikey',
    password: '',
    fromName: 'CapeSecure BMS',
    fromEmail: 'no-reply@capesecure.io',
  });
  const [showPass, setShowPass] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const testConnection = () => {
    toast.loading('Testing SMTP connection…', { duration: 1500 });
    setTimeout(() => toast.success('SMTP connection successful!'), 1600);
  };

  return (
    <div>
      <SectionTitle title="Email Configuration" subtitle="Configure outgoing SMTP settings." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
        <FormField label="SMTP Host" htmlFor="smtpHost">
          <input id="smtpHost" className={inputCls} value={form.host} onChange={set('host')} />
        </FormField>
        <FormField label="SMTP Port" htmlFor="smtpPort">
          <input id="smtpPort" className={inputCls} value={form.port} onChange={set('port')} />
        </FormField>
        <FormField label="Username" htmlFor="smtpUser">
          <input id="smtpUser" className={inputCls} value={form.username} onChange={set('username')} />
        </FormField>
        <FormField label="Password" htmlFor="smtpPass">
          <div className="relative">
            <input
              id="smtpPass"
              type={showPass ? 'text' : 'password'}
              className={`${inputCls} pr-10`}
              value={form.password}
              onChange={set('password')}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPass(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </FormField>
        <FormField label="From Name" htmlFor="fromName">
          <input id="fromName" className={inputCls} value={form.fromName} onChange={set('fromName')} />
        </FormField>
        <FormField label="From Email" htmlFor="fromEmail">
          <input id="fromEmail" type="email" className={inputCls} value={form.fromEmail} onChange={set('fromEmail')} />
        </FormField>
      </div>
      <div className="mt-5 flex gap-3">
        <button
          onClick={testConnection}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={15} />
          Test Connection
        </button>
        <SaveButton onClick={() => toast.success('Settings saved!')} />
      </div>
    </div>
  );
};

// ─── Integrations Section ─────────────────────────────────────────────────────

interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'Connected' | 'Not configured';
  color: string;
  initials: string;
}

const INTEGRATIONS: Integration[] = [
  { id: 'supabase', name: 'Supabase', description: 'Open source Firebase alternative. Provides database, auth, and storage.', status: 'Connected', color: 'bg-green-500', initials: 'SB' },
  { id: 'github', name: 'GitHub', description: 'Connect your repository for automated deployments and code sync.', status: 'Not configured', color: 'bg-gray-800', initials: 'GH' },
  { id: 'vercel', name: 'Vercel', description: 'Deploy your front-end seamlessly with Vercel edge network.', status: 'Not configured', color: 'bg-black', initials: 'VC' },
  { id: 'sendgrid', name: 'SendGrid', description: 'Reliable email delivery service for transactional and marketing emails.', status: 'Not configured', color: 'bg-blue-500', initials: 'SG' },
];

const IntegrationsSection: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);

  const toggle = (id: string) => {
    setIntegrations(prev =>
      prev.map(i => {
        if (i.id !== id) return i;
        if (i.status === 'Connected') {
          toast.success(`${i.name} disconnected.`);
          return { ...i, status: 'Not configured' };
        } else {
          toast.success(`${i.name} configured successfully!`);
          return { ...i, status: 'Connected' };
        }
      })
    );
  };

  return (
    <div>
      <SectionTitle title="Integrations" subtitle="Connect third-party services to extend your workflow." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
        {integrations.map(i => (
          <div key={i.id} className="bg-white border border-gray-200 rounded-xl p-5 flex gap-4 items-start hover:shadow-sm transition-shadow">
            <div className={`w-12 h-12 rounded-xl ${i.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
              {i.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-gray-900 text-sm">{i.name}</span>
                <StatusBadge status={i.status} />
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{i.description}</p>
              <button
                onClick={() => toggle(i.id)}
                className={`mt-3 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  i.status === 'Connected'
                    ? 'border border-red-300 text-red-600 hover:bg-red-50'
                    : 'border border-blue-300 text-blue-600 hover:bg-blue-50'
                }`}
              >
                {i.status === 'Connected' ? 'Disconnect' : 'Configure'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Billing Section ──────────────────────────────────────────────────────────

const BillingSection: React.FC = () => (
  <div>
    <SectionTitle title="Billing" subtitle="Manage your subscription and payment details." />
    <div className="max-w-lg space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-blue-900">Pro Plan</span>
          <span className="text-blue-600 font-bold text-lg">R 1,299 / mo</span>
        </div>
        <p className="text-sm text-blue-700">Unlimited buildings · 10 team members · Priority support</p>
        <div className="mt-3 flex gap-2">
          <button className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Upgrade Plan
          </button>
          <button className="px-3 py-1.5 text-xs font-medium border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-100">
            View Invoices
          </button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl p-5">
        <h4 className="font-medium text-gray-900 mb-3 text-sm">Payment Method</h4>
        <div className="flex items-center gap-3">
          <div className="w-10 h-7 bg-gray-800 rounded flex items-center justify-center">
            <CreditCard size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">•••• •••• •••• 4242</p>
            <p className="text-xs text-gray-500">Expires 08/2027</p>
          </div>
          <button className="ml-auto text-xs text-blue-600 hover:underline">Update</button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl p-5">
        <h4 className="font-medium text-gray-900 mb-1 text-sm">Next billing date</h4>
        <p className="text-gray-600 text-sm">December 1, 2026</p>
      </div>
    </div>
  </div>
);

// ─── Security Section ─────────────────────────────────────────────────────────

const SecuritySection: React.FC = () => {
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });
  const [twoFA, setTwoFA] = useState(false);
  const [sessions] = useState<Session[]>(MOCK_SESSIONS);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(MOCK_API_KEYS);

  const handlePasswordChange = () => {
    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) {
      toast.error('Please fill in all password fields.');
      return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      toast.error('New passwords do not match.');
      return;
    }
    setPwForm({ current: '', newPw: '', confirm: '' });
    toast.success('Password updated successfully!');
  };

  const generateKey = () => {
    const newKey: ApiKey = {
      id: String(Date.now()),
      name: `Key ${apiKeys.length + 1}`,
      key: `cs_live_${'•'.repeat(16)}${Math.random().toString(36).slice(2, 6)}`,
      created: new Date().toISOString().slice(0, 10),
    };
    setApiKeys(k => [...k, newKey]);
    toast.success('New API key generated!');
  };

  const revokeKey = (id: string) => {
    setApiKeys(k => k.filter(k => k.id !== id));
    toast.success('API key revoked.');
  };

  const togglePwVis = (field: keyof typeof showPw) => setShowPw(s => ({ ...s, [field]: !s[field] }));

  return (
    <div className="space-y-8 max-w-lg">
      {/* Change Password */}
      <div>
        <SectionTitle title="Change Password" subtitle="Update your account password." />
        <div className="space-y-4">
          {(['current', 'newPw', 'confirm'] as const).map(field => (
            <FormField key={field} label={field === 'current' ? 'Current Password' : field === 'newPw' ? 'New Password' : 'Confirm New Password'} htmlFor={field}>
              <div className="relative">
                <input
                  id={field}
                  type={showPw[field] ? 'text' : 'password'}
                  className={`${inputCls} pr-10`}
                  placeholder="••••••••"
                  value={pwForm[field]}
                  onChange={e => setPwForm(f => ({ ...f, [field]: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => togglePwVis(field)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPw[field] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </FormField>
          ))}
          <button
            onClick={handlePasswordChange}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save size={15} />
            Update Password
          </button>
        </div>
      </div>

      {/* 2FA */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Two-Factor Authentication</h3>
        <p className="text-sm text-gray-500 mb-3">Add an extra layer of security to your account.</p>
        <div className="flex items-center gap-3">
          <Smartphone size={20} className="text-gray-500" />
          <span className="text-sm text-gray-700">Authenticator App</span>
          <button
            onClick={() => {
              setTwoFA(v => !v);
              toast.success(twoFA ? '2FA disabled.' : '2FA enabled!');
            }}
            className={`relative ml-auto inline-flex h-6 w-11 items-center rounded-full transition-colors ${twoFA ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${twoFA ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-3">Active Sessions</h3>
        <div className="space-y-3">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl">
              <Monitor size={18} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{s.device}</p>
                <p className="text-xs text-gray-500">{s.location} · {s.lastActive}</p>
              </div>
              {s.current ? (
                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle size={12} /> Current
                </span>
              ) : (
                <button
                  onClick={() => toast.success('Session revoked.')}
                  className="text-xs text-red-500 hover:underline"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* API Keys */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900">API Keys</h3>
          <button
            onClick={generateKey}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Key size={12} />
            Generate New Key
          </button>
        </div>
        <div className="space-y-3">
          {apiKeys.map(k => (
            <div key={k.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl">
              <Key size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{k.name}</p>
                <p className="text-xs font-mono text-gray-500">{k.key}</p>
                <p className="text-xs text-gray-400">Created {k.created}</p>
              </div>
              <button
                onClick={() => revokeKey(k.id)}
                className="text-xs text-red-500 hover:underline flex-shrink-0"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Audit Log Section ────────────────────────────────────────────────────────

const AuditSection: React.FC = () => {
  const actionColor: Record<string, string> = {
    LOGIN: 'bg-blue-100 text-blue-700',
    UPDATE: 'bg-yellow-100 text-yellow-700',
    CREATE: 'bg-green-100 text-green-700',
    DELETE: 'bg-red-100 text-red-700',
    VIEW: 'bg-gray-100 text-gray-600',
    INVITE: 'bg-purple-100 text-purple-700',
  };

  return (
    <div>
      <SectionTitle title="Audit Log" subtitle="A chronological record of all account activity." />
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Timestamp', 'User', 'Action', 'Resource', 'IP Address'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {MOCK_AUDIT.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">{e.timestamp}</td>
                <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{e.user}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionColor[e.action] ?? 'bg-gray-100 text-gray-600'}`}>
                    {e.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">{e.resource}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{e.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Configurable Permissions Section ─────────────────────────────────────────

const MODULE_LIST: NavModule[] = [
  'overview', 'leads', 'clients', 'requirements', 'quotations', 'agreements',
  'payments', 'invoices', 'projects', 'tasks', 'design-approvals', 'testing',
  'deployments', 'handover', 'maintenance', 'monitoring', 'tickets', 'documents',
  'reports', 'settings'
];

const PermissionsSection: React.FC = () => {
  const { role: userRole, permissions, updateRolePermission } = useAuth();
  const [selectedRole, setSelectedRole] = useState<AppRole>('project_manager');
  const [matrix, setMatrix] = useState<Record<NavModule, { view: boolean; create: boolean; edit: boolean; delete: boolean }>>(() => {
    return { ...DEFAULT_ROLE_PERMISSIONS.project_manager };
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load custom permissions from state or defaults
    const defaults = { ...DEFAULT_ROLE_PERMISSIONS[selectedRole] };
    const roleCustom = permissions.filter(p => p.role === selectedRole);
    roleCustom.forEach(p => {
      if (defaults[p.module]) {
        defaults[p.module] = {
          view: p.can_view,
          create: p.can_create,
          edit: p.can_edit,
          delete: p.can_delete,
        };
      }
    });
    setMatrix(defaults);
  }, [selectedRole, permissions]);

  const toggle = (mod: NavModule, action: 'view' | 'create' | 'edit' | 'delete') => {
    if (userRole !== 'super_admin') {
      toast.error('Only Super Admins can alter role permission policies.');
      return;
    }
    setMatrix(prev => ({
      ...prev,
      [mod]: {
        ...prev[mod],
        [action]: !prev[mod][action],
      },
    }));
  };

  const handleSave = async () => {
    if (userRole !== 'super_admin') {
      toast.error('Permission denied: Super Admin role required to commit policy updates.');
      return;
    }

    setSaving(true);
    let successCount = 0;
    for (const mod of MODULE_LIST) {
      const perms = matrix[mod];
      const { error } = await updateRolePermission(selectedRole, mod, {
        can_view: perms.view,
        can_create: perms.create,
        can_edit: perms.edit,
        can_delete: perms.delete,
      });
      if (!error) successCount++;
    }
    setSaving(false);
    toast.success(`Role policies for ${ROLE_LABELS[selectedRole].label} updated (${successCount} modules synced).`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionTitle
          title="Configurable Roles & Permissions"
          subtitle="Define database Row Level Security policies and module access matrices."
        />
        {userRole === 'super_admin' && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Syncing Policies...' : 'Save Role Matrix'}
          </button>
        )}
      </div>

      {/* Role Selector Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100 rounded-xl">
        {(Object.keys(ROLE_LABELS) as AppRole[]).map(r => (
          <button
            key={r}
            onClick={() => setSelectedRole(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedRole === r
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {ROLE_LABELS[r].label}
          </button>
        ))}
      </div>

      {/* Role Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 space-y-1">
        <div className="font-bold flex items-center gap-2">
          <span>{ROLE_LABELS[selectedRole].label}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ROLE_LABELS[selectedRole].badge}`}>Active Policy</span>
        </div>
        <p className="text-blue-700">{ROLE_LABELS[selectedRole].description}</p>
      </div>

      {/* Permissions Matrix Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-xl">
        <table className="min-w-full divide-y divide-gray-200 text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Module</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600 w-24">Can View</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600 w-24">Can Create</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600 w-24">Can Edit</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600 w-24">Can Delete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {MODULE_LIST.map(mod => {
              const rule = matrix[mod] || { view: false, create: false, edit: false, delete: false };
              const isLocked = selectedRole === 'super_admin';

              return (
                <tr key={mod} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900 capitalize">
                    {mod.replace('-', ' ')}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rule.view}
                      disabled={isLocked}
                      onChange={() => toggle(mod, 'view')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rule.create}
                      disabled={isLocked}
                      onChange={() => toggle(mod, 'create')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rule.edit}
                      disabled={isLocked}
                      onChange={() => toggle(mod, 'edit')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={rule.delete}
                      disabled={isLocked}
                      onChange={() => toggle(mod, 'delete')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Main SettingsPage ────────────────────────────────────────────────────────

const SECTION_MAP: Record<SidebarSection, React.ReactNode> = {
  general: <GeneralSection />,
  company: <CompanySection />,
  team: <TeamSection />,
  permissions: <PermissionsSection />,
  email: <EmailSection />,
  integrations: <IntegrationsSection />,
  billing: <BillingSection />,
  security: <SecuritySection />,
  audit: <AuditSection />,
};

const SettingsPage: React.FC = () => {
  const [active, setActive] = useState<SidebarSection>('general');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-center gap-3">
          <Settings size={22} className="text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>
      </div>

      <div className="flex max-w-7xl mx-auto px-4 py-6 gap-6">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0">
          <nav className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {NAV_ITEMS.map((item, idx) => (
              <button
                key={item.key}
                onClick={() => setActive(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left ${
                  idx < NAV_ITEMS.length - 1 ? 'border-b border-gray-100' : ''
                } ${
                  active === item.key
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className={active === item.key ? 'text-blue-600' : 'text-gray-400'}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {active === item.key && <ChevronRight size={14} className="text-blue-500" />}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 bg-white border border-gray-200 rounded-xl p-6 min-h-[600px]">
          {SECTION_MAP[active]}
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;
