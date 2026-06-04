'use client'

import useSWR from 'swr'
import type { PortfolioTool } from '@/lib/portfolio/types'

interface PortfolioToolsData {
  configured: boolean
  tools: PortfolioTool[]
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch portfolio tools')
  }

  return data
}

export function usePortfolioTools() {
  const { data, error, isLoading, mutate } = useSWR<PortfolioToolsData>(
    '/api/portfolio/tools',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  )

  return {
    configured: data?.configured ?? false,
    tools: data?.tools || [],
    error,
    isLoading,
    refresh: mutate,
  }
}
