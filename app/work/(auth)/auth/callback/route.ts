import { NextResponse, type NextRequest } from 'next/server'

import { createClient } from '@/lib/work/supabase/server'
import { safeRedirectPath } from '@/lib/work/validation/auth'
import { resolveLandingPath } from '@/lib/work/auth/permissions'

/**
 * OAuth and magic-link landing point.
 *
 * Supabase sends the browser here with a one-time `code`, which is exchanged
 * for a session. The exchange must happen server-side: it completes the PKCE
 * flow using the verifier stored in an httpOnly cookie, which client code
 * cannot read.
 *
 * `next` is passed through `safeRedirectPath`, so a crafted
 * `/work/auth/callback?next=https://evil.example` cannot bounce a freshly
 * authenticated user off-site.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next'), '')

  // Supabase reports provider-side failures (user cancelled, provider
  // misconfigured) as query params rather than an HTTP error.
  const authError = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  if (authError) {
    const url = new URL('/work/auth/auth-code-error', origin)
    url.searchParams.set('reason', errorDescription ?? authError)
    return NextResponse.redirect(url)
  }

  if (!code) {
    return NextResponse.redirect(new URL('/work/auth/auth-code-error', origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    const url = new URL('/work/auth/auth-code-error', origin)
    url.searchParams.set('reason', error.message)
    return NextResponse.redirect(url)
  }

  const destination = next || (await resolveLandingPath())
  return NextResponse.redirect(new URL(destination, origin))
}
