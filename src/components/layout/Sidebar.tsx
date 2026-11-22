import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, UserCheck, FileText, Receipt, FileSignature,
  CreditCard, FileSpreadsheet, Briefcase, CheckSquare, Paintbrush, TestTube,
  Rocket, HandshakeIcon, Wrench, Activity, LifeBuoy, FolderOpen,
  BarChart3, Settings, ChevronDown, ChevronRight, Search, ExternalLink, ShieldCheck
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../contexts/AuthContext'
import { ROLE_LABELS, type NavModule } from '../../types/database'

interface NavItem {
  label: string
  path: string
  module: NavModule
  icon: any
  badge?: string
  badgeColor?: string
  exact?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'WORKSPACE',
    items: [
      { label: 'Overview', path: '/admin', module: 'overview', icon: LayoutDashboard, exact: true },
      { label: 'Analytics & KPIs', path: '/admin/reports', module: 'reports', icon: BarChart3, badge: 'Live', badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    ]
  },
  {
    title: 'CRM & CLIENTS',
    items: [
      { label: 'Leads Pipeline', path: '/admin/leads', module: 'leads', icon: Users },
      { label: 'Client Accounts', path: '/admin/clients', module: 'clients', icon: UserCheck },
      { label: 'PRD Requirements', path: '/admin/requirements', module: 'requirements', icon: FileText },
      { label: 'Quotations', path: '/admin/quotations', module: 'quotations', icon: Receipt },
      { label: 'Legal Agreements', path: '/admin/agreements', module: 'agreements', icon: FileSignature },
    ]
  },
  {
    title: 'FINANCE & BILLING',
    items: [
      { label: 'Payments & Gateway', path: '/admin/payments', module: 'payments', icon: CreditCard },
      { label: 'GST Invoices', path: '/admin/invoices', module: 'invoices', icon: FileSpreadsheet, badge: 'GST', badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    ]
  },
  {
    title: 'ENGINEERING & QA',
    items: [
      { label: 'Projects Pipeline', path: '/admin/projects', module: 'projects', icon: Briefcase },
      { label: 'Tasks & Sprints', path: '/admin/tasks', module: 'tasks', icon: CheckSquare },
      { label: 'Design Approvals', path: '/admin/design-approvals', module: 'design-approvals', icon: Paintbrush, badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
      { label: 'Testing & QA Matrix', path: '/admin/testing', module: 'testing', icon: TestTube },
      { label: 'Deployments', path: '/admin/deployments', module: 'deployments', icon: Rocket },
      { label: 'Client Handover', path: '/admin/handover', module: 'handover', icon: HandshakeIcon },
    ]
  },
  {
    title: 'OPERATIONS & SUPPORT',
    items: [
      { label: 'Maintenance SLAs', path: '/admin/maintenance', module: 'maintenance', icon: Wrench },
      { label: 'Website Monitoring', path: '/admin/monitoring', module: 'monitoring', icon: Activity },
      { label: 'Support Tickets', path: '/admin/tickets', module: 'tickets', icon: LifeBuoy },
      { label: 'Document Vault', path: '/admin/documents', module: 'documents', icon: FolderOpen },
      { label: 'System Settings', path: '/admin/settings', module: 'settings', icon: Settings },
    ]
  }
]

export default function Sidebar() {
  const { canView, role, profile, user } = useAuth()
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const [searchFilter, setSearchFilter] = useState('')

  const roleInfo = ROLE_LABELS[role]

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }))
  }

  return (
    <aside className="w-60 flex-shrink-0 bg-white dark:bg-[#0b101d] border-r border-slate-200 dark:border-slate-800/80 flex flex-col h-full select-none z-20 transition-all duration-200">
      
      {/* Brand Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-200/80 dark:border-slate-800/80">
        <Link to="/admin" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-slate-100">
                CapeSecure
              </span>
              <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                BMS
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Enterprise Suite</div>
          </div>
        </Link>

        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider ${roleInfo.badge}`}>
          {roleInfo.label.split(' ')[0]}
        </span>
      </div>

      {/* Quick Filter Box */}
      <div className="p-2.5 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter modules..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-[#0e1526] border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Navigation Groups with Module Permissions */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
        {navSections.map((section) => {
          const allowedItems = section.items
            .filter(item => canView(item.module))
            .filter(item => !searchFilter || item.label.toLowerCase().includes(searchFilter.toLowerCase()))

          if (allowedItems.length === 0) return null

          const isCollapsed = collapsedSections[section.title]

          return (
            <div key={section.title} className="space-y-0.5">
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-400 uppercase rounded hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
              >
                <span>{section.title}</span>
                <span className="text-slate-400 opacity-60 group-hover:opacity-100">
                  {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden space-y-0.5"
                  >
                    {allowedItems.map((item) => {
                      const Icon = item.icon
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          end={item.exact}
                          className={({ isActive }) =>
                            cn(
                              'flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group relative',
                              isActive
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Icon
                                  className={cn(
                                    'w-4 h-4 flex-shrink-0 transition-colors',
                                    isActive
                                      ? 'text-blue-600 dark:text-blue-400'
                                      : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                                  )}
                                />
                                <span className="truncate">{item.label}</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {item.badge && (
                                  <span className={cn(
                                    'text-[9px] font-semibold px-1.5 py-0.2 rounded-md',
                                    item.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                  )}>
                                    {item.badge}
                                  </span>
                                )}
                                {isActive && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                                )}
                              </div>
                            </>
                          )}
                        </NavLink>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </nav>

      {/* Administrator Profile Footer */}
      <div className="border-t border-slate-200/80 dark:border-slate-800/80 p-2.5 space-y-1.5 bg-slate-50/70 dark:bg-[#090d16]/70">
        <Link
          to="/"
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
            <span>Public Website</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Live</span>
        </Link>

        {/* User Card */}
        <Link
          to="/admin/profile"
          className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group cursor-pointer"
          title="Manage administrator security & profile"
        >
          <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
            {profile?.full_name ? profile.full_name.slice(0, 2).toUpperCase() : user?.email?.slice(0, 2).toUpperCase() || 'AD'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {profile?.full_name || 'Admin User'}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {roleInfo.label}
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500" title="Active Session" />
        </Link>
      </div>
    </aside>
  )
}
