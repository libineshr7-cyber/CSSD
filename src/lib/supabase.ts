import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const rawUrl = import.meta.env.VITE_SUPABASE_URL
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function isValidHttpUrl(string: string | undefined): boolean {
  if (!string || string === 'your_supabase_project_url') return false
  try {
    const url = new URL(string)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch (_) {
    return false
  }
}

export const isSupabaseConfigured =
  isValidHttpUrl(rawUrl) && Boolean(rawKey && rawKey !== 'your_supabase_anon_key')

// Safe fallback URL and Anon key that always pass @supabase/supabase-js constructor checks
const validUrl = isSupabaseConfigured ? rawUrl! : 'https://placeholder-project.supabase.co'
const validKey = isSupabaseConfigured
  ? rawKey!
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDAwMDAwMDAsImV4cCI6MTk1NTU3NjAwMH0.placeholder'

export const supabase = createClient<Database>(validUrl, validKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: isSupabaseConfigured,
  },
})
