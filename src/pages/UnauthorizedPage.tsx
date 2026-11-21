import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, Lock, UserCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ROLE_LABELS } from '../types/database'

interface UnauthorizedPageProps {
  moduleName?: string
  requiredAction?: string
}

export default function UnauthorizedPage({ moduleName = 'this module', requiredAction = 'view' }: UnauthorizedPageProps) {
  const { role, profile, user } = useAuth()
  const roleInfo = ROLE_LABELS[role]

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white dark:bg-[#252525] border border-[#E5E5E5] dark:border-[#383838] rounded-2xl p-8 shadow-xl text-center space-y-6">
        
        {/* Shield Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#F24E1E]/10 border border-[#F24E1E]/20 text-[#F24E1E] flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F24E1E]/10 text-[#F24E1E] mb-2">
            <Lock className="w-3 h-3" />
            <span>403 — Unauthorized Access</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Restricted Module
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed max-w-sm mx-auto">
            Your CapeSecure administrator account does not possess sufficient privileges to {requiredAction} <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">{moduleName}</span>.
          </p>
        </div>

        {/* Current Credentials Box */}
        <div className="p-4 bg-slate-50 dark:bg-[#1E1E1E] rounded-xl border border-[#E5E5E5] dark:border-[#383838] text-left text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Signed In As:</span>
            <span className="font-mono text-slate-800 dark:text-slate-200">{profile?.full_name || user?.email}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Current Role:</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleInfo.badge}`}>
              {roleInfo.label}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-1 border-t border-[#E5E5E5] dark:border-[#333333]">
            {roleInfo.description}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/admin"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0D99FF] hover:bg-[#007BE5] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Allowed Workspace
          </Link>

          <Link
            to="/admin/profile"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-[#2C2C2C] border border-[#E5E5E5] dark:border-[#383838] text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg hover:border-[#0D99FF] transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#0D99FF]" />
            View My Permissions
          </Link>
        </div>

        <p className="text-[10px] text-slate-400">
          CapeSecure Security Enforcement Engine · Role-Based Row Level Security
        </p>
      </div>
    </div>
  )
}
