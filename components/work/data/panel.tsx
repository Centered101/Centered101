import type { ReactNode } from 'react'

/**
 * The card container used throughout both portals, plus its header row.
 * Classes match the prototype (`.panel`, `.panel-head`) so existing CSS
 * applies untouched; `className` allows the per-panel modifiers the
 * prototype used (`revenue-panel`, `projects-panel`, `ownership`, …).
 */
export function Panel({
  children,
  className = '',
  id,
}: {
  children: ReactNode
  className?: string
  /** Anchor target, so a stat card elsewhere on the page can link to this panel. */
  id?: string
}) {
  return <article id={id} className={`panel ${className}`.trim()}>{children}</article>
}

export function PanelHead({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="panel-head">
      <div>
        <h2>{title}</h2>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/** Page title block above the content grid. */
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/** Inline progress bar with its percentage label. */
export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress-cell">
      <div className="progress">
        <span style={{ width: `${value}%` }} />
      </div>
      <small>{value}%</small>
    </div>
  )
}
