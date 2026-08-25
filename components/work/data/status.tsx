import type { ReactNode } from 'react'

export type Tone = 'blue' | 'green' | 'orange' | 'red' | 'violet'

/** Status pill. Markup and classes are unchanged from the v0 prototype. */
export function Status({ children, tone = 'blue' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`status status-${tone}`}>
      <span className="status-dot" />
      {children}
    </span>
  )
}

/**
 * Maps a project status to a pill tone.
 *
 * The prototype compared against English literals ("Completed", "Pending")
 * while the data was already Thai, so no comparison ever matched and every
 * pill fell through to blue. Comparing against the actual values fixes that.
 * Phase 5 replaces this with the 19-value project_status enum.
 */
export function statusTone(status: string): Tone {
  if (status === 'เสร็จสมบูรณ์') return 'green'
  if (status === 'รอดำเนินการ') return 'orange'
  return 'blue'
}
