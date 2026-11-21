import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Briefcase, Users, Activity,
  DollarSign, Award, FileText, Clock,
  CheckCircle, AlertCircle, PauseCircle, Calendar,
  ArrowUpRight, User, Star
} from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

type DateRange = 'thisMonth' | 'lastMonth' | 'last3Months' | 'last6Months' | 'thisYear';
type Tab = 'revenue' | 'projects' | 'clients' | 'activity';

// ── Mock Data ─────────────────────────────────────────────────────────────────

const monthlyRevenueData = [
  { month: 'Jul', revenue: 142000 },
  { month: 'Aug', revenue: 198000 },
  { month: 'Sep', revenue: 165000 },
  { month: 'Oct', revenue: 221000 },
  { month: 'Nov', revenue: 189000 },
  { month: 'Dec', revenue: 254000 },
];

const revenueByPaymentType = [
  { name: 'Advance', value: 320000 },
  { name: 'Milestone', value: 480000 },
  { name: 'Final', value: 310000 },
  { name: 'Maintenance', value: 59000 },
];

const projectsByStatus = [
  { status: 'Active', count: 12 },
  { status: 'Completed', count: 28 },
  { status: 'On Hold', count: 4 },
  { status: 'Planning', count: 7 },
];

const projectsByPriority = [
  { name: 'High', value: 15 },
  { name: 'Medium', value: 22 },
  { name: 'Low', value: 14 },
];

const projectCompletionData = [
  { name: 'Cape Town HQ Upgrade', status: 'Completed', completion: 100, timeline: 'On Time', duration: '3 months' },
  { name: 'Johannesburg Data Centre', status: 'Active', completion: 68, timeline: 'On Track', duration: '5 months' },
  { name: 'Durban Branch Fitout', status: 'Active', completion: 45, timeline: 'Delayed', duration: '4 months' },
  { name: 'PE Office Expansion', status: 'On Hold', completion: 20, timeline: 'Paused', duration: '2 months' },
  { name: 'Pretoria Security Upgrade', status: 'Completed', completion: 100, timeline: 'Early', duration: '6 months' },
  { name: 'Bloemfontein Branch Setup', status: 'Planning', completion: 5, timeline: 'Upcoming', duration: 'TBD' },
];

const newClientsPerMonth = [
  { month: 'Jul', clients: 3 },
  { month: 'Aug', clients: 5 },
  { month: 'Sep', clients: 2 },
  { month: 'Oct', clients: 7 },
  { month: 'Nov', clients: 4 },
  { month: 'Dec', clients: 6 },
];

const topClientsByRevenue = [
  { name: 'Steinhoff Africa', projects: 4, revenue: 320000, status: 'Active' },
  { name: 'Old Mutual Property', projects: 3, revenue: 275000, status: 'Active' },
  { name: 'Growthpoint Properties', projects: 5, revenue: 198000, status: 'Active' },
  { name: 'Liberty Holdings', projects: 2, revenue: 154000, status: 'Inactive' },
  { name: 'Redefine Properties', projects: 3, revenue: 122000, status: 'Active' },
];

const activityTimeline = [
  { id: 1, type: 'invoice', text: 'Invoice #INV-2024-089 sent to Old Mutual Property', time: '2 hours ago', icon: FileText, color: 'text-blue-500' },
  { id: 2, type: 'project', text: 'Project "Johannesburg Data Centre" milestone reached', time: '5 hours ago', icon: CheckCircle, color: 'text-green-500' },
  { id: 3, type: 'client', text: 'New client "Vukile Property Fund" onboarded', time: '1 day ago', icon: User, color: 'text-purple-500' },
  { id: 4, type: 'alert', text: 'Payment overdue for Liberty Holdings (R45,000)', time: '1 day ago', icon: AlertCircle, color: 'text-red-500' },
  { id: 5, type: 'project', text: 'Pretoria Security Upgrade marked as completed', time: '2 days ago', icon: Award, color: 'text-yellow-500' },
  { id: 6, type: 'invoice', text: 'Invoice #INV-2024-087 paid by Growthpoint Properties', time: '3 days ago', icon: DollarSign, color: 'text-green-500' },
  { id: 7, type: 'project', text: 'Site visit scheduled for Bloemfontein Branch Setup', time: '4 days ago', icon: Calendar, color: 'text-cyan-500' },
  { id: 8, type: 'task', text: '12 tasks completed across active projects this week', time: '5 days ago', icon: CheckCircle, color: 'text-blue-500' },
];

const taskCompletionData = [
  { week: 'Week 1', completed: 18, total: 24 },
  { week: 'Week 2', completed: 22, total: 28 },
  { week: 'Week 3', completed: 15, total: 20 },
  { week: 'Week 4', completed: 27, total: 30 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatZAR = (value: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(value);

const StatCard: React.FC<{
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}> = ({ title, value, sub, icon: Icon, color }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
      <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ── Tab Components ────────────────────────────────────────────────────────────

const RevenueTab: React.FC = () => (
  <div className="space-y-6">
    {/* Stat Cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="Total Revenue" value={formatZAR(1169000)} sub="Last 6 months" icon={DollarSign} color="bg-blue-500" />
      <StatCard title="Avg Project Value" value={formatZAR(84220)} sub="Per project" icon={TrendingUp} color="bg-green-500" />
      <StatCard title="Highest Invoice" value={formatZAR(254000)} sub="Dec 2024" icon={Award} color="bg-yellow-500" />
      <StatCard title="Paid vs Pending" value="78% / 22%" sub="Of total invoiced" icon={FileText} color="bg-purple-500" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Monthly Revenue Bar Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Revenue (ZAR)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={monthlyRevenueData} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value: any) => [formatZAR(Number(value) || 0), 'Revenue']} />
            <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue by Payment Type Pie */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue by Payment Type</h3>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={revenueByPaymentType}
              cx="50%"
              cy="50%"
              outerRadius={90}
              dataKey="value"
              label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${(((percent ?? 0) * 100)).toFixed(0)}%`}
              labelLine={false}
            >
              {revenueByPaymentType.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: any) => formatZAR(Number(value) || 0)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

const ProjectsTab: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Projects by Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Projects by Status</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={projectsByStatus} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="status" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {projectsByStatus.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Projects by Priority Doughnut */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Projects by Priority</h3>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={projectsByPriority}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}`}
            >
              {projectsByPriority.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>

    {/* Project Completion Table */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Project Completion & Timelines</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Project</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Completion</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Timeline</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Duration</th>
            </tr>
          </thead>
          <tbody>
            {projectCompletionData.map((p, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-3 font-medium text-gray-800">{p.name}</td>
                <td className="py-3 px-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    p.status === 'Completed' ? 'bg-green-100 text-green-700' :
                    p.status === 'Active' ? 'bg-blue-100 text-blue-700' :
                    p.status === 'On Hold' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {p.status === 'Completed' && <CheckCircle size={10} />}
                    {p.status === 'Active' && <Activity size={10} />}
                    {p.status === 'On Hold' && <PauseCircle size={10} />}
                    {p.status === 'Planning' && <Clock size={10} />}
                    {p.status}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5 w-24">
                      <div
                        className={`h-1.5 rounded-full ${p.completion === 100 ? 'bg-green-500' : p.completion >= 50 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                        style={{ width: `${p.completion}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">{p.completion}%</span>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span className={`text-xs font-medium ${
                    p.timeline === 'On Time' || p.timeline === 'Early' || p.timeline === 'On Track' ? 'text-green-600' :
                    p.timeline === 'Delayed' ? 'text-red-600' :
                    'text-gray-500'
                  }`}>{p.timeline}</span>
                </td>
                <td className="py-3 px-3 text-gray-600">{p.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const ClientsTab: React.FC = () => (
  <div className="space-y-6">
    {/* Stats */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="Total Clients" value="47" sub="All time" icon={Users} color="bg-blue-500" />
      <StatCard title="Active Clients" value="31" sub="Currently engaged" icon={User} color="bg-green-500" />
      <StatCard title="Retention Rate" value="84%" sub="Year over year" icon={Star} color="bg-yellow-500" />
      <StatCard title="New This Year" value="12" sub="Onboarded in 2024" icon={ArrowUpRight} color="bg-purple-500" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* New Clients per Month */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">New Clients per Month</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={newClientsPerMonth} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="clients" fill="#10b981" radius={[4, 4, 0, 0]} name="New Clients" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Client Retention */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-center items-center gap-4">
        <h3 className="text-sm font-semibold text-gray-700 self-start">Client Retention Rate</h3>
        <div className="relative flex items-center justify-center">
          <svg width={180} height={180} viewBox="0 0 180 180">
            <circle cx="90" cy="90" r="70" fill="none" stroke="#f0f0f0" strokeWidth="18" />
            <circle
              cx="90" cy="90" r="70"
              fill="none" stroke="#10b981" strokeWidth="18"
              strokeDasharray={`${2 * Math.PI * 70 * 0.84} ${2 * Math.PI * 70 * 0.16}`}
              strokeLinecap="round"
              transform="rotate(-90 90 90)"
            />
          </svg>
          <div className="absolute text-center">
            <p className="text-3xl font-bold text-gray-900">84%</p>
            <p className="text-xs text-gray-500">Retention</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full text-center">
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-lg font-bold text-green-700">39</p>
            <p className="text-xs text-gray-500">Retained</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-lg font-bold text-red-500">8</p>
            <p className="text-xs text-gray-500">Churned</p>
          </div>
        </div>
      </div>
    </div>

    {/* Top Clients Table */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Clients by Revenue</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">#</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Client</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Projects</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Total Revenue</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {topClientsByRevenue.map((c, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-3 text-gray-400 font-medium">{i + 1}</td>
                <td className="py-3 px-3 font-medium text-gray-800">{c.name}</td>
                <td className="py-3 px-3 text-gray-600">{c.projects}</td>
                <td className="py-3 px-3 font-semibold text-gray-800">{formatZAR(c.revenue)}</td>
                <td className="py-3 px-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    c.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>{c.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const ActivityTab: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="Tasks This Week" value="27 / 30" sub="90% completion" icon={CheckCircle} color="bg-green-500" />
      <StatCard title="Invoices Sent" value="8" sub="This month" icon={FileText} color="bg-blue-500" />
      <StatCard title="Meetings Logged" value="14" sub="This month" icon={Calendar} color="bg-yellow-500" />
      <StatCard title="Overdue Items" value="3" sub="Needs attention" icon={AlertCircle} color="bg-red-500" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {activityTimeline.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="flex gap-3 items-start">
                <div className={`mt-0.5 flex-shrink-0 ${item.color}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 leading-snug">{item.text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Completion Rate */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Task Completion Rate (Weekly)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={taskCompletionData} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="week" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" fill="#e5e7eb" name="Total Tasks" radius={[4, 4, 0, 0]} />
            <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 space-y-2">
          {taskCompletionData.map((w, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 w-16">{w.week}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${(w.completed / w.total) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 w-12 text-right">
                {Math.round((w.completed / w.total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

const ReportsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>('last6Months');
  const [activeTab, setActiveTab] = useState<Tab>('revenue');

  const dateRangeOptions: { key: DateRange; label: string }[] = [
    { key: 'thisMonth', label: 'This Month' },
    { key: 'lastMonth', label: 'Last Month' },
    { key: 'last3Months', label: 'Last 3 Months' },
    { key: 'last6Months', label: 'Last 6 Months' },
    { key: 'thisYear', label: 'This Year' },
  ];

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'revenue', label: 'Revenue', icon: TrendingUp },
    { key: 'projects', label: 'Projects', icon: Briefcase },
    { key: 'clients', label: 'Clients', icon: Users },
    { key: 'activity', label: 'Activity', icon: Activity },
  ];

  const handleExport = () => {
    toast.success('Report exported successfully!');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Insights into revenue, projects, clients, and activity</p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <FileText size={15} />
          Export Report
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {dateRangeOptions.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setDateRange(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              dateRange === key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'revenue' && <RevenueTab />}
      {activeTab === 'projects' && <ProjectsTab />}
      {activeTab === 'clients' && <ClientsTab />}
      {activeTab === 'activity' && <ActivityTab />}
    </div>
  );
};

export default ReportsPage;
