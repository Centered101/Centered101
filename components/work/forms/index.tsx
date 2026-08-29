'use client'

import { useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'

import type { ActionState } from '@/lib/work/services/projects'

/**
 * The two pieces every Server Action form in this app needs.
 *
 * Both were hand-rolled in each of the four forms — identically, except where
 * they had already drifted. A correction to the pending state or to the toast
 * de-duplication had to be made in four places to take effect, which is the
 * kind of edit that gets made in three.
 */

/**
 * Submit button wired to the enclosing form's pending state.
 *
 * Must be a child of the <form>, not the component that owns it: useFormStatus
 * reads the nearest form above it in the tree, and returns a permanently idle
 * status when called from the component that renders the form itself.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = 'primary',
}: {
  children: React.ReactNode
  pendingLabel: string
  variant?: 'primary' | 'outline'
}) {
  const { pending } = useFormStatus()

  return (
    <button className={variant} type="submit" disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  )
}

/**
 * Raises a toast when a Server Action reports back.
 *
 * The `lastMessage` ref is the point of it: `useActionState` keeps returning
 * the same state object on every subsequent render, so a bare
 * `if (state.message) toast.success(...)` fires again on each one. Comparing
 * against the previous message means a repeated success (submitting the same
 * form twice) still toasts, while a re-render does not.
 *
 * @param onSuccess runs once per successful submission — used to reset a form
 *   that stays on screen afterwards
 */
export function useActionToast(state: ActionState, onSuccess?: () => void) {
  const lastMessage = useRef<string | undefined>(undefined)

  // Held in a ref so an inline arrow from the caller does not re-run the toast
  // effect on every render. Written in ITS OWN effect, not during render:
  // mutating a ref while rendering is what React's `react-hooks/refs` rule
  // forbids, because a render may be thrown away or replayed and the write
  // would happen anyway.
  const onSuccessRef = useRef(onSuccess)
  useEffect(() => {
    onSuccessRef.current = onSuccess
  })

  useEffect(() => {
    if (state.error) toast.error(state.error)

    if (state.message && state.message !== lastMessage.current) {
      lastMessage.current = state.message
      toast.success(state.message)
      onSuccessRef.current?.()
    }
  }, [state])
}
