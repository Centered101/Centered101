import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { ElementType } from 'react'

import type { Tone } from './status'

/**
 * Dashboard stat card. Markup and classes are unchanged from the prototype.
 *
 * `href` is OPTIONAL and additive: a card without one renders exactly the
 * `<article>` it always did, so every existing caller is untouched. With one,
 * the same markup becomes a link — a card that states a number people
 * immediately want to filter by should be the thing they can click, rather
 * than making them find the matching dropdown.
 */
export function StatCard({
  label,
  value,
  change,
  icon: Icon,
  tone = 'blue',
  href,
  selected = false,
}: {
  label: string
  value: string
  change?: string
  icon: ElementType
  tone?: Tone
  /** Turns the card into a filter link. */
  href?: string
  /** Marks this card as the filter currently applied. */
  selected?: boolean
}) {
  const body = (
    <>
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
    </>
  )

  if (!href) return <article className="stat-card">{body}</article>

  return (
    <Link
      href={href}
      className={`stat-card stat-card-link${selected ? ' selected' : ''}`}
      aria-pressed={selected}
    >
      {body}
    </Link>
  )
}
