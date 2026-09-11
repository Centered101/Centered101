import Link from 'next/link'
import type { ComponentProps } from 'react'

import { isWorkSubdomain } from '@/lib/work/auth/callback-url'
import { workHref } from '@/lib/work/nav'

/**
 * `next/link`, resolved for the host this request actually reached the
 * workspace on.
 *
 * Every href in this app is authored `/work`-prefixed — that's where the
 * route lives in the filesystem (see proxy.ts) — but on work.<root> the
 * prefix is invisible. Rendering the raw `/work/...` string as `href` still
 * WORKS (proxy.ts 308s a hard navigation to the clean path), but it means the
 * link's hover preview and, until the next hard load, the address bar after a
 * click both show `/work` where the visitor never typed or asked for it.
 * This resolves the prefix at render time instead, server-side, so the href
 * is correct from the first paint.
 *
 * Server Component only — it awaits `isWorkSubdomain()`. A Client Component
 * that builds its own `/work`-prefixed href (Sidebar, ProjectNav,
 * ProjectSwitcher) can't await headers(); it reads the same answer through
 * `useWorkHref` (work-link-context.tsx) instead.
 */
export async function WorkLink({ href, ...props }: ComponentProps<typeof Link>) {
  const stripPrefix = await isWorkSubdomain()
  const resolvedHref = typeof href === 'string' ? workHref(href, stripPrefix) : href
  return <Link href={resolvedHref} {...props} />
}
