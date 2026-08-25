import { ArrowUpRight, MoreHorizontal } from 'lucide-react'
import type { ElementType } from 'react'

import type { Tone } from './status'

/** Dashboard stat card. Markup and classes are unchanged from the prototype. */
export function StatCard({
  label,
  value,
  change,
  icon: Icon,
  tone = 'blue',
}: {
  label: string
  value: string
  change?: string
  icon: ElementType
  tone?: Tone
}) {
  return (
    <article className="stat-card">
      <div className={`stat-icon icon-${tone}`}>
        <Icon size={18} />
      </div>
      <div className="stat-copy">
        <p>{label}</p>
        <strong>{value}</strong>
        {change && (
          <span className="stat-change">
            {change} <ArrowUpRight size={13} />
          </span>
        )}
      </div>
      <MoreHorizontal className="more" size={18} />
    </article>
  )
}
