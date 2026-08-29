import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { guardWorkRoute } from '@/lib/work/auth/proxy-guard'

const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'centered101.com'

const SUBDOMAIN_MAP: Record<string, string> = {
  admin: '/admin',
  portfolio: '/portfolio',
  newtab: '/newtab',
  shop: '/shop',
  work: '/work',
}

/**
 * Subdomains that own their ENTIRE path space.
 *
 * The pass-through rules below exist for subdomains that share the main site's
 * auth and assets. flowstate does not: it has its own Supabase project, its own
 * callback at /work/auth/callback, and its own /admin and /portal trees.
 *
 * Two concrete collisions this flag resolves:
 *   - `/auth/*` would otherwise reach the MAIN site's Supabase callback, so a
 *     sign-in on work.centered101.com would be exchanged against the wrong
 *     project.
 *   - `/admin/` is listed in PUBLIC_ASSET_PREFIXES for the admin subdomain, so
 *     work.centered101.com/admin/dashboard would fall through to the main
 *     site's /admin and 404 instead of reaching flowstate.
 *
 * For these subdomains only `/api/*` still passes through, so shared API
 * routes stay reachable.
 */
const SELF_CONTAINED_SUBDOMAINS = new Set(['work'])

const PUBLIC_ASSET_PREFIXES = [
  '/admin/',
  '/branding/',
  '/cursors/',
  '/newtab/',
  '/placeholders/',
  '/portfolio/images/',
  '/portfolio/project-posters/',
  '/portfolio/resume/',
  '/porfilio/',
  '/shop/',
]

function getSubdomain(hostname: string): string | null {
  const devMatch = hostname.match(/^([a-z0-9-]+)\.localhost(?::\d+)?$/i)
  if (devMatch) return devMatch[1].toLowerCase()

  const suffix = `.${ROOT_DOMAIN}`
  if (hostname.endsWith(suffix)) {
    const sub = hostname.slice(0, -suffix.length)
    if (sub && !sub.includes('.')) return sub.toLowerCase()
  }

  return null
}

/**
 * True when the browser is carrying a PKCE verifier issued by the flowstate
 * Supabase project.
 *
 * Supabase falls back to the project's Site URL when a redirect target is not
 * on its allow list, which drops a flowstate `code` on the apex host. Handing
 * that code to the main site's /auth/callback exchanges it against the wrong
 * project and fails with "code verifier" — so route it by the cookie that
 * says which project actually started the flow.
 */
function hasWorkCodeVerifier(request: NextRequest) {
  const ref = (process.env.NEXT_PUBLIC_WORK_SUPABASE_URL || '').match(/^https?:\/\/([^.]+)\./)?.[1]
  if (!ref) return false
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith(`sb-${ref}-auth-token-code-verifier`))
}

function isPublicAssetPath(pathname: string) {
  return PUBLIC_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function proxy(request: NextRequest) {
  const hostname = (request.headers.get('host') || '').split(':')[0].toLowerCase()
  const subdomain = getSubdomain(hostname)
  const { pathname } = request.nextUrl
  const hasOAuthCode = request.nextUrl.searchParams.has('code')

  if (hasOAuthCode && (pathname === '/' || pathname === '/shop')) {
    const url = request.nextUrl.clone()
    url.pathname =
      subdomain === 'work' || hasWorkCodeVerifier(request)
        ? '/work/auth/callback'
        : pathname === '/shop' || subdomain === 'shop'
          ? '/shop/auth/callback'
          : '/auth/callback'
    return NextResponse.redirect(url)
  }

  if (!subdomain || !(subdomain in SUBDOMAIN_MAP)) {
    // /work reached directly on the apex domain still needs its auth guard —
    // otherwise centered101.com/work/admin/dashboard bypasses the check that
    // work.centered101.com/admin/dashboard is subject to.
    if (pathname === '/work' || pathname.startsWith('/work/')) {
      const guard = await guardWorkRoute(request, pathname, false)
      if (guard.type === 'redirect') return guard.response
      const response = NextResponse.next()
      for (const c of guard.cookies) response.cookies.set(c.name, c.value, c.options)
      return response
    }
    return NextResponse.next()
  }

  const basePath = SUBDOMAIN_MAP[subdomain]
  const selfContained = SELF_CONTAINED_SUBDOMAINS.has(subdomain)

  // Already inside the subtree (someone typed work.centered101.com/work/...),
  // or a shared path that must not be rewritten at all.
  const alreadyScoped = pathname === basePath || pathname.startsWith(basePath + '/')
  const passThrough = selfContained
    ? pathname.startsWith('/api/')
    : pathname.startsWith('/auth/') ||
      pathname.startsWith('/api/') ||
      isPublicAssetPath(pathname)

  // Resolve the path this request will actually be served from, whether that
  // needs a rewrite or not — the guard must see the real target either way.
  const targetPath = alreadyScoped || passThrough ? pathname : pathname === '/' ? basePath : `${basePath}${pathname}`

  // flowstate carries its own session; check it before serving the route.
  // This runs for the pass-through branch too, so entering the subtree by its
  // internal path does not skip the check.
  let refreshedCookies: { name: string; value: string; options: object }[] = []
  if (targetPath === '/work' || targetPath.startsWith('/work/')) {
    const guard = await guardWorkRoute(request, targetPath, true)
    if (guard.type === 'redirect') return guard.response
    refreshedCookies = guard.cookies
  }

  const applyCookies = (response: NextResponse) => {
    for (const c of refreshedCookies) response.cookies.set(c.name, c.value, c.options)
    return response
  }

  if (alreadyScoped || passThrough) {
    return applyCookies(NextResponse.next())
  }

  const url = request.nextUrl.clone()
  url.pathname = targetPath

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-subdomain', subdomain)

  return applyCookies(NextResponse.rewrite(url, { request: { headers: requestHeaders } }))
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)',
  ],
}
