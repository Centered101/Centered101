'use client'

import useSWR from 'swr'
import { fetchJson } from '@/lib/api-fetcher'
import type { GitHubUser, GitHubRepo, GitHubSocialAccount, GitHubOrganization, LanguageStats } from '@/lib/github/types'

interface GitHubData {
  user: GitHubUser
  repositories: GitHubRepo[]
  socialAccounts: GitHubSocialAccount[]
  organizations: GitHubOrganization[]
  orcidId: string | null
  totalStars: number
  topLanguages: LanguageStats[]
  cached: boolean
}

const fallbackGitHubData: GitHubData = {
  user: {
    login: 'Centered101',
    id: 0,
    avatar_url: 'https://wwcduaaqtyopvofzlouw.supabase.co/storage/v1/object/public/general/Tes-D.png',
    html_url: 'https://github.com/Centered101',
    name: 'Centered101',
    company: null,
    blog: '',
    location: null,
    email: null,
    bio: null,
    twitter_username: null,
    public_repos: 0,
    public_gists: 0,
    followers: 0,
    following: 0,
    created_at: '',
    updated_at: '',
  },
  repositories: [],
  socialAccounts: [],
  organizations: [],
  orcidId: null,
  totalStars: 0,
  topLanguages: [],
  cached: false,
}

const fetcher = (url: string) => fetchJson<GitHubData>(url, fallbackGitHubData, 'Failed to fetch GitHub data')

export function useGitHub() {
  const { data, error, isLoading, mutate } = useSWR<GitHubData>(
    '/api/github',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute
    }
  )

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
  }
}
