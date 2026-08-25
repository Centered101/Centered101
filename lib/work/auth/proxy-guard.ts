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
 * all. The boundaries that actually hold are getSessionContext() in each /work
 * layout and, underneath everything, RLS. This exists so a signed-out visitor
 * sees a login page instead of an empty dashboard.
 */

/** Reachable without a session, expressed as /work-relative prefixes. */
const PUBLIC_PREFIXES = ['/work/login', '/work/auth', '/work/share']

function isPublic(targetPath: string): boolean {
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
