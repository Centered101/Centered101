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
  // cookies() FIRST, before the env check, and the order is load-bearing.
  //
  // Awaiting cookies() is what marks the caller dynamic. Validating the
  // environment before that meant a missing variable threw while Next still
  // believed the page was static — so instead of the page opting out of
  // prerendering, the prerender itself failed and took the whole build with
  // it ("Error occurred prerendering page /work/admin/change-requests").
  //
  // Every page reaching this function needs a session, so none of them may
  // ever be prerendered. Touching the dynamic API first makes that true even
  // when the configuration is wrong.
  const cookieStore = await cookies()
  const { url, key } = requirePublicSupabaseEnv()

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
