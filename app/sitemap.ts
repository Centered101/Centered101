import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

import { LEGAL_UPDATED } from '@/lib/work/legal'

/**
 * sitemap.xml, host-aware for the same reason app/robots.ts is: proxy.ts's
 * matcher skips `/sitemap.xml`, so this serves at the real path on whichever
 * host asked.
 *
 * Only `work.<root>` lists anything — its four public pages. The rest of the
 * workspace (portal, admin, login, auth, share links) is noindex and left out
 * on purpose. Every other host gets an empty urlset.
 */
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'centered101.com'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get('host')?.split(':')[0].toLowerCase() ?? ''

  if (host !== `work.${ROOT_DOMAIN}`) return []

  const origin = `https://work.${ROOT_DOMAIN}`

  return [
    {
      url: `${origin}/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${origin}/about`,
      lastModified: new Date('2026-09-09'),
      changeFrequency: 'yearly',
      priority: 0.6,
    },
    {
      url: `${origin}/terms-of-service`,
      lastModified: new Date(LEGAL_UPDATED.terms),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${origin}/privacy-policy`,
      lastModified: new Date(LEGAL_UPDATED.privacy),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
