'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

/**
 * Confirms a successful project creation after the redirect.
 *
 * The action redirects with `?created=1` rather than toasting before it
 * navigates, because a toast raised in the previous route is unmounted by the
 * navigation and never seen. The flag is then removed from the URL, so a
 * refresh or a shared link does not celebrate again.
 */
export function CreatedToast() {
  const router = useRouter()

  useEffect(() => {
    toast.success('สร้างโปรเจกต์สำเร็จ')
    const url = new URL(window.location.href)
    url.searchParams.delete('created')
    router.replace(url.pathname + url.search, { scroll: false })
  }, [router])

  return null
}
