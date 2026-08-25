'use client'

import { useState } from 'react'

const RANGES = ['7 วัน', '30 วัน', '3 เดือน', '1 ปี'] as const

/**
 * Revenue range selector.
 *
 * Isolated into its own client component so the rest of the dashboard can
 * stay on the server. Still cosmetic — it does not refetch anything, exactly
 * as in the prototype. Wiring it to a real query belongs with Phase 26.
 */
export function RangeTabs() {
  const [range, setRange] = useState<string>('1 ปี')

  return (
    <div className="range-tabs">
      {RANGES.map((value) => (
        <button
          key={value}
          className={range === value ? 'selected' : ''}
          onClick={() => setRange(value)}
        >
          {value}
        </button>
      ))}
    </div>
  )
}
