'use client'

import { useState, useTransition } from 'react'

import { PaymentModal, type PaymentMethod } from '@/components/work/domain/payment-modal'
import { startMilestoneCheckout } from '@/lib/work/services/payments'

/**
 * Opens the checkout modal for one milestone.
 *
 * The amount rendered in the modal is for the person reading it. It is NOT
 * what gets charged: the server re-reads the milestone and prices the checkout
 * from the row, so a tampered prop changes the label and nothing else.
 *
 * On success this does not declare anything paid — it hands the browser to the
 * provider. The payment becomes PAID only when the provider's webhook says so
 * (app/work/api/payments/webhook/route.ts), which is why the pending state is
 * left on through the redirect rather than resolved into a success message.
 */
export function CheckoutButton({
  projectId,
  milestoneId,
  milestoneName,
  projectName,
  amountLabel,
  reference,
}: {
  projectId: string
  milestoneId: string
  milestoneName: string
  projectName: string
  amountLabel: string
  reference: string
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [redirecting, setRedirecting] = useState(false)
  const [pending, startTransition] = useTransition()

  function submit(method: PaymentMethod) {
    setError(undefined)

    const formData = new FormData()
    formData.set('projectId', projectId)
    formData.set('milestoneId', milestoneId)
    formData.set('method', method.toUpperCase())

    startTransition(async () => {
      const result = await startMilestoneCheckout({}, formData)

      if (result.url) {
        // Kept true deliberately: the navigation is not instant, and a button
        // that becomes clickable again in between invites a second checkout.
        setRedirecting(true)
        window.location.href = result.url
        return
      }

      setError(result.error ?? 'ไม่สามารถเริ่มการชำระเงินได้ กรุณาลองใหม่อีกครั้ง')
    })
  }

  return (
    <>
      <button type="button" className="outline btn-sm" onClick={() => setOpen(true)}>
        ชำระเงิน
      </button>

      {open && (
        <PaymentModal
          title={`งวด: ${milestoneName}`}
          projectName={projectName}
          amount={amountLabel}
          reference={reference}
          submitting={pending || redirecting}
          error={error}
          onSubmit={submit}
          onClose={() => {
            // Not closable mid-flight: the checkout row is already created and
            // the redirect is on its way.
            if (pending || redirecting) return
            setError(undefined)
            setOpen(false)
          }}
        />
      )}
    </>
  )
}
