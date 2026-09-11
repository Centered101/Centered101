'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { useStripWorkPrefix } from '@/components/work/layout/work-link-context'
import { workHref } from '@/lib/work/nav'
import { WIZARD_STEPS, type WizardStepKey } from '@/lib/work/wizard-steps'
import { useWizardDirty } from './wizard-dirty'

/**
 * URL-driven step strip — a link, not client state, so a shared link or a
 * browser-back always lands on the right step (same reasoning the Inbox
 * filter strip uses).
 *
 * Still intercepted on click, though: jumping straight to another step's URL
 * unmounts whatever form is on screen, and until `WizardDirtyProvider` this
 * happened with no save and no warning — arm-then-confirm on the tab itself,
 * the same convention MemberRemoveButton uses instead of window.confirm()
 * (see that file), rather than blocking navigation outright.
 */
export function WizardNav({ projectId, current }: { projectId: string; current: WizardStepKey }) {
  const router = useRouter()
  const { dirty, clearDirty } = useWizardDirty()
  const [armed, setArmed] = useState(false)
  const stripPrefix = useStripWorkPrefix()

  function go(href: string, targetStep: WizardStepKey) {
    if (targetStep === current) return

    if (dirty && !armed) {
      toast.warning('มีข้อมูลที่กรอกไว้ในขั้นตอนนี้แต่ยังไม่ได้บันทึก คลิกอีกครั้งเพื่อออกจากหน้านี้โดยไม่บันทึก')
      setArmed(true)
      window.setTimeout(() => setArmed(false), 4000)
      return
    }
    setArmed(false)
    clearDirty()
    router.push(href)
  }

  return (
    <nav className="range-tabs project-tabs">
      {WIZARD_STEPS.map((step, index) => {
        const href = workHref(
          `/work/portal/projects/${projectId}/wizard?step=${step.key}`,
          stripPrefix,
        )
        return (
          <Link
            key={step.key}
            href={href}
            className={step.key === current ? 'selected' : ''}
            onClick={(event) => {
              event.preventDefault()
              go(href, step.key)
            }}
          >
            {index + 2}. {step.label}
          </Link>
        )
      })}
    </nav>
  )
}
