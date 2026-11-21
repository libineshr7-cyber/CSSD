import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserCheck, FileText, Receipt, FileSignature,
  CreditCard, FileSpreadsheet, Briefcase, CheckSquare, Paintbrush, TestTube,
  Rocket, HandshakeIcon, Wrench, Activity, LifeBuoy, FolderOpen,
  BarChart3, Settings, Shield
} from 'lucide-react'
import { cn } from '../../lib/utils'

const navItems = [
  { label: 'Overview', path: '/', icon: LayoutDashboard, exact: true },
  { type: 'separator', label: 'BUSINESS' },
  { label: 'Leads', path: '/leads', icon: Users },
  { label: 'Clients', path: '/clients', icon: UserCheck },
  { label: 'Requirements', path: '/requirements', icon: FileText },
  { label: 'Quotations', path: '/quotations', icon: Receipt },
  { label: 'Agreements', path: '/agreements', icon: FileSignature },
  { type: 'separator', label: 'FINANCE' },
  { label: 'Payments', path: '/payments', icon: CreditCard },
  { label: 'Invoices', path: '/invoices', icon: FileSpreadsheet },
  { type: 'separator', label: 'PROJECTS' },
  { label: 'Projects', path: '/projects', icon: Briefcase },
  { label: 'Tasks', path: '/tasks', icon: CheckSquare },
  { label: 'Design Approvals', path: '/design-approvals', icon: Paintbrush },
  { label: 'Testing & QA', path: '/testing', icon: TestTube },
  { label: 'Deployments', path: '/deployments', icon: Rocket },
  { label: 'Handover', path: '/handover', icon: HandshakeIcon },
  { type: 'separator', label: 'OPERATIONS' },
  { label: 'Maintenance', path: '/maintenance', icon: Wrench },
  { label: 'Monitoring', path: '/monitoring', icon: Activity },
  { label: 'Support Tickets', path: '/tickets', icon: LifeBuoy },
  { label: 'Documents', path: '/documents', icon: FolderOpen },
  { type: 'separator', label: 'SYSTEM' },
  { label: 'Reports', path: '/reports', icon: BarChart3 },
  { label: 'Settings', path: '/settings', icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="w-60 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-white font-bold text-sm leading-none">CapeSecure</div>
          <div className="text-slate-500 text-xs mt-0.5">Business Management</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item, i) => {
          if (item.type === 'separator') {
            return (
              <div key={i} className="px-2 pt-4 pb-1">
                <span className="text-xs font-semibold text-slate-600 tracking-wider uppercase">
                  {item.label}
                </span>
              </div>
            )
          }

          const Icon = item.icon!
          return (
            <NavLink
              key={item.path}
              to={item.path!}
              end={item.exact}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                )
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            CA
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-slate-300 text-xs font-medium truncate">CapeSecure Admin</div>
            <div className="text-slate-500 text-xs truncate">admin@capesecure.co.za</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
