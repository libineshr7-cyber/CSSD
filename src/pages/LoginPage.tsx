import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Shield, Eye, EyeOff, Lock, Mail, Sun, Moon, ArrowRight, UserPlus, Database, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import type { AppRole } from '../types/database'

export default function LoginPage() {
  const { signIn, signUp, isSupabaseConfigured } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const [isSignUpMode, setIsSignUpMode] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<AppRole>('technical_staff')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const from = (location.state as any)?.from?.pathname || '/admin'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email || !password) {
      setErrorMessage('Please fill in both email and password.')
      return
    }

    setLoading(true)

    if (isSignUpMode) {
      if (!fullName) {
        setLoading(false)
        setErrorMessage('Please enter your full administrator name.')
        return
      }

      const { error, data } = await signUp(email, password, fullName, role)
      setLoading(false)

      if (error) {
        setErrorMessage(error.message)
        toast.error(error.message)
      } else {
        if (data?.session) {
          toast.success(`Admin profile provisioned! Entering workspace as ${role}...`)
          navigate(from, { replace: true })
        } else {
          toast.success('Admin account created! Check your email to confirm, then sign in.')
          setIsSignUpMode(false)
        }
      }
    } else {
      const { error, user } = await signIn(email, password)
      setLoading(false)

      if (error) {
        setErrorMessage(error.message)
        toast.error(error.message)
      } else if (user) {
        toast.success('Identity verified. Welcome to CapeSecure BMS!')
        navigate(from, { replace: true })
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#1E1E1E] figma-canvas-dots flex flex-col items-center justify-center p-4 relative select-none overflow-hidden">
      
      {/* Top Bar on Login Canvas */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] rounded-xl shadow-xs hover:border-[#0D99FF] transition-colors"
          title="Return to Public Website"
        >
          <img src="/logo.png" alt="CapeSecure" className="w-5 h-5 rounded object-contain flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            CapeSecure BMS
          </span>
          <span className="text-[10px] text-slate-400 font-mono">v2.0</span>
          <span className="text-[10px] text-[#0D99FF] ml-1 font-medium">← Public Site</span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <Database className="w-3 h-3" />
            <span>Supabase Auth Protected</span>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] text-slate-600 dark:text-slate-300 hover:text-[#0D99FF] shadow-xs transition-colors"
            title="Toggle Canvas Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-[#FFC700]" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Login Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-sm z-10"
      >
        {/* Brand Icon & Heading */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="relative mb-2">
            <img
              src="/logo.png"
              alt="CapeSecure"
              className="w-16 h-16 rounded-full object-contain drop-shadow-md"
            />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-[#F5F5F5] tracking-tight">
            Administrator Gateway
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            Internal Operations, Financials & Client Security
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Invite/Register Admin */}
        <div className="flex bg-slate-200/80 dark:bg-[#181818] p-1 rounded-xl mb-3 text-xs">
          <button
            type="button"
            onClick={() => {
              setIsSignUpMode(false)
              setErrorMessage(null)
            }}
            className={`flex-1 py-1.5 font-semibold rounded-lg transition-all ${
              !isSignUpMode
                ? 'bg-white dark:bg-[#2C2C2C] text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Admin Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUpMode(true)
              setErrorMessage(null)
            }}
            className={`flex-1 py-1.5 font-semibold rounded-lg transition-all ${
              isSignUpMode
                ? 'bg-white dark:bg-[#2C2C2C] text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Provision Admin
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-3 p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-xs text-red-500 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-6 shadow-xl space-y-4"
        >
          {isSignUpMode && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Libinesh R"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D99FF] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Assigned Administrative Role
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as AppRole)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-900 dark:text-slate-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0D99FF]"
                >
                  <option value="super_admin">Super Admin (Universal Access)</option>
                  <option value="administrator">Administrator</option>
                  <option value="project_manager">Project Manager</option>
                  <option value="finance_manager">Finance Manager</option>
                  <option value="technical_staff">Technical Staff</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Permissions are validated at database level via PostgreSQL Row Level Security.
                </span>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Administrator Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@capesecure.com"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D99FF] transition-all"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Password *
              </label>
              {!isSignUpMode && (
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-[#0D99FF] hover:underline"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-9 pr-10 py-2 bg-slate-50 dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D99FF] transition-all"
                autoComplete={isSignUpMode ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#0D99FF] hover:bg-[#007BE5] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all text-xs shadow-xs mt-2 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isSignUpMode ? 'Provisioning account in Supabase...' : 'Authenticating...'}
              </span>
            ) : isSignUpMode ? (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Administrator Account</span>
              </>
            ) : (
              <>
                <span>Sign In to Admin Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-[#E5E5E5] dark:border-[#383838] text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Looking for your client workspace?{' '}
            <Link to="/portal" className="text-[#0D99FF] hover:underline font-semibold inline-flex items-center gap-1">
              <span>Go to Client Portal</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </p>
        </div>

        <p className="text-center text-slate-400 text-[11px] mt-6">
          CapeSecure Business Management System &copy; {new Date().getFullYear()} · Row Level Security Enabled
        </p>
      </motion.div>
    </div>
  )
}
