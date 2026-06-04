'use client'

import AOS from 'aos'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function AosProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    AOS.init({
      duration: 650,
      easing: 'ease-out-cubic',
      once: true,
      offset: 80,
      delay: 50,
    })
  }, [])

  useEffect(() => {
    AOS.refresh()
  }, [pathname])

  return children
}
