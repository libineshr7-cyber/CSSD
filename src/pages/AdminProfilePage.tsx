import { useState, useEffect } from 'react'
import {
  User, Shield, Key, Clock, RefreshCw, CheckCircle2, Lock,
  Mail, Phone, Calendar, AlertTriangle, Eye, EyeOff, Sliders,
  Activity, Laptop, Check, AlertCircle, Sparkles
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ROLE_LABELS, type AppRole, type NavModule } from '../types/database'
import { formatDate } from '../lib/utils'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const ALL_MODULES: NavModule[] = [
  'overview', 'leads', 'clients', 'requirements', 'quotations', 'agreements',
  'payments', 'invoices', 'projects', 'tasks', 'design-approvals', 'testing',
  'deployments', 'handover', 'maintenance', 'monitoring', 'tickets', 'documents',
  'reports', 'settings'
]

export default function AdminProfilePage() {
  const {
    user,
    profile,
    role,
    permissions,
    updateProfile,
    updatePassword,
    switchRole,
    sessionTimeRemaining,
    refreshSession,
    signOut,
    hasPermission
  } = useAuth()

  // Form states
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  // Password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  // Audit logs state
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  const roleInfo = ROLE_LABELS[role]

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name)
      setPhone(profile.phone || '')
    }
  }, [profile])

  // Fetch recent audit logs for this user
  useEffect(() => {
    if (!user) return
    setLoadingLogs(true)
    const loadLogs = async () => {
      try {
        const { data } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(8)
        if (data) setRecentLogs(data)
      } catch (_) {
      } finally {
        setLoadingLogs(false)
      }
    }
    loadLogs()
  }, [user])

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingProfile(true)
    const { error } = await updateProfile({
      full_name: fullName,
      phone: phone || null,
    })
    setIsUpdatingProfile(false)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Admin profile updated successfully!')
    }
  }

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      return toast.error('Password must be at least 8 characters long.')
    }
    if (newPassword !== confirmPassword) {
      return toast.error('Passwords do not match.')
    }

    setIsUpdatingPassword(true)
    const { error } = await updatePassword(newPassword)
    setIsUpdatingPassword(false)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Administrator password updated successfully!')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  // Format idle countdown
  const minutes = Math.floor(sessionTimeRemaining / 60)
  const seconds = sessionTimeRemaining % 60

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0D99FF] to-[#A259FF] text-white flex items-center justify-center font-bold text-xl shadow-md flex-shrink-0">
            {profile?.full_name
              ? profile.full_name.slice(0, 2).toUpperCase()
              : user?.email?.slice(0, 2).toUpperCase() || 'AD'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {profile?.full_name || 'CapeSecure Administrator'}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleInfo.badge}`}>
                {roleInfo.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
              <span>{user?.email}</span>
              <span>•</span>
              <span>ID: <code className="text-[10px] bg-slate-100 dark:bg-[#1E1E1E] px-1 py-0.5 rounded font-mono">{user?.id?.slice(0, 8)}...</code></span>
            </p>
          </div>
        </div>

        {/* Super Admin Role Switcher (Simulator for testing all 5 roles) */}
        {(profile?.role === 'super_admin' || role === 'super_admin') && (
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#1E1E1E] p-2 rounded-xl border border-[#E5E5E5] dark:border-[#383838]">
            <Sliders className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Simulate Role:</span>
            <select
              value={role}
              onChange={e => switchRole(e.target.value as AppRole)}
              className="text-xs bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] rounded-lg px-2 py-1 font-semibold text-purple-600 dark:text-purple-400 cursor-pointer focus:outline-none"
            >
              <option value="super_admin">Super Admin (All Access)</option>
              <option value="administrator">Administrator</option>
              <option value="project_manager">Project Manager</option>
              <option value="finance_manager">Finance Manager</option>
              <option value="technical_staff">Technical Staff</option>
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Profile Details & Password Form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Profile Form */}
          <div className="bg-white dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#383838] pb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#0D99FF]" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Profile Information</h2>
              </div>
              <span className="text-[11px] text-slate-400">Stored securely in PostgreSQL</span>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Libinesh R"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D99FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+27 21 000 0000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0D99FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Email (Supabase Auth ID)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-500 cursor-not-allowed font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Managed via Supabase Identity Provider.
                </span>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="px-4 py-2 bg-[#0D99FF] hover:bg-[#007BE5] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="bg-white dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#383838] pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#A259FF]" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Security & Password</h2>
              </div>
              <span className="text-[11px] text-slate-400">Encrypted with bcrypt (12 rounds)</span>
            </div>

            <form onSubmit={handlePasswordSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full px-3 py-2 pr-9 bg-slate-50 dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#A259FF]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-type password"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1E1E1E] border border-[#E5E5E5] dark:border-[#383838] rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#A259FF]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  Password changes take effect immediately across all active browser tabs.
                </span>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-4 py-2 bg-[#A259FF] hover:bg-[#8F43EC] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

          {/* Granular Permissions Breakdown for Current Role */}
          <div className="bg-white dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#383838] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#0ACF83]" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Assigned Module Permissions ({roleInfo.label})
                </h2>
              </div>
              <span className="text-[11px] text-slate-400">Server-enforced via PostgreSQL RLS</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E5E5] dark:border-[#383838] text-slate-400">
                    <th className="py-2 px-3 font-semibold">Module</th>
                    <th className="py-2 px-3 font-semibold text-center w-20">View</th>
                    <th className="py-2 px-3 font-semibold text-center w-20">Create</th>
                    <th className="py-2 px-3 font-semibold text-center w-20">Edit</th>
                    <th className="py-2 px-3 font-semibold text-center w-20">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5] dark:divide-[#333333]">
                  {ALL_MODULES.map(mod => {
                    const canV = hasPermission(mod, 'view')
                    const canC = hasPermission(mod, 'create')
                    const canE = hasPermission(mod, 'edit')
                    const canD = hasPermission(mod, 'delete')

                    return (
                      <tr key={mod} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200 capitalize">
                          {mod.replace('-', ' ')}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {canV ? <Check className="w-3.5 h-3.5 text-[#0ACF83] mx-auto" /> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {canC ? <Check className="w-3.5 h-3.5 text-[#0D99FF] mx-auto" /> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {canE ? <Check className="w-3.5 h-3.5 text-amber-500 mx-auto" /> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {canD ? <Check className="w-3.5 h-3.5 text-[#F24E1E] mx-auto" /> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Active Session & Security Audit */}
        <div className="space-y-6">
          
          {/* Active Session & Expiry Card */}
          <div className="bg-white dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#383838] pb-3">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-[#0ACF83]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Session Security</h3>
              </div>
              <span className="w-2 h-2 rounded-full bg-[#0ACF83] animate-pulse" title="Active" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Idle Session Expiry:</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {minutes}m {seconds < 10 ? `0${seconds}` : seconds}s
                </span>
              </div>

              <div className="w-full bg-slate-100 dark:bg-[#1E1E1E] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#0ACF83] h-full transition-all duration-1000"
                  style={{ width: `${(sessionTimeRemaining / (30 * 60)) * 100}%` }}
                />
              </div>

              <div className="pt-2 text-[11px] text-slate-400 space-y-1">
                <div>• Automatic token rotation every 60 minutes</div>
                <div>• Auto-logout after 30 minutes of zero mouse/keyboard activity</div>
              </div>

              <div className="pt-3 border-t border-[#E5E5E5] dark:border-[#383838] flex flex-col gap-2">
                <button
                  onClick={refreshSession}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-[#2C2C2C] hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#0D99FF]" />
                  Refresh Active Session
                </button>

                <button
                  onClick={signOut}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#F24E1E]/10 hover:bg-[#F24E1E]/20 text-[#F24E1E] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Terminate Active Session (Logout)
                </button>
              </div>
            </div>
          </div>

          {/* Audit Action Log */}
          <div className="bg-white dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#383838] pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0D99FF]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Security Audit Log</h3>
              </div>
              <span className="text-[10px] text-slate-400">Live feed</span>
            </div>

            {loadingLogs ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading audit records...</div>
            ) : recentLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No recent admin security events recorded.
              </div>
            ) : (
              <div className="space-y-2.5 text-xs">
                {recentLogs.map((log) => (
                  <div key={log.id} className="p-2.5 bg-slate-50 dark:bg-[#1E1E1E] rounded-xl border border-[#E5E5E5] dark:border-[#333333]">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-[11px] text-[#0D99FF]">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDate(log.created_at, 'relative')}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 truncate">
                      Resource: {log.resource_type}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
