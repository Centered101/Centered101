'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { adminProjectTabs } from '@/lib/work/nav'

/**
 * Tab strip for a single project on the admin side. Same `.range-tabs`
 * styling as the client portal's `ProjectTabs`, so the two read as one
 * pattern; the destinations differ (see `adminProjectTabs`).
 *
 * A sub-route highlights its tab too — `documents/<id>` keeps เอกสารและแบรนด์
 * lit — while the overview tab stays exact so it is not always on.
 */
export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname()
  const base = `/work/admin/projects/${projectId}`

  return (
    <nav className="range-tabs project-tabs">
      {adminProjectTabs.map(({ label, segment }) => {
        const href = segment ? `${base}/${segment}` : base
        const selected = segment
          ? pathname === href || pathname.startsWith(`${href}/`)
          : pathname === href
        return (
          <Link key={label} href={href} className={selected ? 'selected' : ''}>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
