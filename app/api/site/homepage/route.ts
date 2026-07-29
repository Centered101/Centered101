import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DEFAULT_HOME = { target: 'portfolio', path: '/' }

const TARGET_PATHS: Record<string, string> = {
  portfolio: '/',
  shop: '/shop',
  dashboard: '/dashboard',
  newtab: '/newtab',
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
    return NextResponse.json({
      target,
      path: customPath.startsWith('/') ? customPath : DEFAULT_HOME.path,
    })
  }

  return NextResponse.json({
    target: target in TARGET_PATHS ? target : DEFAULT_HOME.target,
    path: TARGET_PATHS[target] ?? DEFAULT_HOME.path,
  })
}
