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

/**
 * The host that owns the workspace, for a request that arrived somewhere else.
 *
 * `/work` is a FILESYSTEM detail: app/work/ is where the routes live, and the
 * rewrite below is what puts them on work.<root> without the prefix. It was
 * never an address, so a URL still carrying it is sent to the host that owns
 * it rather than served in place — on every host that has a workspace
 * subdomain to send it to, dev included, so a developer sees exactly the URL
 * shape production visitors see.
 *
 * Serving both in place would also split the session. Supabase cookies are
 * host-scoped, so a sign-in on centered101.com/work/login is invisible to
 * work.centered101.com — the visitor signs in, gets bounced to the subdomain
 * by a link, and is signed out again. One canonical host is what stops that.
 *
 * Returns null for a host with no workspace subdomain to offer — a Vercel
 * preview deployment, chiefly, where `work.<deployment>.vercel.app` does not
 * resolve. Those keep the old behaviour of serving /work in place.
 */
function workHostFor(hostname: string, port: string | undefined): string | null {
  const suffix = port ? `:${port}` : ''
  if (hostname === ROOT_DOMAIN || hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    return `work.${ROOT_DOMAIN}${suffix}`
  }
  // Dev: the apex is localhost:3001 and the workspace is work.localhost:3001,
  // which getSubdomain() already recognises.
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return `work.localhost${suffix}`
  }
  return null
}

/** Drops the `/work` prefix from a path, for the URL the visitor is shown. */
function stripWorkPrefix(pathname: string): string {
  return pathname.replace(/^\/work/, '') || '/'
}

/**
 * True for a request the Next.js CLIENT RUNTIME made on its own — an RSC
 * segment fetch, a Server Action submission, or a prefetch — as opposed to a
 * real top-level navigation a browser's address bar can show.
 *
 * This is what the self-heal redirect just below must never touch. A Server
 * Action that calls `redirect('/login')` from a page rendered under the
 * `/work` rewrite comes back with a `/work/login` target — the same "app code
 * emits /work-prefixed paths" fact the redirect below exists to correct for a
 * normal click. But the client router does not treat that redirect as a page
 * load: it re-fetches the target itself, with these headers, expecting an RSC
 * payload back. Bouncing that fetch through a 308 hands it a redirect
 * response with no RSC body, which the router cannot parse — surfacing as
 * Next's generic "An unexpected response was received from the server."
 * Letting the request fall through to the normal guard-and-serve path below
 * answers it at the exact `/work/...` pathname the router asked for, which is
 * already a real route.
 */
function isNextClientRuntimeRequest(request: NextRequest): boolean {
  const headers = request.headers
  return (
    headers.has('next-action') ||
    headers.has('rsc') ||
    headers.has('next-router-state-tree') ||
    headers.has('next-router-prefetch')
  )
}

/**
 * Paths under /work whose prefix is REAL and must survive.
 *
 *   - `public/work/favicon.ico` is a file on disk served at `/work/favicon.ico`
 *     on every host. Stripping it would redirect the workspace's brand mark to
 *     the marketing site's favicon.
 *   - `/work/api/*` is where the workspace's routes actually live, and on the
 *     subdomain a bare `/api/*` deliberately passes through to the MAIN site's
 *     API instead. Stripping it would silently point the workspace at the wrong
 *     backend — and machine callers like Stripe's webhook do not follow
 *     redirects reliably anyway.
 */
function ownsWorkPrefix(pathname: string): boolean {
  return pathname.startsWith('/work/api/') || /\.[a-z0-9]+$/i.test(pathname)
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
    if (pathname === '/work' || pathname.startsWith('/work/')) {
      // The workspace lives on work.<root>, so send the visitor there and drop
      // the prefix on the way — an apex /work URL is a stale bookmark or an
      // internal link that escaped, not an address this host serves.
      const port = (request.headers.get('host') || '').split(':')[1]
      const workHost = ownsWorkPrefix(pathname) ? null : workHostFor(hostname, port)

      if (workHost) {
        const url = request.nextUrl.clone()
        url.host = workHost
        url.pathname = stripWorkPrefix(pathname)
        // 308, not 307: this is permanent, and unlike 301 it keeps the method
        // and body, so a form POST that lands here is not silently turned
        // into a GET.
        return NextResponse.redirect(url, 308)
      }

      // No workspace subdomain on this host (a preview deployment). Serve it
      // in place, still guarded — otherwise centered101.com/work/admin/dashboard
      // bypasses the check that work.centered101.com/admin/dashboard is
      // subject to.
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

  // work.centered101.com/work/admin/dashboard — the prefix is invisible on this
  // host, so serving it in place would leave `/work` sitting in the address
  // bar. App code still emits `/work`-prefixed links everywhere, so this is
  // what actually strips it: every internal link costs one redirect here, on
  // every host that reaches this branch — work.localhost:3001 included, so
  // dev matches production exactly.
  if (
    selfContained &&
    alreadyScoped &&
    !ownsWorkPrefix(pathname) &&
    !isNextClientRuntimeRequest(request)
  ) {
    const url = request.nextUrl.clone()
    url.pathname = stripWorkPrefix(pathname)
    return NextResponse.redirect(url, 308)
  }

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
