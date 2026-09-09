import type { ReactNode } from 'react'

import { ProjectTabs } from './project-tabs'

/**
 * Per-project shell on the admin side.
 *
 * Mirrors the client portal's `[id]/layout.tsx`: the tab strip is rendered
 * once here, above every sub-page's own heading, so navigation between a
 * project's sections is one consistent control instead of a row of links
 * crammed into each page's header. Each tab page still authorizes its own
 * data — this layout renders navigation, never permission.
 */
export default async function AdminProjectLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>
  children: ReactNode
}) {
  const { id } = await params

  return (
    <>
      <ProjectTabs projectId={id} />
      {children}
    </>
  )
}
