'use client'

import { createContext, useContext, type ReactNode } from 'react'

import { workHref } from '@/lib/work/nav'

/**
 * The Client Component half of WorkLink's job (see its comment).
 *
 * A Server Component page can just `await isWorkSubdomain()` per render. A
 * Client Component that builds its own `/work`-prefixed href — Sidebar,
 * ProjectNav, ProjectSwitcher, or a `router.push()` after a form submits —
 * can't await headers(), so the answer is resolved once, server-side, by the
 * (admin)/(portal) layout and handed down through this provider instead.
 */
const StripWorkPrefixContext = createContext(false)

export function WorkLinkProvider({
  stripPrefix,
  children,
}: {
  stripPrefix: boolean
  children: ReactNode
}) {
  return (
    <StripWorkPrefixContext.Provider value={stripPrefix}>{children}</StripWorkPrefixContext.Provider>
  )
}

/** `href` resolved for the current host — the Client Component counterpart of WorkLink. */
export function useWorkHref(href: string): string {
  return workHref(href, useContext(StripWorkPrefixContext))
}

/**
 * The raw flag, for a component resolving several hrefs inside a `.map()` —
 * `useWorkHref` itself can't be called there (hooks can't run in a loop), so
 * read the flag once at the top and call `workHref(href, stripPrefix)`
 * directly per item instead.
 */
export function useStripWorkPrefix(): boolean {
  return useContext(StripWorkPrefixContext)
}
