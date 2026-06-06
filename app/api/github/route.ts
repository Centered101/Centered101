import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  fetchGitHubUser,
  fetchGitHubRepos,
  fetchGitHubSocialAccounts,
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

type ProjectPosterRow = {
  repo_name: string
  poster_url: string
}

function normalizeLanguageColors(languages: CachedLanguage[] | null | undefined) {
  return (languages || []).map((language) => ({
    ...language,
    color: getLanguageColor(language.name),
  }))
}

async function getProjectPosterMap(supabase: Awaited<ReturnType<typeof createClient>> | null) {
  if (!supabase) {
    return new Map<string, string>()
  }

  const { data, error } = await supabase
    .from('portfolio_project_posters')
    .select('repo_name, poster_url')
    .eq('enabled', true)

  if (error) {
    console.warn('Project poster cache read failed:', error)
    return new Map<string, string>()
  }

  return new Map((data as ProjectPosterRow[] | null || []).map((poster) => [poster.repo_name, poster.poster_url]))
}

function attachProjectPosters<T extends { name: string }>(repos: T[], posters: Map<string, string>) {
  return repos.map((repo) => ({
    ...repo,
    poster_url: posters.get(repo.name) || null,
  }))
}

export async function GET() {
  try {
    let supabase: Awaited<ReturnType<typeof createClient>> | null = null

    try {
      supabase = await createClient()
    } catch (error) {
      console.warn('Supabase cache unavailable:', error)
    }

    // Check cache first
    if (supabase) {
      const { data: cachedProfile, error: profileError } = await supabase
        .from('github_profiles')
        .select('*')
        .eq('username', GITHUB_USERNAME)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        console.warn('GitHub cache read failed:', profileError)
      }

      const now = new Date()
      const cachedLanguages = Array.isArray(cachedProfile?.top_languages)
        ? cachedProfile.top_languages
        : []
      const cacheValid =
        cachedProfile &&
        cachedProfile.cached_at &&
        now.getTime() - new Date(cachedProfile.cached_at).getTime() < CACHE_DURATION_MS &&
        cachedLanguages.length >= 9

      if (cacheValid && cachedProfile) {
        const socialAccounts = await fetchGitHubSocialAccounts(GITHUB_USERNAME).catch((error) => {
          console.warn('GitHub social accounts fetch failed:', error)
          return []
        })
        const orcidId = extractOrcidId(socialAccounts)

        // Return cached data
        const { data: cachedRepos, error: reposError } = await supabase
          .from('github_repositories')
          .select('*')
          .eq('username', GITHUB_USERNAME)
          .order('stargazers_count', { ascending: false })

        if (!reposError) {
          const projectPosters = await getProjectPosterMap(supabase)

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
            repositories: attachProjectPosters(cachedRepos || [], projectPosters),
            socialAccounts,
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
    const socialAccounts = await fetchGitHubSocialAccounts(GITHUB_USERNAME).catch((error) => {
      console.warn('GitHub social accounts fetch failed:', error)
      return []
    })

    const totalStars = calculateTotalStars(repos)
    const topLanguages = calculateTopLanguages(repos)
    const orcidId = extractOrcidId(socialAccounts)
    const projectPosters = await getProjectPosterMap(supabase)

    if (supabase) {
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
      }

      // Update repos cache
      for (const repo of repos) {
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
        }
      }
    }

    return NextResponse.json({
      user,
      repositories: attachProjectPosters(repos, projectPosters),
      socialAccounts,
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
