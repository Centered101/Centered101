import { notFound } from 'next/navigation'
import Link from 'next/link'

import { ActivityList } from '@/components/work/data/activity-list'
import { Panel, PageHeading, PanelHead } from '@/components/work/data/panel'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_LABELS,
  getActivity,
  type ActivityCategory,
} from '@/lib/work/queries/activity'
import { getProjectById } from '@/lib/work/queries/projects'

export const metadata = { title: 'กิจกรรม' }

const PAGE_SIZE = 50

function isCategory(value: string | undefined): value is ActivityCategory {
  return value !== undefined && value in ACTIVITY_CATEGORIES
}

/**
 * One project's full activity trail, filterable by category (Phase 9).
 *
 * THE FILTERS ARE A CONVENIENCE, NOT A PERMISSION. `activity_logs` has two
 * SELECT policies — staff read their organization, clients read only their own
 * projects — so dropping every filter below would not widen what anybody sees.
 * The category filter and the keyset cursor exist to make a long trail
 * readable, and both ride indexes migration 0012 already created.
 *
 * `requireProjectAccess` because reading a trail is not a mutation, and there
 * are no mutations on this page at all — activity_logs is immutable by trigger.
 */
export default async function AdminProjectActivityPage(
  props: PageProps<'/work/admin/projects/[id]/activity'>,
) {
  const { id } = await props.params
  const { category, before } = await props.searchParams

  await requireProjectAccess(id)

  const project = await getProjectById(id)
  if (!project) notFound()

  const selected = isCategory(typeof category === 'string' ? category : undefined)
    ? (category as ActivityCategory)
    : undefined

  const items = await getActivity({
    projectId: id,
    limit: PAGE_SIZE,
    category: selected,
    before: typeof before === 'string' ? before : undefined,
  })

  const base = `/work/admin/projects/${id}/activity`
  const older = items.length === PAGE_SIZE ? items[items.length - 1]?.createdAt : null

  return (
    <>
      <PageHeading
        eyebrow={project.projectCode}
        title="กิจกรรม"
        description="บันทึกทุกเหตุการณ์ของโปรเจกต์นี้ตามลำดับเวลา"
      />

      <Panel className="projects-panel">
        <PanelHead title="ตัวกรอง" description="กรองตามประเภทเหตุการณ์" />
        <nav className="range-tabs">
          <Link href={base} className={!selected ? 'selected' : ''}>
            ทั้งหมด
          </Link>
          {(Object.keys(ACTIVITY_CATEGORIES) as ActivityCategory[]).map((key) => (
            <Link
              key={key}
              href={`${base}?category=${key}`}
              className={selected === key ? 'selected' : ''}
            >
              {ACTIVITY_CATEGORY_LABELS[key]}
            </Link>
          ))}
        </nav>
      </Panel>

      <Panel className="projects-panel">
        <PanelHead
          title={selected ? ACTIVITY_CATEGORY_LABELS[selected] : 'ทั้งหมด'}
          description={`${items.length} รายการ`}
        />
        <ActivityList items={items} />

        {older && (
          <div className="form-actions">
            {/* Keyset paging on created_at — no OFFSET, so a deep page costs
                what the first page costs. */}
            <Link
              className="text-btn"
              href={`${base}?${selected ? `category=${selected}&` : ''}before=${encodeURIComponent(older)}`}
            >
              ดูรายการที่เก่ากว่านี้
            </Link>
          </div>
        )}
      </Panel>
    </>
  )
}
