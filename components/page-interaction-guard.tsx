'use client'

import { useEffect } from 'react'

export function PageInteractionGuard() {
  useEffect(() => {
    const isProtectedMedia = (target: EventTarget | null) => {
      return target instanceof Element && Boolean(target.closest('img, canvas, video'))
    }

    const preventMediaDefault = (event: Event) => {
      if (isProtectedMedia(event.target)) {
        event.preventDefault()
      }
    }

    document.addEventListener('contextmenu', preventMediaDefault)
    document.addEventListener('dragstart', preventMediaDefault)

    return () => {
      document.removeEventListener('contextmenu', preventMediaDefault)
      document.removeEventListener('dragstart', preventMediaDefault)
    }
  }, [])

  return null
}
