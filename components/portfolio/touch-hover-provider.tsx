'use client'

import { useEffect } from 'react'

export function TouchHoverProvider() {
  useEffect(() => {
    const isTouchLike = window.matchMedia('(hover: none)').matches
    if (!isTouchLike) return

    function clearTouchHover(except?: Element | null) {
      document.querySelectorAll('[data-touch-hover].touch-hover').forEach((element) => {
        if (element !== except) element.classList.remove('touch-hover')
      })
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Element | null
      const card = target?.closest('[data-touch-hover]')

      if (!card) {
        clearTouchHover()
        return
      }

      clearTouchHover(card)
      card.classList.add('touch-hover')
    }

    document.addEventListener('pointerdown', handlePointerDown, { passive: true })

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [])

  return null
}
