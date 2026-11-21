import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, LayoutDashboard, Users, UserCheck, FileText, Receipt,
  FileSignature, CreditCard, FileSpreadsheet, Briefcase, CheckSquare,
  Paintbrush, TestTube, Rocket, Shield, Sun, Moon, ArrowRight, CornerDownLeft
} from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { demoProjects, demoClients } from '../../data/demoData'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

interface ActionItem {
  id: string
  title: string
  category: 'Navigation' | 'Projects' | 'Clients' | 'Actions'
  icon: any
  shortcut?: string
  action: () => void
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (isOpen) onClose()
        else setQuery('')
      } else if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const actions: ActionItem[] = [
    {
      id: 'nav-overview',
      title: 'Go to Admin Overview Dashboard',
      category: 'Navigation',
      icon: LayoutDashboard,
      action: () => { navigate('/admin'); onClose() }
    },
    {
      id: 'nav-projects',
      title: 'Go to Projects',
      category: 'Navigation',
      icon: Briefcase,
      shortcut: 'P',
      action: () => { navigate('/admin/projects'); onClose() }
    },
    {
      id: 'nav-leads',
      title: 'Go to Leads Pipeline',
      category: 'Navigation',
      icon: Users,
      action: () => { navigate('/admin/leads'); onClose() }
    },
    {
      id: 'nav-clients',
      title: 'Go to Clients Directory',
      category: 'Navigation',
      icon: UserCheck,
      action: () => { navigate('/admin/clients'); onClose() }
    },
    {
      id: 'nav-quotations',
      title: 'Go to Quotations',
      category: 'Navigation',
      icon: Receipt,
      action: () => { navigate('/admin/quotations'); onClose() }
    },
    {
      id: 'nav-agreements',
      title: 'Go to Agreements & Contracts',
      category: 'Navigation',
      icon: FileSignature,
      action: () => { navigate('/admin/agreements'); onClose() }
    },
    {
      id: 'nav-payments',
      title: 'Go to Payments',
      category: 'Navigation',
      icon: CreditCard,
      action: () => { navigate('/admin/payments'); onClose() }
    },
    {
      id: 'nav-invoices',
      title: 'Go to Invoices & Billing',
      category: 'Navigation',
      icon: FileSpreadsheet,
      action: () => { navigate('/admin/invoices'); onClose() }
    },
    {
      id: 'nav-maintenance',
      title: 'Go to Maintenance & Renewals',
      category: 'Navigation',
      icon: Rocket,
      action: () => { navigate('/admin/maintenance'); onClose() }
    },
    {
      id: 'nav-documents',
      title: 'Go to Document Storage',
      category: 'Navigation',
      icon: FileText,
      action: () => { navigate('/admin/documents'); onClose() }
    },
    {
      id: 'nav-settings',
      title: 'Go to Admin Settings',
      category: 'Navigation',
      icon: Shield,
      action: () => { navigate('/admin/settings'); onClose() }
    },
    {
      id: 'nav-public',
      title: 'View CapeSecure Public Website',
      category: 'Navigation',
      icon: ArrowRight,
      action: () => { navigate('/'); onClose() }
    },
    {
      id: 'act-theme',
      title: `Toggle Theme (Current: ${theme === 'dark' ? 'Dark Figma' : 'Light Canvas'})`,
      category: 'Actions',
      icon: theme === 'dark' ? Sun : Moon,
      shortcut: 'T',
      action: () => { toggleTheme(); onClose() }
    },
    ...demoProjects.slice(0, 4).map(p => ({
      id: `proj-${p.id}`,
      title: `Project: ${p.name} (${p.status})`,
      category: 'Projects' as const,
      icon: Briefcase,
      action: () => { navigate('/admin/projects'); onClose() }
    })),
    ...demoClients.slice(0, 4).map(c => ({
      id: `client-${c.id}`,
      title: `Client: ${c.name} - ${c.company}`,
      category: 'Clients' as const,
      icon: UserCheck,
      action: () => { navigate('/admin/clients'); onClose() }
    }))
  ]

  const filtered = actions.filter(a =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDownList = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % (filtered.length || 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault()
      filtered[selectedIndex].action()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative w-full max-w-xl bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl shadow-2xl overflow-hidden z-10"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E5E5E5] dark:border-[#333333]">
              <Search className="w-4 h-4 text-[#0D99FF] flex-shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDownList}
                placeholder="Search commands, layers, clients, projects... (e.g. Overview, Theme)"
                className="w-full bg-transparent text-sm text-[#1E1E1E] dark:text-[#F5F5F5] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
              />
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-[#333333] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                ESC
              </span>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                  No matching commands or layers found.
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const Icon = item.icon
                  const isSelected = idx === selectedIndex
                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left ${
                        isSelected
                          ? 'bg-[#0D99FF] text-white'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2C2C2C]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-1 rounded-md ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#2C2C2C] text-[#0D99FF]'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="truncate">{item.title}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#333333] text-slate-400'
                        }`}>
                          {item.category}
                        </span>
                        {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-white/80" />}
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-slate-50 dark:bg-[#1A1A1A] border-t border-[#E5E5E5] dark:border-[#333333] flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600 dark:text-slate-300">↑↓</span> to navigate
                <span className="font-semibold text-slate-600 dark:text-slate-300 ml-2">↵</span> to select
              </span>
              <span className="text-slate-700 dark:text-slate-200 font-medium flex items-center gap-1.5">
                <img src="/logo.png" alt="CapeSecure" className="w-4 h-4 rounded object-contain" /> CapeSecure BMS
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
