'use client'

import useSWR from 'swr'
import { fetchJson } from '@/lib/api-fetcher'
import type { PortfolioTool } from '@/lib/portfolio/types'

interface PortfolioToolsData {
  configured: boolean
  tools: PortfolioTool[]
}

const fallbackToolsData: PortfolioToolsData = {
  configured: false,
  tools: [],
}

const fetcher = (url: string) => fetchJson<PortfolioToolsData>(url, fallbackToolsData, 'Failed to fetch portfolio tools')

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
