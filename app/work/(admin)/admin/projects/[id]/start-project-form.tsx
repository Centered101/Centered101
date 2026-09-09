'use client'

import { useActionState } from 'react'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import { startProject, type PaymentPlanActionState } from '@/lib/work/services/payment-plans'

/**
 * "Start project" — READY_TO_START -> IN_PROGRESS (docs/PAYMENT_PLAN.md §7).
 *
 * Only rendered once the project is already READY_TO_START, which it only
 * reaches when the ฿250 start payment has actually settled
 * (advanceProjectOnStartPayment). The button being present is a convenience;
 * the rule is `assertValidTransition` inside `startProject`, so calling the
 * action directly from a project that has not paid still fails.
 */
export function StartProjectForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState<PaymentPlanActionState, FormData>(startProject, {})
  useActionToast(state)

  return (
    <form action={formAction} className="start-project-form">
      <input type="hidden" name="projectId" value={projectId} />
      <SubmitButton pendingLabel="กำลังเริ่ม...">เริ่มงานโปรเจกต์</SubmitButton>
    </form>
  )
}
