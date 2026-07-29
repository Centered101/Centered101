import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  fetchGitHubUser,
  fetchGitHubRepos,
  fetchGitHubSocialAccounts,
  fetchGitHubOrganizations,
  extractOrcidId,
  calculateTotalStars,
  calculateTopLanguages,
  getLanguageColor,
} from '@/lib/github/api'

const GITHUB_USERNAME = 'Centered101'
const CACHE_DURATION_MS = 60 * 60 * 1000 // 1 hour

type CachedLanguage = {
  name: string
  percentage: number
  color?: string
}

type CachedRepository = {
  github_id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  homepage: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  watchers_count: number
  open_issues_count: number
  is_fork: boolean
  is_archived: boolean
  topics: string[]
  created_at: string
  updated_at: string
  pushed_at: string
}

function normalizeLanguageColors(languages: CachedLanguage[] | null | undefined) {
  return (languages || []).map((language) => ({
    ...language,
    color: getLanguageColor(language.name),
  }))
}

function normalizeCachedRepositories(repositories: CachedRepository[] | null | undefined) {
  return (repositories || []).map((repo) => ({
    id: repo.github_id,
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description,
    html_url: repo.html_url,
    homepage: repo.homepage,
    language: repo.language,
    stargazers_count: repo.stargazers_count,
    forks_count: repo.forks_count,
    watchers_count: repo.watchers_count,
    open_issues_count: repo.open_issues_count,
    fork: repo.is_fork,
    archived: repo.is_archived,
    topics: repo.topics || [],
    created_at: repo.created_at,
    updated_at: repo.updated_at,
    pushed_at: repo.pushed_at,
  }))
}

function isInvalidApiKeyError(error: { message?: string } | null | undefined) {
  return (error?.message || '').toLowerCase().includes('invalid api key')
}

function isMissingCacheTableError(error: { code?: string; message?: string } | null | undefined) {
  const message = (error?.message || '').toLowerCase()
  return error?.code === 'PGRST205' || message.includes('could not find the table')
}

export async function GET() {
  try {
    let supabase = createAdminClient()

    if (!supabase) {
      console.warn('Supabase GitHub cache skipped: service role client is not configured')
    }

    // Check cache first
    if (supabase) {
      const cacheClient = supabase
      const { data: cachedProfile, error: profileError } = await cacheClient
        .from('github_profiles')
        .select('*')
        .eq('username', GITHUB_USERNAME)
        .single()

      const cacheReadFailed = Boolean(profileError && profileError.code !== 'PGRST116')
      if (profileError && profileError.code !== 'PGRST116') {
        console.warn('GitHub cache read failed:', profileError)
        if (isInvalidApiKeyError(profileError) || isMissingCacheTableError(profileError)) {
          supabase = null
        }
      }

      const now = new Date()
      const cachedLanguages = Array.isArray(cachedProfile?.top_languages)
        ? cachedProfile.top_languages
        : []
      const cacheValid =
        !cacheReadFailed &&
        cachedProfile &&
        cachedProfile.cached_at &&
        now.getTime() - new Date(cachedProfile.cached_at).getTime() < CACHE_DURATION_MS &&
        cachedLanguages.length >= 9

      if (cacheValid && cachedProfile) {
        const [socialAccounts, organizations] = await Promise.all([
          fetchGitHubSocialAccounts(GITHUB_USERNAME).catch((error) => {
            console.warn('GitHub social accounts fetch failed:', error)
            return []
          }),
          fetchGitHubOrganizations(GITHUB_USERNAME).catch((error) => {
            console.warn('GitHub organizations fetch failed:', error)
            return []
          }),
        ])
        const orcidId = extractOrcidId(socialAccounts)

        // Return cached data
        const { data: cachedRepos, error: reposError } = await cacheClient
          .from('github_repositories')
          .select('*')
          .eq('username', GITHUB_USERNAME)
          .order('stargazers_count', { ascending: false })

        if (!reposError) {
          return NextResponse.json({
            user: {
              login: cachedProfile.username,
              avatar_url: cachedProfile.avatar_url,
              name: cachedProfile.name,
              bio: cachedProfile.bio,
              company: cachedProfile.company,
              location: cachedProfile.location,
              blog: cachedProfile.blog,
              twitter_username: cachedProfile.twitter_username,
              followers: cachedProfile.followers,
              following: cachedProfile.following,
              public_repos: cachedProfile.public_repos,
            },
            repositories: normalizeCachedRepositories(cachedRepos as CachedRepository[] | null),
            socialAccounts,
            organizations,
            orcidId,
            totalStars: cachedProfile.total_stars,
            topLanguages: normalizeLanguageColors(cachedProfile.top_languages),
            cached: true,
          })
        }

        console.warn('GitHub repos cache read failed:', reposError)
      }
    }

    // Fetch fresh data from GitHub
    const [user, repos] = await Promise.all([
      fetchGitHubUser(GITHUB_USERNAME),
      fetchGitHubRepos(GITHUB_USERNAME),
    ])
    const [socialAccounts, organizations] = await Promise.all([
      fetchGitHubSocialAccounts(GITHUB_USERNAME).catch((error) => {
        console.warn('GitHub social accounts fetch failed:', error)
        return []
      }),
      fetchGitHubOrganizations(GITHUB_USERNAME).catch((error) => {
        console.warn('GitHub organizations fetch failed:', error)
        return []
      }),
    ])

    const totalStars = calculateTotalStars(repos)
    const topLanguages = calculateTopLanguages(repos, 15)
    const orcidId = extractOrcidId(socialAccounts)

    if (supabase) {
      let cacheWritable = true
      // Update cache in Supabase. Cache failures should not break the API response.
      const { error: profileUpsertError } = await supabase.from('github_profiles').upsert(
        {
          username: user.login,
          avatar_url: user.avatar_url,
          name: user.name,
          bio: user.bio,
          company: user.company,
          location: user.location,
          blog: user.blog,
          twitter_username: user.twitter_username,
          followers: user.followers,
          following: user.following,
          public_repos: user.public_repos,
          total_stars: totalStars,
          top_languages: topLanguages,
          raw_data: user,
          cached_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'username' }
      )

      if (profileUpsertError) {
        console.warn('GitHub profile cache write failed:', profileUpsertError)
        cacheWritable = !isInvalidApiKeyError(profileUpsertError) && !isMissingCacheTableError(profileUpsertError)
      }

      // Update repos cache
      for (const repo of cacheWritable ? repos : []) {
        const { error: repoUpsertError } = await supabase.from('github_repositories').upsert(
          {
            github_id: repo.id,
            username: user.login,
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            html_url: repo.html_url,
            homepage: repo.homepage,
            language: repo.language,
            stargazers_count: repo.stargazers_count,
            forks_count: repo.forks_count,
            watchers_count: repo.watchers_count,
            open_issues_count: repo.open_issues_count,
            is_fork: repo.fork,
            is_archived: repo.archived,
            topics: repo.topics,
            created_at: repo.created_at,
            updated_at: repo.updated_at,
            pushed_at: repo.pushed_at,
            cached_at: new Date().toISOString(),
          },
          { onConflict: 'github_id' }
        )

        if (repoUpsertError) {
          console.warn(`GitHub repo cache write failed for ${repo.full_name}:`, repoUpsertError)
          if (isInvalidApiKeyError(repoUpsertError) || isMissingCacheTableError(repoUpsertError)) {
            break
          }
        }
      }
    }

    return NextResponse.json({
      user,
      repositories: repos,
      socialAccounts,
      organizations,
      orcidId,
      totalStars,
      topLanguages,
      cached: false,
    })
  } catch (error) {
    console.error('GitHub API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch GitHub data' },
      { status: 500 }
    )
  }
}
