import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, UserCheck, FileText, Receipt, FileSignature,
  CreditCard, FileSpreadsheet, Briefcase, CheckSquare, Paintbrush, TestTube,
  Rocket, HandshakeIcon, Wrench, Activity, LifeBuoy, FolderOpen,
  BarChart3, Settings, ChevronDown, ChevronRight, Search, ExternalLink, User
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
    title: 'CANVAS & OVERVIEW',
    items: [
      { label: 'Overview', path: '/admin', module: 'overview', icon: LayoutDashboard, exact: true },
      { label: 'Analytics', path: '/admin/reports', module: 'reports', icon: BarChart3, badge: 'New', badgeColor: 'bg-[#0ACF83]/15 text-[#0ACF83]' },
    ]
  },
  {
    title: 'CRM & BUSINESS',
    items: [
      { label: 'Leads', path: '/admin/leads', module: 'leads', icon: Users, badge: '12' },
      { label: 'Clients', path: '/admin/clients', module: 'clients', icon: UserCheck },
      { label: 'Requirements', path: '/admin/requirements', module: 'requirements', icon: FileText },
      { label: 'Quotations', path: '/admin/quotations', module: 'quotations', icon: Receipt },
      { label: 'Agreements', path: '/admin/agreements', module: 'agreements', icon: FileSignature },
    ]
  },
  {
    title: 'FINANCE & BILLING',
    items: [
      { label: 'Payments', path: '/admin/payments', module: 'payments', icon: CreditCard },
      { label: 'Invoices', path: '/admin/invoices', module: 'invoices', icon: FileSpreadsheet, badge: 'Due' },
    ]
  },
  {
    title: 'PRODUCTION & QA',
    items: [
      { label: 'Projects', path: '/admin/projects', module: 'projects', icon: Briefcase, badge: '8' },
      { label: 'Tasks', path: '/admin/tasks', module: 'tasks', icon: CheckSquare },
      { label: 'Design Approvals', path: '/admin/design-approvals', module: 'design-approvals', icon: Paintbrush, badgeColor: 'bg-[#A259FF]/15 text-[#A259FF]' },
      { label: 'Testing & QA', path: '/admin/testing', module: 'testing', icon: TestTube },
      { label: 'Deployments', path: '/admin/deployments', module: 'deployments', icon: Rocket },
      { label: 'Handover', path: '/admin/handover', module: 'handover', icon: HandshakeIcon },
    ]
  },
  {
    title: 'OPERATIONS & SUPPORT',
    items: [
      { label: 'Maintenance', path: '/admin/maintenance', module: 'maintenance', icon: Wrench },
      { label: 'Monitoring', path: '/admin/monitoring', module: 'monitoring', icon: Activity },
      { label: 'Support Tickets', path: '/admin/tickets', module: 'tickets', icon: LifeBuoy, badge: '3', badgeColor: 'bg-[#F24E1E]/15 text-[#F24E1E]' },
      { label: 'Documents', path: '/admin/documents', module: 'documents', icon: FolderOpen },
      { label: 'Settings', path: '/admin/settings', module: 'settings', icon: Settings },
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
    <aside className="w-56 flex-shrink-0 bg-white dark:bg-[#252525] border-r border-[#E5E5E5] dark:border-[#383838] flex flex-col h-full select-none z-20">
      
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#E5E5E5] dark:border-[#383838]">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="CapeSecure" className="w-4 h-4 rounded object-contain" />
          <span className="text-xs font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Navigation
          </span>
        </div>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${roleInfo.badge}`}>
          {roleInfo.label.split(' ')[0]}
        </span>
      </div>

      {/* Search Filter */}
      <div className="p-2 border-b border-[#E5E5E5] dark:border-[#383838]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <input
            type="text"
            placeholder="Filter modules..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-7 pr-2 py-1 bg-slate-50 dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#333333] rounded-md text-[11px] text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:border-[#0D99FF]"
          />
        </div>
      </div>

      {/* Nav List with RBAC module gating */}
      <nav className="flex-1 overflow-y-auto p-1.5 space-y-1 figma-scrollbar">
        {navSections.map((section) => {
          // Filter items based on user's active role permission and search filter
          const allowedItems = section.items
            .filter(item => canView(item.module))
            .filter(item => !searchFilter || item.label.toLowerCase().includes(searchFilter.toLowerCase()))

          if (allowedItems.length === 0) return null

          const isCollapsed = collapsedSections[section.title]

          return (
            <div key={section.title} className="mb-1">
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-400 uppercase rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors group cursor-pointer"
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
                    className="overflow-hidden space-y-0.5 mt-0.5"
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
                                ? 'bg-[#0D99FF]/10 text-[#0D99FF] font-semibold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/5'
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <div className="flex items-center gap-2 min-w-0">
                                <Icon
                                  className={cn(
                                    'w-3.5 h-3.5 flex-shrink-0 transition-colors',
                                    isActive
                                      ? 'text-[#0D99FF]'
                                      : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                                  )}
                                />
                                <span className="truncate text-xs">{item.label}</span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {item.badge && (
                                  <span className={cn(
                                    'text-[9px] font-semibold px-1.5 py-0.2 rounded-full',
                                    item.badgeColor || 'bg-slate-100 dark:bg-[#333333] text-slate-500 dark:text-slate-400'
                                  )}>
                                    {item.badge}
                                  </span>
                                )}
                                {isActive && (
                                  <motion.div
                                    layoutId="figmaActiveDot"
                                    className="w-1.5 h-1.5 rounded-full bg-[#0D99FF]"
                                  />
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

      {/* Admin Profile Footer Card */}
      <div className="border-t border-[#E5E5E5] dark:border-[#383838] p-2 space-y-1.5 bg-slate-50/50 dark:bg-[#202020]">
        <Link
          to="/"
          className="flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2C2C2C] transition-colors"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-[#0D99FF]" />
            <span>Public Website</span>
          </span>
          <span className="text-[10px] text-slate-400">Live</span>
        </Link>

        {/* User Profile Link */}
        <Link
          to="/admin/profile"
          className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group"
          title="Click to view & edit admin profile"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#0D99FF] to-[#A259FF] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
            {profile?.full_name ? profile.full_name.slice(0, 2).toUpperCase() : user?.email?.slice(0, 2).toUpperCase() || 'AD'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-[#0D99FF] transition-colors">
              {profile?.full_name || 'Admin User'}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {roleInfo.label}
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-[#0ACF83]" title="Authenticated" />
        </Link>
      </div>
    </aside>
  )
}
