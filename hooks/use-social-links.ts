'use client'

import useSWR from 'swr'
import { fetchJson } from '@/lib/api-fetcher'
import type { SocialLink } from '@/lib/social-links/types'

interface SocialLinksData {
  configured: boolean
  links: SocialLink[]
}

const fallbackSocialLinksData: SocialLinksData = {
  configured: false,
  links: [],
}

const fetcher = (url: string) => fetchJson<SocialLinksData>(url, fallbackSocialLinksData, 'Failed to fetch social links')

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
