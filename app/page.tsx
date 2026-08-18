import { redirect } from 'next/navigation'
import { EcosystemPage } from '@/components/ecosystem-page'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'centered101.com'
const DEFAULT_TARGET = 'portfolio'

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

async function getHomepageTarget() {
  const supabase = createAdminClient()
  if (!supabase) return { target: DEFAULT_TARGET, customPath: '' }

  const { data, error } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', ['homepage_target', 'homepage_custom_path'])

  if (error) return { target: DEFAULT_TARGET, customPath: '' }

  const settings = Object.fromEntries((data ?? []).map((row) => [row.key, row.value])) as Record<string, unknown>

  return {
    target: typeof settings.homepage_target === 'string' ? settings.homepage_target : DEFAULT_TARGET,
    customPath: typeof settings.homepage_custom_path === 'string' ? settings.homepage_custom_path.trim() : '',
  }
}

export default async function Home() {
  const { target, customPath } = await getHomepageTarget()

  if (target === 'hub') {
    return <EcosystemPage slug="/" />
  }

  if (target === 'custom') {
    const path = customPath.startsWith('/') && isPublicCustomPath(customPath)
      ? customPath
      : '/portfolio'

    if (path === '/') return <EcosystemPage slug="/" />
    redirect(path)
  }

  const safeTarget = target in TARGET_URLS ? target : DEFAULT_TARGET
  const url = TARGET_URLS[safeTarget]

  if (!url) return <EcosystemPage slug="/" />
  redirect(url)
}
