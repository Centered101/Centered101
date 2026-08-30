import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/work/types/database'

/**
 * PRIVILEGED CLIENT — BYPASSES ROW LEVEL SECURITY ENTIRELY.
 *
 * The `server-only` import above makes any accidental client-side import a
 * build error rather than a credential leak.
 *
 * Legitimate callers are limited to contexts with no user session where the
 * work is still trusted:
 *   - the Stripe webhook handler (the caller is Stripe, not a user)
 *   - share-token resolution (the caller is anonymous by design)
 *   - migrations and seed scripts
 *
 * Everywhere else, use `server.ts`. If you find yourself reaching for this to
 * "just make a query work", the RLS policy is wrong — fix the policy.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_WORK_SUPABASE_URL
  const secretKey = process.env.WORK_SUPABASE_SECRET_KEY

  if (!url || !secretKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_WORK_SUPABASE_URL or WORK_SUPABASE_SECRET_KEY. The secret key ' +
        'is server-only and must never carry a NEXT_PUBLIC_ prefix.',
    )
  }

  return createSupabaseClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
