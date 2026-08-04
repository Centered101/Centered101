import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'centered101.com'

const DEFAULT_HOME = {
  target: 'portfolio',
  path: '/portfolio',
  url: `https://portfolio.${ROOT_DOMAIN}/`,
}

const TARGET_PATHS: Record<string, string> = {
  hub: '/',
  portfolio: '/portfolio',
  shop: '/shop',
  dashboard: '/dashboard',
  newtab: '/newtab',
}

const TARGET_URLS: Record<string, string | null> = {
  hub: null,
  portfolio: `https://portfolio.${ROOT_DOMAIN}/`,
  shop: `https://shop.${ROOT_DOMAIN}/`,
  dashboard: `https://system.${ROOT_DOMAIN}/dashboard`,
  newtab: `https://newtab.${ROOT_DOMAIN}/`,
}

function isPublicCustomPath(path: string) {
  return ![
    '/admin',
    '/portfolio/admin',
    '/shop/admin',
    '/api/admin',
  ].some((privatePath) => path === privatePath || path.startsWith(`${privatePath}/`))
}

export async function GET() {
  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json(DEFAULT_HOME)

  const { data, error } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', ['homepage_target', 'homepage_custom_path'])

  if (error) {
    if (error.code === '42P01') return NextResponse.json(DEFAULT_HOME)
    return NextResponse.json(DEFAULT_HOME)
  }

  const settings = Object.fromEntries((data ?? []).map((row) => [row.key, row.value])) as Record<string, unknown>
  const target = typeof settings.homepage_target === 'string' ? settings.homepage_target : DEFAULT_HOME.target
  const customPath = typeof settings.homepage_custom_path === 'string' ? settings.homepage_custom_path.trim() : ''

  if (target === 'custom') {
    const path = customPath.startsWith('/') ? customPath : DEFAULT_HOME.path
    if (!isPublicCustomPath(path)) return NextResponse.json(DEFAULT_HOME)

    return NextResponse.json({
      target,
      path,
      url: path,
    })
  }

  const safeTarget = target in TARGET_PATHS ? target : DEFAULT_HOME.target
  return NextResponse.json({
    target: safeTarget,
    path: TARGET_PATHS[safeTarget] ?? DEFAULT_HOME.path,
    url: TARGET_URLS[safeTarget] ?? null,
  })
}
