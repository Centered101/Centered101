import 'server-only'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import type { Database } from '@/lib/work/types/database'
import { requirePublicSupabaseEnv } from './env'

/**
 * Request-scoped Supabase client for Server Components, Server Actions and
 * Route Handlers.
 *
 * Carries the caller's session, so every query runs under that user's RLS
 * policies. This is the default client for all server-side data access — reach
 * for `admin.ts` only in the Stripe webhook, where there is no user session.
 */
export async function createClient() {
  const { url, key } = requirePublicSupabaseEnv()
  const cookieStore = await cookies()

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Session refresh is handled by middleware.ts, so this is safe to
          // swallow — but only here, and only for that reason.
        }
      },
    },
  })
}
