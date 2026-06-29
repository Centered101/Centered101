'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useAdminRealtime(tables: string[], refetch: () => void) {
  const refetchRef = useRef(refetch)
  refetchRef.current = refetch
  const key = tables.join(',')

  useEffect(() => {
    if (!tables.length) return
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
  }, [key])
}
