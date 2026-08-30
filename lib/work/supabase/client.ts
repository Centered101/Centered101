'use client'

import { createBrowserClient } from '@supabase/ssr'

import type { Database } from '@/lib/work/types/database'
import { requirePublicSupabaseEnv } from './env'

/**
 * Supabase client for Client Components.
 *
 * Uses the publishable key, which is safe to ship to the browser: Row Level
 * Security — not secrecy — is what constrains what it can read. Never import
 * `admin.ts` from client code.
 */
export function createClient() {
  const { url, key } = requirePublicSupabaseEnv()
  return createBrowserClient<Database>(url, key)
}
