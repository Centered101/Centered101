import { PanelSkeleton, StatsSkeleton } from '@/components/work/states'

/** Skeletons sized to the real dashboard so nothing shifts when data lands. */
export default function Loading() {
  return (
    <div className="standalone-state">
      <StatsSkeleton />
      <PanelSkeleton rows={4} />
    </div>
  )
}
