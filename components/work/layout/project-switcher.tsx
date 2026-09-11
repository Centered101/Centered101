'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FolderKanban, Plus } from 'lucide-react'

import type { ProjectSwitcherItem } from '@/lib/work/queries/projects'
import { workHref } from '@/lib/work/nav'
import { useStripWorkPrefix, useWorkHref } from './work-link-context'

/**
 * The client portal's project switcher — "โปรเจกต์ของฉัน" plus every reachable
 * project, always visible in the sidebar, matching
 * docs/PROJECT_WORKSPACE_ARCHITECTURE.md §6's tree. The sidebar's own
 * comment flagged this as a known, deliberately-deferred gap; this is it.
 *
 * The active project is read from the URL (`/portal/projects/[id]/...`),
 * never from client state — the same rule every other "what's active" bit
 * of this app follows (isNavItemActive). Getting it wrong here is cosmetic
 * (the wrong row highlighted), not a security question: which project's
 * DATA renders is still decided entirely by the route's own
 * `requireProjectAccess` + RLS, completely independent of this component.
 */
export function ProjectSwitcher({ projects }: { projects: ProjectSwitcherItem[] }) {
  const pathname = usePathname()
  const activeId = pathname.match(/\/portal\/projects\/([0-9a-f-]{36})/)?.[1] ?? null
  const stripPrefix = useStripWorkPrefix()

  return (
    <div className="project-switcher">
      <div className="project-switcher-label">
        <FolderKanban size={14} />
        <Link href={useWorkHref('/work/portal/projects')}>โปรเจกต์ของฉัน</Link>
      </div>
      {projects.length > 0 && (
        <div className="project-switcher-list">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={workHref(`/work/portal/projects/${project.id}`, stripPrefix)}
              className={project.id === activeId ? 'active' : ''}
              title={project.name}
            >
              {project.name}
            </Link>
          ))}
        </div>
      )}
      <Link href={useWorkHref('/work/portal/projects/new')} className="project-switcher-create">
        <Plus size={13} /> สร้างโปรเจกต์
      </Link>
    </div>
  )
}
