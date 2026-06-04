import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  fetchGitHubUser,
  fetchGitHubRepos,
  fetchGitHubSocialAccounts,
  extractOrcidId,
  calculateTotalStars,
  calculateTopLanguages,
} from '@/lib/github/api'

const GITHUB_USERNAME = 'Centered101'
const CACHE_DURATION_MS = 60 * 60 * 1000 // 1 hour

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
      const cacheValid =
        cachedProfile &&
        cachedProfile.cached_at &&
        now.getTime() - new Date(cachedProfile.cached_at).getTime() < CACHE_DURATION_MS

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
            repositories: cachedRepos || [],
            socialAccounts,
            orcidId,
            totalStars: cachedProfile.total_stars,
            topLanguages: cachedProfile.top_languages,
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
      repositories: repos,
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
