import { PanelSkeleton, StatsSkeleton } from '@/components/work/states'

/**
 * Admin loading state.
 *
 * Sized to the dashboard it replaces, so nothing jumps when the data lands.
 * Crucially it shows SKELETONS, never sample rows: a placeholder that looks
 * like a project is indistinguishable from a real one for the moment it is on
 * screen, and people screenshot that moment.
 */
export default function AdminLoading() {
  return (
    <>
      <StatsSkeleton count={5} />
      <PanelSkeleton rows={5} />
      <PanelSkeleton rows={4} />
    </>
  )
}
