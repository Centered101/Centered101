import { ProjectTabs } from './project-tabs'

/**
 * Per-project shell in the client portal.
 *
 * The tab strip is the client's map of what exists for this project. Which
 * tabs are *reachable* is decided by the unlock system in Phase 12 — this
 * layout renders navigation, never permission. Each tab page must
 * independently authorize its own data, because a client can always type the
 * URL directly (brief Phase 4).
 */
export default async function PortalProjectLayout(props: LayoutProps<'/work/portal/projects/[id]'>) {
  const { id } = await props.params

  return (
    <>
      <ProjectTabs projectId={id} />
      {props.children}
    </>
  )
}
