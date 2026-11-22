import { supabase } from './supabase'
import type { Client } from '../types/database'

export const DEMO_RETAIL_CLIENT: Client = {
  id: 'client-demo-retail-001',
  client_code: 'CS-CLIENT-0001',
  lead_id: 'lead-demo-retail-001',
  name: 'DEMO RETAIL',
  business_name: 'Demo Retail E-Commerce Ltd',
  company: 'Demo Retail Enterprise',
  business_category: 'Retail & E-Commerce',
  email: 'contact@demoretail.store',
  phone: '+91 98765 43210',
  address: 'Shop 14, Brigade Gateway Commercial Complex',
  city: 'Bengaluru',
  state: 'Karnataka',
  postal_code: '560055',
  country: 'India',
  gstin: '29ABCDE1234F1Z5',
  preferred_comm: 'email',
  status: 'active',
  avatar_url: null,
  notes: 'Production simulation client for CapeSecure lifecycle testing.',
  created_at: new Date('2026-11-20T10:00:00Z').toISOString(),
  updated_at: new Date().toISOString()
}

const STORAGE_KEY = 'capesecure_clients_cache'

/**
 * Retrieve cached clients from local persistence.
 * Always ensures DEMO RETAIL is present as a fallback baseline.
 */
export function getLocalCachedClients(): Client[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure DEMO RETAIL is included if not present
        if (!parsed.some((c: Client) => c.name === 'DEMO RETAIL' || c.client_code === 'CS-CLIENT-0001')) {
          parsed.unshift(DEMO_RETAIL_CLIENT)
        }
        return parsed
      }
    }
  } catch (err) {
    console.warn('Failed to parse local client cache:', err)
  }
  return [DEMO_RETAIL_CLIENT]
}

/**
 * Persist client list to local cache.
 */
export function setLocalCachedClients(clients: Client[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients))
  } catch (err) {
    console.warn('Failed to persist client cache:', err)
  }
}

/**
 * Unified client fetcher:
 * 1. Attempts to query Supabase `clients` table.
 * 2. If Supabase succeeds and returns records, merges with local cache and updates cache.
 * 3. If Supabase errors (e.g. 401 RLS restriction, offline, table missing) or is empty,
 *    gracefully falls back to the local cache containing DEMO RETAIL.
 */
export async function getClients(): Promise<Client[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && Array.isArray(data) && data.length > 0) {
      const merged = [...data]
      // Ensure DEMO RETAIL exists in the working set for testing
      if (!merged.some(c => c.name === 'DEMO RETAIL' || c.client_code === 'CS-CLIENT-0001')) {
        merged.push(DEMO_RETAIL_CLIENT)
      }
      setLocalCachedClients(merged)
      return merged
    }
  } catch (err) {
    console.warn('Supabase clients fetch failed, using resilient fallback:', err)
  }

  return getLocalCachedClients()
}

/**
 * Save or update a client both locally and in Supabase.
 */
export async function saveClient(client: Client): Promise<{ data: Client; error?: string }> {
  // Update local cache first
  const current = getLocalCachedClients()
  const idx = current.findIndex(c => c.id === client.id || c.client_code === client.client_code)
  let updatedList: Client[]
  if (idx >= 0) {
    updatedList = [...current]
    updatedList[idx] = { ...client, updated_at: new Date().toISOString() }
  } else {
    updatedList = [client, ...current]
  }
  setLocalCachedClients(updatedList)

  // Sync to Supabase in background
  try {
    const { data, error } = await (supabase as any)
      .from('clients')
      .upsert({
        id: client.id.startsWith('client-demo') || client.id.startsWith('client-') ? undefined : client.id,
        client_code: client.client_code,
        name: client.name,
        business_name: client.business_name || client.name,
        company: client.company || client.business_name || client.name,
        business_category: client.business_category,
        email: client.email,
        phone: client.phone,
        address: client.address,
        city: client.city,
        state: client.state,
        postal_code: client.postal_code,
        country: client.country,
        gstin: client.gstin,
        preferred_comm: client.preferred_comm,
        status: client.status,
        notes: client.notes,
        updated_at: new Date().toISOString()
      })
      .select()
      .maybeSingle()

    if (!error && data) {
      return { data: data as Client }
    }
    if (error) {
      return { data: client, error: error.message }
    }
  } catch (err: any) {
    return { data: client, error: err?.message || 'Remote sync offline' }
  }

  return { data: client }
}
