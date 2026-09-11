import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

/**
 * robots.txt for every host this one app serves.
 *
 * proxy.ts's matcher deliberately skips `/robots.txt`, so this file is reached
 * at the real path on whichever host asked and has to answer for all of them.
 * `work.<root>` is the only host with rules worth stating: its client portal
 * and admin trees are private — only the landing page and the legal pages are
 * meant to be crawled. Every other host gets an allow-all, which is already
 * what an absent robots.txt means, just returned as a real 200.
 */
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'centered101.com'

export const dynamic = 'force-dynamic'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host')?.split(':')[0].toLowerCase() ?? ''

  if (host === `work.${ROOT_DOMAIN}`) {
    const origin = `https://work.${ROOT_DOMAIN}`
    return {
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/login',
          '/portal/',
          '/admin/',
          '/auth/',
          '/api/',
          '/forgot-password',
          '/reset-password',
          '/share/',
          '/forbidden',
        ],
      },
      sitemap: `${origin}/sitemap.xml`,
      host: origin,
    }
  }

  return { rules: { userAgent: '*', allow: '/' } }
}
