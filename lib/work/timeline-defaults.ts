/**
 * The starting timeline offered to a project that has none
 * (docs/PROJECT_TIMELINE.md §4 / the Phase 4 brief §4).
 *
 * DEFAULTS, not a fixed structure. Applying them creates six ORDINARY
 * milestone rows that admin then renames, re-dates, reorders or deletes like
 * any other — nothing downstream reads these names, and a project that wants
 * eleven phases or none is equally valid.
 *
 * Kept in its own module rather than in services/work-milestones.ts because
 * that file is `'use server'` and may only export async functions, and rather
 * than in the UI because the browser must never be the thing that decides
 * what a project's timeline is. `phase` is free text in the database
 * (migration 0038) for the same reason: renaming a phase is a form edit, not
 * a migration.
 *
 * Only "Client Review" pre-sets the review gate — it is the one phase whose
 * entire purpose is the client signing off.
 */
export type TimelinePhaseDefault = {
  phase: string
  title: string
  clientReviewRequired: boolean
}

export const DEFAULT_TIMELINE_PHASES: readonly TimelinePhaseDefault[] = [
  { phase: 'Planning', title: 'วางแผนและเก็บความต้องการ', clientReviewRequired: false },
  { phase: 'UI/UX', title: 'ออกแบบ UI/UX', clientReviewRequired: false },
  { phase: 'Development', title: 'พัฒนาระบบ', clientReviewRequired: false },
  { phase: 'Testing', title: 'ทดสอบระบบ', clientReviewRequired: false },
  { phase: 'Client Review', title: 'ลูกค้าตรวจรับงาน', clientReviewRequired: true },
  { phase: 'Delivery', title: 'ส่งมอบงาน', clientReviewRequired: false },
]

/** Phase names offered as autocomplete suggestions. Never a closed list. */
export const DEFAULT_PHASE_NAMES = DEFAULT_TIMELINE_PHASES.map((entry) => entry.phase)
