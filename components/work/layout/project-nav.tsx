'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import { adminProjectTabs, portalProjectTabs, workHref, workPath } from '@/lib/work/nav'
import { useStripWorkPrefix, useWorkHref } from './work-link-context'

/**
 * The sidebar's contents while a single project is open.
 *
 * Replaces the top-level nav (and, on the portal, the project switcher) with
 * that project's own sections — the strip that used to run horizontally above
 * the page (ProjectTabs, now removed). A "back" link returns to the project
 * list; the project's name sits under it as the section header.
 *
 * Presentation only: every section still authorizes its own data, and the
 * portal's unlock system (Phase 12) still decides which are reachable. The
 * links render as `.sidebar nav a`, so they pick up the same active-pill
 * treatment as the main nav for free.
 */
export function ProjectNav({
  activePortal,
  projectId,
  projectName,
  onNavigate,
}: {
  activePortal: 'admin' | 'portal'
  projectId: string
  /** Null when it could not be resolved (e.g. an archived project not in the list). */
  projectName: string | null
  onNavigate: () => void
}) {
  // Normalised so the active check works whether usePathname() carries the
  // /work prefix or not — see workPath.
  const path = workPath(usePathname())
  const base = `/work/${activePortal}/projects/${projectId}`
  const baseNoPrefix = `/${activePortal}/projects/${projectId}`
  const items = activePortal === 'admin' ? adminProjectTabs : portalProjectTabs
  const stripPrefix = useStripWorkPrefix()

  return (
    <div className="project-nav">
      <Link
        href={useWorkHref(`/work/${activePortal}/projects`)}
        className="project-nav-back"
        onClick={onNavigate}
      >
        <ChevronLeft size={15} />
        โปรเจกต์ทั้งหมด
      </Link>
      {projectName && <p className="project-nav-title">{projectName}</p>}
      <nav>
        {items.map(({ label, segment, icon: Icon }) => {
          const href = segment ? `${base}/${segment}` : base
          const match = segment ? `${baseNoPrefix}/${segment}` : baseNoPrefix
          // Overview matches exactly so it isn't always lit; a section also
          // lights for its own sub-routes.
          const active = segment
            ? path === match || path.startsWith(`${match}/`)
            : path === match
          return (
            <Link
              key={label}
              href={workHref(href, stripPrefix)}
              className={active ? 'active' : ''}
              onClick={onNavigate}
            >
              <Icon size={17} />
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
