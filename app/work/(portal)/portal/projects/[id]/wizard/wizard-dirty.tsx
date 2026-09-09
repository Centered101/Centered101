'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type WizardDirtyContextValue = {
  dirty: boolean
  markDirty: () => void
  clearDirty: () => void
}

const WizardDirtyContext = createContext<WizardDirtyContextValue | null>(null)

/**
 * Whether the step CURRENTLY on screen has input the client typed but has
 * not saved — set by whichever step form is mounted, read by `WizardNav`.
 *
 * Every step but "brand" already saves on its own "ถัดไป" (`useStepAction`
 * submits, then advances only once the save succeeds), so within a step
 * nothing was ever lost. What had no guard at all was the tab strip above
 * it: `WizardNav` is a set of plain `<Link>`s that jump straight to another
 * step's URL, which unmounts the current form — edited, pre-filled or
 * freshly typed — without going through its save action first.
 *
 * One provider for the whole wizard page, not one per step: the step
 * components mount and unmount as `?step=` changes while this stays alive
 * across that, so "dirty" only ever needs to mean "the form on screen right
 * now," and each step's own save (or a confirmed jump away) is what clears
 * it for the next one.
 */
export function WizardDirtyProvider({ children }: { children: ReactNode }) {
  const [dirty, setDirty] = useState(false)
  const markDirty = useCallback(() => setDirty(true), [])
  const clearDirty = useCallback(() => setDirty(false), [])

  return (
    <WizardDirtyContext.Provider value={{ dirty, markDirty, clearDirty }}>{children}</WizardDirtyContext.Provider>
  )
}

export function useWizardDirty() {
  const ctx = useContext(WizardDirtyContext)
  if (!ctx) throw new Error('useWizardDirty must be used within WizardDirtyProvider')
  return ctx
}
