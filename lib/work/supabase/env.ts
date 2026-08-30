/**
 * Validated environment access for Supabase.
 *
 * Fail loudly at startup rather than producing a client that silently talks to
 * `undefined`. Public values are read through explicit `process.env.X` lookups
 * because Next.js inlines `NEXT_PUBLIC_*` at build time only when referenced
 * statically — dynamic indexing would leave them undefined in the browser.
 */

export const supabaseUrl = process.env.NEXT_PUBLIC_WORK_SUPABASE_URL
export const supabasePublishableKey = process.env.NEXT_PUBLIC_WORK_SUPABASE_PUBLISHABLE_KEY

export function requirePublicSupabaseEnv(): {
  url: string
  key: string
} {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      'Missing Supabase environment variables. Copy .env.example to .env.local ' +
        'and set NEXT_PUBLIC_WORK_SUPABASE_URL and NEXT_PUBLIC_WORK_SUPABASE_PUBLISHABLE_KEY.',
    )
  }
  return { url: supabaseUrl, key: supabasePublishableKey }
}
