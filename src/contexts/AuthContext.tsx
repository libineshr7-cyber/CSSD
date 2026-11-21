import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { AdminProfile, AppRole, NavModule, RolePermission } from '../types/database'
import { checkPermission, DEFAULT_ROLE_PERMISSIONS } from '../lib/permissions'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: AdminProfile | null
  role: AppRole
  permissions: RolePermission[]
  loading: boolean
  isSupabaseConfigured: boolean
  
  // Actions
  signIn: (email: string, password: string) => Promise<{ error: Error | null; user?: User | null }>
  signUp: (email: string, password: string, fullName: string, role?: AppRole) => Promise<{ error: Error | null; data?: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>
  updateProfile: (updates: Partial<AdminProfile>) => Promise<{ error: Error | null }>
  switchRole: (newRole: AppRole) => void
  updateRolePermission: (role: AppRole, module: NavModule, updates: { can_view?: boolean; can_create?: boolean; can_edit?: boolean; can_delete?: boolean }) => Promise<{ error: Error | null }>
  logAction: (action: string, resourceType: string, resourceId?: string, metadata?: any) => Promise<void>

  // RBAC checks
  hasPermission: (module: NavModule, action?: 'view' | 'create' | 'edit' | 'delete') => boolean
  canView: (module: NavModule) => boolean
  canCreate: (module: NavModule) => boolean
  canEdit: (module: NavModule) => boolean
  canDelete: (module: NavModule) => boolean

  // Session Management
  sessionTimeRemaining: number // seconds until idle timeout
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 30-minute idle session timeout (in seconds)
const IDLE_TIMEOUT_SECONDS = 30 * 60

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [activeRole, setActiveRole] = useState<AppRole>('super_admin')
  const [permissions, setPermissions] = useState<RolePermission[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number>(IDLE_TIMEOUT_SECONDS)

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  // ─── Fetch Admin Profile ──────────────────────────────────────────────────
  const fetchProfile = useCallback(async (userId: string, userEmail: string): Promise<AdminProfile> => {
    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.warn('Could not fetch admin_profiles from Supabase:', error.message)
      }

      if (data) {
        const loadedProfile = data as AdminProfile
        setProfile(loadedProfile)
        setActiveRole(loadedProfile.role)
        return loadedProfile
      }
    } catch (err) {
      console.warn('Error reading admin profile:', err)
    }

    // Default generated profile if table entry not yet initialized
    const defaultProfile: AdminProfile = {
      id: userId,
      email: userEmail,
      full_name: userEmail.split('@')[0] || 'Administrator',
      role: 'super_admin',
      phone: null,
      avatar_url: null,
      is_active: true,
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setProfile(defaultProfile)
    setActiveRole('super_admin')
    return defaultProfile
  }, [])

  // ─── Fetch Configurable Permissions ───────────────────────────────────────
  const fetchPermissions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')

      if (!error && data && data.length > 0) {
        setPermissions(data as RolePermission[])
      }
    } catch (_) {}
  }, [])

  // ─── Log Administrative Action to audit_logs ──────────────────────────────
  const logAction = useCallback(async (action: string, resourceType: string, resourceId?: string, metadata?: any) => {
    try {
      await (supabase as any).from('audit_logs').insert({
        user_id: user?.id || null,
        action,
        resource_type: resourceType,
        resource_id: resourceId || null,
        metadata: {
          ...metadata,
          admin_email: user?.email,
          active_role: activeRole,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (err) {
      console.warn('Audit log write error:', err)
    }
  }, [user, activeRole])

  // ─── Session Expiry and Activity Tracking ─────────────────────────────────
  const handleUserActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    setSessionTimeRemaining(IDLE_TIMEOUT_SECONDS)
  }, [])

  useEffect(() => {
    if (!user) return

    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart']
    events.forEach(evt => window.addEventListener(evt, handleUserActivity, { passive: true }))

    idleTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000)
      const remaining = Math.max(0, IDLE_TIMEOUT_SECONDS - elapsed)
      setSessionTimeRemaining(remaining)

      if (remaining === 0) {
        // Idle timeout reached
        clearInterval(idleTimerRef.current!)
        toast.error('Session timed out due to 30 minutes of inactivity. Please sign in again.')
        signOut()
      }
    }, 1000)

    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleUserActivity))
      if (idleTimerRef.current) clearInterval(idleTimerRef.current)
    }
  }, [user, handleUserActivity])

  // ─── Supabase Session Bootstrap ───────────────────────────────────────────
  useEffect(() => {
    setLoading(true)

    // Check existing Supabase session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id, session.user.email || '')
        await fetchPermissions()
      } else {
        // Check for local session state
        const storedUser = localStorage.getItem('capesecure_admin_user')
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser)
            setUser(parsed.user)
            setProfile(parsed.profile)
            setActiveRole(parsed.profile?.role || 'super_admin')
          } catch (_) {}
        }
      }
      setLoading(false)
    }).catch(async (err) => {
      console.warn('Supabase getSession failed:', err)
      setLoading(false)
    })

    // Listen to real-time auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id, session.user.email || '')
          await fetchPermissions()
          localStorage.setItem('capesecure_admin_user', JSON.stringify({
            user: session.user,
            profile,
          }))
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setSession(null)
        setProfile(null)
        localStorage.removeItem('capesecure_admin_user')
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile, fetchPermissions])

  // ─── Actions ──────────────────────────────────────────────────────────────
  const signIn = async (email: string, password: string): Promise<{ error: Error | null; user?: User | null }> => {
    const cleanEmail = email.trim().toLowerCase()
    const cleanPassword = password.trim()

    if (!cleanEmail || !cleanPassword) {
      return { error: new Error('Please enter both email and password.') }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      })

      if (error) {
        // Check if user is active in admin_profiles
        return { error: new Error(error.message || 'Invalid credentials') }
      }

      if (data?.user) {
        setUser(data.user)
        setSession(data.session)
        const userProfile = await fetchProfile(data.user.id, data.user.email || cleanEmail)
        
        // Deactivated user check
        if (!userProfile.is_active) {
          await supabase.auth.signOut()
          setUser(null)
          setSession(null)
          return { error: new Error('Your administrator account has been deactivated. Please contact Super Admin.') }
        }

        // Update last_login
        await (supabase as any)
          .from('admin_profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.user.id)

        // Record audit login
        await logAction('ADMIN_LOGIN_SUCCESS', 'auth', data.user.id, {
          email: cleanEmail,
          role: userProfile.role,
          ip: 'client',
        })

        localStorage.setItem('capesecure_admin_user', JSON.stringify({
          user: data.user,
          profile: userProfile,
        }))

        return { error: null, user: data.user }
      }

      return { error: new Error('Authentication failed.') }
    } catch (err: any) {
      return { error: new Error(err.message || 'Network or authentication error.') }
    }
  }

  const signUp = async (email: string, password: string, fullName: string, role: AppRole = 'technical_staff') => {
    const cleanEmail = email.trim().toLowerCase()
    const cleanPassword = password.trim()

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            full_name: fullName,
            name: fullName,
            role,
          },
        },
      })

      if (error) return { error: new Error(error.message) }

      if (data?.user) {
        // Ensure admin profile exists in admin_profiles table
        await (supabase as any).from('admin_profiles').upsert({
          id: data.user.id,
          email: cleanEmail,
          full_name: fullName,
          role,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        await logAction('ADMIN_REGISTERED', 'admin_profile', data.user.id, {
          email: cleanEmail,
          assigned_role: role,
        })
      }

      return { error: null, data }
    } catch (err: any) {
      return { error: new Error(err.message || 'Registration failed') }
    }
  }

  const signOut = async () => {
    try {
      if (user) {
        await logAction('ADMIN_LOGOUT', 'auth', user.id, { email: user.email })
      }
      await supabase.auth.signOut()
    } catch (_) {
    } finally {
      setUser(null)
      setSession(null)
      setProfile(null)
      localStorage.removeItem('capesecure_admin_user')
    }
  }

  const resetPassword = async (email: string): Promise<{ error: Error | null }> => {
    const cleanEmail = email.trim().toLowerCase()
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) return { error: new Error(error.message) }
      
      await logAction('PASSWORD_RESET_REQUESTED', 'auth', undefined, { email: cleanEmail })
      return { error: null }
    } catch (err: any) {
      return { error: new Error(err.message || 'Failed to send password reset email') }
    }
  }

  const updatePassword = async (newPassword: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) return { error: new Error(error.message) }

      if (user) {
        await logAction('PASSWORD_UPDATED', 'auth', user.id, { email: user.email })
      }
      return { error: null }
    } catch (err: any) {
      return { error: new Error(err.message || 'Failed to update password') }
    }
  }

  const updateProfile = async (updates: Partial<AdminProfile>): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error('User not logged in') }

    try {
      const { error } = await (supabase as any)
        .from('admin_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) return { error: new Error(error.message) }

      setProfile(prev => prev ? { ...prev, ...updates } : null)
      await logAction('PROFILE_UPDATED', 'admin_profile', user.id, updates)
      return { error: null }
    } catch (err: any) {
      return { error: new Error(err.message || 'Failed to update profile') }
    }
  }

  const switchRole = (newRole: AppRole) => {
    setActiveRole(newRole)
    toast.success(`Role switched to ${newRole.replace('_', ' ').toUpperCase()} (Testing Mode)`)
    logAction('ROLE_SIMULATED', 'auth', user?.id, { switched_to: newRole })
  }

  const updateRolePermission = async (
    role: AppRole,
    module: NavModule,
    updates: { can_view?: boolean; can_create?: boolean; can_edit?: boolean; can_delete?: boolean }
  ): Promise<{ error: Error | null }> => {
    try {
      const { error } = await (supabase as any)
        .from('role_permissions')
        .upsert({
          role,
          module,
          ...updates,
          updated_at: new Date().toISOString(),
        })

      if (error) return { error: new Error(error.message) }

      // Update in-memory state
      setPermissions(prev => {
        const index = prev.findIndex(p => p.role === role && p.module === module)
        if (index >= 0) {
          const next = [...prev]
          next[index] = { ...next[index], ...updates }
          return next
        }
        return [...prev, {
          role,
          module,
          can_view: updates.can_view ?? false,
          can_create: updates.can_create ?? false,
          can_edit: updates.can_edit ?? false,
          can_delete: updates.can_delete ?? false,
        }]
      })

      await logAction('PERMISSION_MATRIX_UPDATED', 'role_permissions', undefined, { role, module, updates })
      return { error: null }
    } catch (err: any) {
      return { error: new Error(err.message || 'Failed to update permission') }
    }
  }

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (!error && data.session) {
        setSession(data.session)
        setUser(data.session.user)
        handleUserActivity()
        toast.success('Session refreshed successfully!')
      }
    } catch (err) {
      console.warn('Session refresh failed:', err)
    }
  }

  // ─── Granular Permission Checkers ─────────────────────────────────────────
  const hasPermission = useCallback((module: NavModule, action: 'view' | 'create' | 'edit' | 'delete' = 'view') => {
    return checkPermission(activeRole, module, action, permissions)
  }, [activeRole, permissions])

  const canView = useCallback((module: NavModule) => hasPermission(module, 'view'), [hasPermission])
  const canCreate = useCallback((module: NavModule) => hasPermission(module, 'create'), [hasPermission])
  const canEdit = useCallback((module: NavModule) => hasPermission(module, 'edit'), [hasPermission])
  const canDelete = useCallback((module: NavModule) => hasPermission(module, 'delete'), [hasPermission])

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      role: activeRole,
      permissions,
      loading,
      isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      updateProfile,
      switchRole,
      updateRolePermission,
      logAction,
      hasPermission,
      canView,
      canCreate,
      canEdit,
      canDelete,
      sessionTimeRemaining,
      refreshSession,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
