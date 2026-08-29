import { PanelSkeleton, StatsSkeleton } from '@/components/work/states'

/** Client portal loading state. Skeletons only — never placeholder data. */
export default function PortalLoading() {
  return (
    <>
      <StatsSkeleton count={4} />
      <PanelSkeleton rows={4} />
    </>
  )
}
