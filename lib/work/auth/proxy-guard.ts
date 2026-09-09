import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Session refresh and route protection for the /work subtree.
 *
 * Called from proxy.ts, and ONLY for /work paths — running a Supabase session
 * lookup on every request to centered101.com would add a round trip to pages
 * that have no session to refresh.
 *
 * THIS IS A CONVENIENCE, NOT THE SECURITY BOUNDARY. A proxy can be bypassed by
 * matcher gaps or by calling PostgREST directly, never touching Next.js at
 * all. The boundaries that actually hold are requireAdmin()/requireClient() in each
 * /work layout and, underneath everything, RLS. This exists so a signed-out visitor
 * sees a login page instead of an empty dashboard.
 */

/**
 * Reachable without a session, expressed as /work-relative prefixes.
 *
 * The legal pages are public because someone has to be able to read what they
 * are agreeing to BEFORE they have an account — and because the login screen
 * links to them, gating them behind login would be a loop.
 */
const PUBLIC_PREFIXES = [
  '/work/login',
  '/work/forgot-password',
  '/work/auth',
  '/work/share',
  '/work/about',
  '/work/privacy-policy',
  '/work/terms-of-service',
  // The payment provider's callback. Stripe carries no session cookie, so the
  // guard would answer its POST with a 307 to /login — which Stripe records as
  // a delivery failure and retries forever, while a real payment sits
  // unrecorded. It is not unauthenticated: the route verifies the request's
  // signature against STRIPE_WEBHOOK_SECRET before reading a byte of the body,
  // which is a stronger check than a session cookie.
  '/work/api/payments/webhook',
]

/**
 * Static files under /work — the brand icon, and anything else served from
 * `public/work/`.
 *
 * THEY MUST NOT BE GUARDED. `/work/favicon.ico` is not a route, but it starts
 * with `/work/`, so the guard redirected it to /login for signed-out
 * visitors — and the login page is exactly where the browser asks for it. The
 * icon request came back as the login page's HTML, and the brand rendered as
 * a broken image.
 *
 * A trailing extension is the test because routes in this app never have one:
 * every path here is a segment name, and every file is `name.ext`. Letting a
 * static file through gives nothing away either — the auth boundary is
 * requireAdmin()/requireClient() in the layouts and RLS underneath, and this
 * proxy has never been more than a convenience.
 */
const STATIC_FILE = /\.[a-z0-9]+$/i

/**
 * Public as an EXACT path only — the subtree beneath stays guarded.
 *
 * `/work` is the signed-out landing page (app/work/page.tsx): what the
 * workspace is, with a link to the login form. It cannot go in
 * PUBLIC_PREFIXES, because that list also opens `p + '/'` — and `/work/` is
 * every route in the app.
 */
const PUBLIC_EXACT = new Set(['/work'])

function isPublic(targetPath: string): boolean {
  if (STATIC_FILE.test(targetPath)) return true
  if (PUBLIC_EXACT.has(targetPath)) return true
  return PUBLIC_PREFIXES.some((p) => targetPath === p || targetPath.startsWith(p + '/'))
}

export type WorkGuardResult =
  | { type: 'redirect'; response: NextResponse }
  | { type: 'allow'; cookies: { name: string; value: string; options: object }[] }

/**
 * @param targetPath  the /work-prefixed path the request resolves to
 * @param onSubdomain true when reached via work.centered101.com, in which case
 *                    user-facing URLs omit the /work prefix
 */
export async function guardWorkRoute(
  request: NextRequest,
  targetPath: string,
  onSubdomain: boolean,
): Promise<WorkGuardResult> {
  const collected: { name: string; value: string; options: object }[] = []

  const url = process.env.NEXT_PUBLIC_WORK_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_WORK_SUPABASE_PUBLISHABLE_KEY

  // Not configured: fail open rather than walling off every route. The pages
  // themselves still authorize, and a misconfigured deploy should be
  // diagnosable instead of a blank redirect loop.
  if (!url || !key) return { type: 'allow', cookies: collected }

  if (isPublic(targetPath)) {
    // Still refresh the session on public pages, so an already-signed-in user
    // hitting /login is recognised and sent onward.
    await refresh(request, url, key, collected)
    return { type: 'allow', cookies: collected }
  }

  const user = await refresh(request, url, key, collected)

  if (!user) {
    // Build the URL the visitor actually sees: on the subdomain the /work
    // prefix is invisible, so redirecting to /work/login would 404 for them.
    const visiblePath = onSubdomain ? targetPath.replace(/^\/work/, '') || '/' : targetPath
    const loginPath = onSubdomain ? '/login' : '/work/login'

    const loginUrl = new URL(loginPath, request.url)
    if (visiblePath !== '/' && visiblePath !== loginPath) {
      loginUrl.searchParams.set('next', visiblePath + request.nextUrl.search)
    }

    const response = NextResponse.redirect(loginUrl)
    // Carry refreshed cookies across the redirect, or the refresh is lost and
    // the next request repeats the same round trip.
    for (const c of collected) response.cookies.set(c.name, c.value, c.options)
    return { type: 'redirect', response }
  }

  return { type: 'allow', cookies: collected }
}

async function refresh(
  request: NextRequest,
  url: string,
  key: string,
  collected: { name: string; value: string; options: object }[],
) {
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          collected.push({ name, value, options: options ?? {} })
        }
      },
    },
  })

  // getUser(), not getSession(): getUser() revalidates the token against the
  // auth server, so a forged or revoked cookie does not pass.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}
