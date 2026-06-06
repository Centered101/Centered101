'use client'

import { useEffect } from 'react'

export function PageInteractionGuard() {
  useEffect(() => {
    const isProtectedMedia = (target: EventTarget | null) => {
      return target instanceof Element && Boolean(target.closest('img, svg, canvas, video'))
    }

    const preventMediaDefault = (event: Event) => {
      if (isProtectedMedia(event.target)) {
        event.preventDefault()
      }
    }

    const protectMedia = () => {
      document.querySelectorAll('img, svg, canvas, video').forEach((element) => {
        element.setAttribute('draggable', 'false')
        element.setAttribute('oncontextmenu', 'return!1')
      })
    }

    protectMedia()

    document.addEventListener('contextmenu', preventMediaDefault)
    document.addEventListener('dragstart', preventMediaDefault)

    const observer = new MutationObserver(protectMedia)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      document.removeEventListener('contextmenu', preventMediaDefault)
      document.removeEventListener('dragstart', preventMediaDefault)
      observer.disconnect()
    }
  }, [])

  return null
}
