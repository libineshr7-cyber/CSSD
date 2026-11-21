import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell, Search, Sun, Moon, LogOut, Share2, Layers,
  ChevronDown, Check, Command, Shield, User, Clock, RefreshCw
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { ROLE_LABELS } from '../../types/database'
import toast from 'react-hot-toast'
import { isSupabaseConfigured, testDatabaseConnection } from '../../lib/supabase'
import ShareModal from './ShareModal'
import CommandPalette from './CommandPalette'

interface TopNavProps {
  onOpenCommandPalette?: () => void
}

export default function TopNav({}: TopNavProps) {
  const { theme, toggleTheme } = useTheme()
  const {
    signOut,
    role,
    profile,
    user,
    sessionTimeRemaining,
    refreshSession
  } = useAuth()
  const navigate = useNavigate()
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [isCommandOpen, setIsCommandOpen] = useState(false)
  const [zoomLevel, setZoomLevel] = useState('100%')
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false)
  const [activeMode, setActiveMode] = useState<'canvas' | 'table'>('canvas')
  const [testingDb, setTestingDb] = useState(false)

  const roleInfo = ROLE_LABELS[role]

  const handleCheckDb = async () => {
    setTestingDb(true)
    const result = await testDatabaseConnection()
    setTestingDb(false)
    if (result.connected) {
      toast.success(
        `Supabase Connected! (${result.latencyMs}ms)\n${result.url}`,
        { duration: 5000 }
      )
    } else {
      toast(
        `Supabase Disconnected\n${result.error || 'Check environment variables'}`,
        { icon: '⚠️', duration: 5000 }
      )
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin/login')
    toast.success('Signed out securely.')
  }

  const minutes = Math.floor(sessionTimeRemaining / 60)
  const seconds = sessionTimeRemaining % 60

  return (
    <>
      <header className="h-12 bg-white dark:bg-[#2C2C2C] border-b border-[#E5E5E5] dark:border-[#383838] flex items-center justify-between px-3 gap-2 flex-shrink-0 select-none z-30">
        
        {/* Left: Brand & Database Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer">
            <img src="/logo.png" alt="CapeSecure" className="w-5 h-5 rounded object-contain flex-shrink-0" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#1E1E1E] dark:text-[#F5F5F5] tracking-tight">
                CapeSecure BMS
              </span>
              <button
                onClick={handleCheckDb}
                disabled={testingDb}
                title="Click to check live Supabase database connection"
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                  isSupabaseConfigured
                    ? 'bg-[#0ACF83]/10 text-[#0ACF83] border-[#0ACF83]/25 hover:bg-[#0ACF83]/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/20'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? 'bg-[#0ACF83]' : 'bg-amber-500'} animate-pulse`} />
                {testingDb ? 'Checking...' : isSupabaseConfigured ? 'Supabase RLS' : 'Offline Mode'}
              </button>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-[#383838]" />

          {/* Active Role Pill */}
          <Link
            to="/admin/profile"
            className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors hover:opacity-85 ${roleInfo.badge}`}
            title="Current Security Role - Click to manage permissions"
          >
            <Shield className="w-2.5 h-2.5" />
            <span>{roleInfo.label}</span>
          </Link>
        </div>

        {/* Center: Command Palette Trigger */}
        <div className="flex-1 max-w-sm mx-2">
          <button
            onClick={() => setIsCommandOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-[#1E1E1E] hover:bg-slate-100 dark:hover:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0D99FF] transition-colors" />
              <span className="text-slate-500 dark:text-slate-400 text-xs">Search modules, clients, tasks...</span>
            </div>
            <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] text-[10px] font-mono text-slate-500">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>
        </div>

        {/* Right: Session Countdown & User Profile */}
        <div className="flex items-center gap-2">
          
          {/* Idle Session Warning Countdown */}
          <div
            onClick={refreshSession}
            title="Idle Session Timeout Timer - Click to refresh token"
            className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-[10px] font-mono text-slate-500 dark:text-slate-400 hover:border-[#0D99FF] cursor-pointer transition-colors"
          >
            <Clock className="w-3 h-3 text-amber-500" />
            <span>{minutes}:{seconds < 10 ? `0${seconds}` : seconds}</span>
            <RefreshCw className="w-2.5 h-2.5 text-slate-400 hover:text-[#0D99FF]" />
          </div>

          {/* Share Modal Trigger */}
          <button
            onClick={() => setIsShareOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0D99FF] hover:bg-[#007BE5] active:scale-95 text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <Share2 className="w-3 h-3" />
            <span className="hidden sm:inline">Share</span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-[#383838]" />

          {/* Theme Toggle */}
          <motion.button
            whileTap={{ rotate: 180, scale: 0.9 }}
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#383838] text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light Theme' : 'Dark Theme'}`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[#FFC700]" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </motion.button>

          {/* Admin Profile Link */}
          <Link
            to="/admin/profile"
            className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#383838] transition-colors"
            title="Administrator Profile & Security"
          >
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-[#0D99FF] to-[#A259FF] text-white flex items-center justify-center font-bold text-[10px]">
              {profile?.full_name ? profile.full_name.slice(0, 2).toUpperCase() : user?.email?.slice(0, 2).toUpperCase() || 'AD'}
            </div>
          </Link>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-[#F24E1E] transition-colors cursor-pointer"
            title="Secure Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Interactive Modals */}
      <ShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />
      <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
    </>
  )
}
