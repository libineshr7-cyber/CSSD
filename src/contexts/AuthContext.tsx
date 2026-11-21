import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  isDemo: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DEMO_MODE = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'your_supabase_project_url'

const DEMO_USER: User = {
  id: 'demo-admin-001',
  email: 'admin@capesecure.co.za',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { name: 'CapeSecure Admin', role: 'admin' },
  identities: [],
  factors: [],
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (DEMO_MODE) {
      // Check local demo session
      const demoSession = localStorage.getItem('capesecure_demo_session')
      if (demoSession) {
        setUser(DEMO_USER)
      }
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    if (DEMO_MODE) {
      if (email === 'admin@capesecure.co.za' && password === 'admin123') {
        localStorage.setItem('capesecure_demo_session', 'true')
        setUser(DEMO_USER)
        return { error: null }
      }
      return { error: new Error('Invalid credentials. Use admin@capesecure.co.za / admin123') }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    if (DEMO_MODE) {
      localStorage.removeItem('capesecure_demo_session')
      setUser(null)
      return
    }
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut, isDemo: DEMO_MODE }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
