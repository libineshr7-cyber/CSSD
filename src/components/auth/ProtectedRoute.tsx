import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import UnauthorizedPage from '../../pages/UnauthorizedPage'
import type { NavModule } from '../../types/database'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredModule?: NavModule
  requiredAction?: 'view' | 'create' | 'edit' | 'delete'
}

export default function ProtectedRoute({
  children,
  requiredModule,
  requiredAction = 'view',
}: ProtectedRouteProps) {
  const { user, profile, loading, hasPermission } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#1E1E1E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#0D99FF] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
            Verifying CapeSecure Security Clearance...
          </p>
        </div>
      </div>
    )
  }

  // Not logged in -> Redirect to login with redirect back location
  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  // Account deactivated check
  if (profile && !profile.is_active) {
    return (
      <div className="min-h-screen bg-[#1E1E1E] flex items-center justify-center p-4">
        <div className="bg-[#2C2C2C] border border-red-500/30 p-6 rounded-2xl max-w-md text-center text-white space-y-3">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-base font-bold">Account Deactivated</h2>
          <p className="text-xs text-slate-400">
            Your CapeSecure administrator profile has been disabled by a Super Administrator.
          </p>
          <a
            href="/admin/login"
            className="inline-block mt-2 px-4 py-2 bg-[#0D99FF] rounded-lg text-xs font-semibold"
          >
            Return to Login
          </a>
        </div>
      </div>
    )
  }

  // Check specific module permission
  if (requiredModule && !hasPermission(requiredModule, requiredAction)) {
    return <UnauthorizedPage moduleName={requiredModule} requiredAction={requiredAction} />
  }

  return <>{children}</>
}
