import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'centered101.com'

const SUBDOMAIN_MAP: Record<string, string> = {
  admin: '/admin',
  portfolio: '/portfolio',
  newtab: '/newtab',
  shop: '/shop',
}

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

export function proxy(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const subdomain = getSubdomain(hostname)

  if (!subdomain || !(subdomain in SUBDOMAIN_MAP)) {
    return NextResponse.next()
  }

  const basePath = SUBDOMAIN_MAP[subdomain]
  const { pathname } = request.nextUrl

  // Let auth callback and API routes pass through without rewriting
  if (
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith(basePath + '/') ||
    pathname === basePath
  ) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = pathname === '/' ? basePath : `${basePath}${pathname}`

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-subdomain', subdomain)

  return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)',
  ],
}
