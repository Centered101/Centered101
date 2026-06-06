'use client'

import useSWR from 'swr'
import type { SocialLink } from '@/lib/social-links/types'

interface SocialLinksData {
  configured: boolean
  links: SocialLink[]
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch social links')
  }

  return data
}

export function useSocialLinks() {
  const { data, error, isLoading, mutate } = useSWR<SocialLinksData>(
    '/api/social-links',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  )

  return {
    configured: data?.configured ?? false,
    links: data?.links || [],
    error,
    isLoading,
    refresh: mutate,
  }
}
