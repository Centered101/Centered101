import { NextResponse } from 'next/server'
import { requireAnyAdminPermission } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['view_logs', 'manage_portfolio'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const [profile, repos] = await Promise.allSettled([
    supabase
      .from('github_profiles')
      .select('username, name, bio, avatar_url, followers, following, public_repos, total_stars, top_languages, cached_at')
      .order('cached_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('github_repositories')
      .select('github_id, name, full_name, description, html_url, language, stargazers_count, forks_count, open_issues_count, is_fork, is_archived, topics, pushed_at, cached_at')
      .eq('is_archived', false)
      .order('stargazers_count', { ascending: false })
      .limit(50),
  ])

  return NextResponse.json({
    profile: profile.status === 'fulfilled' ? (profile.value.data ?? null) : null,
    repos: repos.status === 'fulfilled' ? (repos.value.data ?? []) : [],
  })
}
