import type { ElementType, ReactNode } from 'react'

import { Panel } from '@/components/work/data/panel'

/**
 * Shared shell for the non-happy-path states (brief Phase 29: never leave a
 * blank screen). Reuses `.panel` so they sit in the existing design rather
 * than introducing a second visual language.
 *
 * Split out from states/index.tsx so it can be shared with states/linked.tsx
 * without either file importing the other — see that file's comment for why
 * the split exists at all.
 */
export function StateShell({
  icon: Icon,
  tone = 'blue',
  title,
  description,
  action,
}: {
  icon: ElementType
  tone?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <Panel className="state-panel">
      <div className={`stat-icon icon-${tone}`}>
        <Icon size={18} />
      </div>
      <h2>{title}</h2>
      {description && <p className="muted">{description}</p>}
      {action}
    </Panel>
  )
}
