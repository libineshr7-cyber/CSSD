import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell, Search, Sun, Moon, LogOut, Share2,
  Command, Shield, Clock, RefreshCw, CheckCircle2,
  Sparkles
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { ROLE_LABELS } from '../../types/database'
import toast from 'react-hot-toast'
import { isSupabaseConfigured, testDatabaseConnection } from '../../lib/supabase'
import ShareModal from './ShareModal'
import CommandPalette from './CommandPalette'
import NotificationCenter from './NotificationCenter'

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
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [unreadCount] = useState(1)
  const [testingDb, setTestingDb] = useState(false)

  const roleInfo = ROLE_LABELS[role]

  const handleCheckDb = async () => {
    setTestingDb(true)
    const result = await testDatabaseConnection()
    setTestingDb(false)
    if (result.connected) {
      toast.success(
        `Supabase Connected (${result.latencyMs}ms)\n${result.url}`,
        { duration: 4000 }
      )
    } else {
      toast(
        `Supabase Disconnected\n${result.error || 'Check environment configuration'}`,
        { icon: '⚠️', duration: 4000 }
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
      <header className="h-13 bg-white/90 dark:bg-[#0b101d]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between px-4 sm:px-6 gap-3 flex-shrink-0 select-none z-30 transition-colors">
        
        {/* Left: System Status & Active Role */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCheckDb}
            disabled={testingDb}
            title="Supabase PostgreSQL RLS status — Click to ping"
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer bg-slate-50 dark:bg-[#0e1526] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${isSupabaseConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isSupabaseConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
              {testingDb ? 'Pinging...' : isSupabaseConfigured ? 'PostgreSQL Active' : 'Offline Buffer'}
            </span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Active Security Role Pill */}
          <Link
            to="/admin/profile"
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border transition-all hover:opacity-90 ${roleInfo.badge}`}
            title="Active RBAC Role - Click to view security capabilities"
          >
            <Shield className="w-3 h-3" />
            <span>{roleInfo.label}</span>
          </Link>
        </div>

        {/* Center: Command Palette Trigger (Linear/Raycast style) */}
        <div className="flex-1 max-w-md mx-2">
          <button
            onClick={() => setIsCommandOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-[#0e1526] hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200/90 dark:border-slate-800/90 rounded-lg text-xs text-slate-400 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
              <span className="text-slate-500 dark:text-slate-400 text-xs">Search records, invoices, clients...</span>
            </div>
            <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-700/80 text-[10px] font-mono text-slate-500 dark:text-slate-400 shadow-xs">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>
        </div>

        {/* Right: Session Timer, Quick Actions & User Profile */}
        <div className="flex items-center gap-2">
          
          {/* Session Expiry Countdown */}
          <div
            onClick={refreshSession}
            title="Session idle timeout — Click to refresh security token"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-[#0e1526] border border-slate-200 dark:border-slate-800 rounded-md text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:border-blue-500 cursor-pointer transition-colors"
          >
            <Clock className="w-3 h-3 text-amber-500" />
            <span>{minutes}:{seconds < 10 ? `0${seconds}` : seconds}</span>
            <RefreshCw className="w-2.5 h-2.5 text-slate-400 hover:text-blue-500 transition-colors" />
          </div>

          {/* Quick Action Share */}
          <button
            onClick={() => setIsShareOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-medium rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share Portal</span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Notification Center Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationOpen(prev => !prev)}
              className="relative p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              title="Notification Center"
            >
              <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 ring-2 ring-white dark:ring-[#0b101d]" />
              )}
            </button>
            <NotificationCenter
              isOpen={isNotificationOpen}
              onClose={() => setIsNotificationOpen(false)}
            />
          </div>

          {/* Dark / Light Mode Switch */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light Theme' : 'Dark Theme'}`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Admin Profile Mini Avatar */}
          <Link
            to="/admin/profile"
            className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Administrator Security Profile"
          >
            <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shadow-xs">
              {profile?.full_name ? profile.full_name.slice(0, 2).toUpperCase() : user?.email?.slice(0, 2).toUpperCase() || 'AD'}
            </div>
          </Link>

          {/* Secure Sign Out */}
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
            title="Secure Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Global Interactive Modals */}
      <ShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />
      <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
    </>
  )
}
