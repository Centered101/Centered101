'use client'

import { Toaster as Sonner } from 'sonner'

/**
 * The workspace's toaster.
 *
 * The site-wide one (components/ui/sonner) is styled with `unstyled: true` plus
 * Tailwind classes, and Tailwind no longer loads under /work — so this renders
 * sonner's own styles instead, tinted to the workspace palette and set in the
 * face the rest of /work uses.
 *
 * Rendered here, inside `<div className="work-root ...">` (app/work/layout.tsx)
 * — this version of sonner has no portal of its own, it positions itself with
 * `position: fixed` and stays exactly where React put it in the tree, so
 * `var(--font-kanit)` below does resolve against `.work-root`'s own instance
 * of the font rather than needing a literal fallback.
 */
export function WorkToaster() {
  return (
    <Sonner
      position="top-right"
      gap={8}
      toastOptions={{
        style: {
          fontFamily: 'var(--font-kanit), Arial, Helvetica, sans-serif',
          fontSize: '14px', // matches --text-base
          borderRadius: '12px',
          border: '1px solid #dbeeff',
          background: '#ffffff',
          color: '#1f2937',
          boxShadow: '0 18px 48px -30px rgba(15, 23, 42, 0.38)',
        },
      }}
    />
  )
}
