'use client'

import { useEffect } from 'react'

import { ErrorState } from '@/components/work/states'

/**
 * Root error boundary. Never leaves a blank screen (brief Phase 29).
 * The raw error is logged, not rendered — messages can leak internals.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="standalone-state">
      <ErrorState
        action={
          <button className="outline" onClick={reset}>
            ลองใหม่อีกครั้ง
          </button>
        }
      />
    </div>
  )
}
