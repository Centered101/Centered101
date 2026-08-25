import { PageHeading } from '@/components/work/data/panel'
import { EmptyState } from '@/components/work/states'

/**
 * Placeholder for a route that exists structurally but whose feature lands in
 * a later phase.
 *
 * Deliberately says so rather than showing invented data. A screen full of
 * plausible fake records is worse than an empty one — it hides what is real,
 * and someone eventually ships it.
 */
export function PlannedRoute({
  eyebrow,
  title,
  description,
  phase,
}: {
  eyebrow?: string
  title: string
  description: string
  phase: string
}) {
  return (
    <>
      <PageHeading eyebrow={eyebrow} title={title} description={description} />
      <EmptyState
        title="ยังไม่เปิดใช้งาน"
        description={`หน้านี้จะพร้อมใช้งานใน ${phase} — โครงสร้างเส้นทางพร้อมแล้ว รอเชื่อมต่อข้อมูลจริง`}
      />
    </>
  )
}
