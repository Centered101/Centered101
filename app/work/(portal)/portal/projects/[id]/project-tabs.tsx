'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { portalProjectTabs } from '@/lib/work/nav'

/**
 * Tab strip for a single project. Reuses the existing `.range-tabs` styling
 * rather than introducing a new tab component, so it matches the range
 * selector already used on the dashboard.
 */
export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname()
  const base = `/work/portal/projects/${projectId}`

  return (
    <nav className="range-tabs project-tabs">
      {portalProjectTabs.map(({ label, segment }) => {
        const href = segment ? `${base}/${segment}` : base
        return (
          <Link key={label} href={href} className={pathname === href ? 'selected' : ''}>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
