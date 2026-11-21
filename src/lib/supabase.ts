import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const rawUrl = import.meta.env.VITE_SUPABASE_URL
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function normalizeSupabaseUrl(urlStr: string | undefined): string | null {
  if (!urlStr || urlStr === 'your_supabase_project_url') return null
  // If user pasted PostgreSQL URI, e.g. postgresql://...@db.<ref>.supabase.co:5432/...
  const match = urlStr.match(/db\.([a-z0-9]+)\.supabase\.co/i)
  if (match) {
    return `https://${match[1]}.supabase.co`
  }
  try {
    const u = new URL(urlStr)
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      return u.origin
    }
  } catch (_) {
    return null
  }
  return null
}

const parsedUrl = normalizeSupabaseUrl(rawUrl)

export const isSupabaseConfigured =
  Boolean(parsedUrl) && Boolean(rawKey && rawKey !== 'your_supabase_anon_key')

export const supabaseProjectUrl = parsedUrl

// Safe fallback URL and Anon key that always pass @supabase/supabase-js constructor checks
const validUrl = isSupabaseConfigured ? parsedUrl! : 'https://placeholder-project.supabase.co'
const validKey = isSupabaseConfigured
  ? rawKey!
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDAwMDAwMDAsImV4cCI6MTk1NTU3NjAwMH0.placeholder'

export const supabase = createClient<Database>(validUrl, validKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: isSupabaseConfigured,
  },
})

// Quick connection test helper
export async function testDatabaseConnection(): Promise<{
  connected: boolean
  url: string | null
  mode: 'supabase' | 'demo'
  error?: string
  latencyMs?: number
}> {
  if (!isSupabaseConfigured) {
    return {
      connected: false,
      url: null,
      mode: 'demo',
      error: 'Supabase URL or Anon Key is missing or using placeholder.',
    }
  }

  const start = performance.now()
  try {
    // Ping the Supabase auth/session endpoint or rest health
    const { error } = await supabase.from('clients').select('id').limit(1)
    const latencyMs = Math.round(performance.now() - start)
    
    // If table exists (even if empty or RLS protected), the connection is verified
    return {
      connected: true,
      url: parsedUrl,
      mode: 'supabase',
      latencyMs,
      error: error ? error.message : undefined,
    }
  } catch (err: any) {
    return {
      connected: false,
      url: parsedUrl,
      mode: 'demo',
      error: err?.message || 'Failed to reach Supabase endpoint',
    }
  }
}
