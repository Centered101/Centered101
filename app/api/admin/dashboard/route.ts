import { NextResponse } from 'next/server'
import { requireAnyAdminPermission } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['view_logs', 'manage_portfolio', 'manage_blog'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [projects, posts, messages, assets, visitors, recentActivity, secEvents] =
    await Promise.allSettled([
      supabase
        .from('portfolio_projects')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null),
      supabase
        .from('blog_posts')
        .select('id, status', { count: 'exact' })
        .is('deleted_at', null),
      supabase
        .from('contact_messages')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false)
        .is('deleted_at', null),
      supabase
        .from('digital_assets')
        .select('id, size_bytes', { count: 'exact' })
        .is('deleted_at', null),
      supabase
        .from('visitor_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo),
      supabase
        .from('audit_logs')
        .select('id, action, resource, resource_id, outcome, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(12),
      supabase
        .from('security_events')
        .select('id', { count: 'exact', head: true })
        .eq('resolved', false)
        .gte('severity', 'warning'),
    ])

  const getCount = (result: PromiseSettledResult<{ count: number | null }>) =>
    result.status === 'fulfilled' ? (result.value.count ?? 0) : 0

  const getValue = <T>(result: PromiseSettledResult<{ data: T | null }>, fallback: T) =>
    result.status === 'fulfilled' ? (result.value.data ?? fallback) : fallback

  const postsData = getValue(posts as PromiseSettledResult<{ data: { status: string }[] | null }>, [])
  const publishedPosts = postsData.filter((p) => p.status === 'published').length
  const draftPosts = postsData.filter((p) => p.status === 'draft').length

  const assetsData = getValue(assets as PromiseSettledResult<{ data: { size_bytes: number }[] | null }>, [])
  const totalSizeBytes = assetsData.reduce((s, a) => s + (a.size_bytes || 0), 0)
  const totalSizeGB = (totalSizeBytes / 1024 / 1024 / 1024).toFixed(2)

  return NextResponse.json({
    stats: {
      projects: getCount(projects as PromiseSettledResult<{ count: number | null }>),
      posts: publishedPosts,
      draftPosts,
      unreadMessages: getCount(messages as PromiseSettledResult<{ count: number | null }>),
      assets: assetsData.length,
      assetsSizeGB: totalSizeGB,
      visitors30d: getCount(visitors as PromiseSettledResult<{ count: number | null }>),
      unresolvedSecurityEvents: getCount(secEvents as PromiseSettledResult<{ count: number | null }>),
    },
    recentActivity: getValue(
      recentActivity as PromiseSettledResult<{
        data: {
          id: string
          action: string
          resource: string
          resource_id: string | null
          outcome: string
          metadata: Record<string, unknown>
          created_at: string
        }[] | null
      }>,
      []
    ),
  })
}
