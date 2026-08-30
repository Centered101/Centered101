'use client'

import { useEffect, useRef } from 'react'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { createClient } from '@/lib/supabase/client'

export function useAdminRealtime(tables: string[], refetch: () => void) {
  const { isAuthenticated } = useAdminAuth()
  // Written in an effect, not during render: a render may be discarded or
  // replayed, and the ref write would happen anyway. React's
  // `react-hooks/refs` rule exists for exactly this.
  const refetchRef = useRef(refetch)
  useEffect(() => {
    refetchRef.current = refetch
  })
  const key = tables.join(',')

  useEffect(() => {
    if (!isAuthenticated || !tables.length) return
    let client: ReturnType<typeof createClient>
    try {
      client = createClient()
    } catch {
      return
    }
    const channel = client.channel(`admin-rt-${key}`)
    tables.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => refetchRef.current()
      )
    })
    channel.subscribe()
    return () => { client.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, key])
}
