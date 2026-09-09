import 'server-only'

import { headers } from 'next/headers'

/**
 * Where Supabase should send the browser back to.
 *
 * Extracted from `actions.ts` so the identity-linking service can reuse it.
 * It cannot simply be exported from there: that file is `'use server'`, and
 * every export in a 'use server' module becomes a callable server action —
 * publishing an endpoint whose only job is to compute a string.
 */

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$|\.localhost(:\d+)?$/i

/**
 * Absolute origin for OAuth and magic-link redirects.
 *
 * NEXT_PUBLIC_WORK_APP_URL is deliberately ignored for a local request. It
 * holds the production origin, and honouring it in dev sends the browser to
 * work.centered101.com/... — a URL the local Supabase project has no redirect
 * entry for, so Supabase silently falls back to its Site URL and the code
 * lands on the wrong host with the wrong project's PKCE verifier.
 */
export async function getOrigin(): Promise<string> {
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? 'localhost:3000'
  const isLocal = LOCAL_HOST.test(host)

  const configured = process.env.NEXT_PUBLIC_WORK_APP_URL
  if (configured && !isLocal) return configured.replace(/\/$/, '')

  const proto = headerList.get('x-forwarded-proto') ?? (isLocal ? 'http' : 'https')
  return `${proto}://${host}`
}

/**
 * Absolute URL of the workspace auth callback.
 *
 * The path depends on how the visitor reached the app. On work.<root> the
 * proxy rewrites /auth/* into /work/auth/*, so the prefix is invisible; on the
 * apex host the route only exists at /work/auth/callback, and a bare
 * /auth/callback there is the MAIN site's callback, which would exchange this
 * code against the wrong Supabase project.
 */
export async function getCallbackUrl(next = ''): Promise<string> {
  const query = next ? `?next=${encodeURIComponent(next)}` : ''
  return getWorkUrl(`/auth/callback${query}`)
}

/**
 * Absolute URL of a workspace path, for somewhere outside the app to send the
 * browser back to — a Stripe Checkout return, an email link.
 *
 * Carries the same host-dependent `/work` prefix as the auth callback, and for
 * the same reason: on the apex host the workspace lives under /work, and a
 * return URL without the prefix lands on the marketing site.
 *
 * @param path workspace-relative, starting with a slash, e.g. `/portal`
 */
export async function getWorkUrl(path: string): Promise<string> {
  const origin = await getOrigin()
  const prefix = /:\/\/work\./i.test(origin) ? '' : '/work'
  return `${origin}${prefix}${path}`
}
