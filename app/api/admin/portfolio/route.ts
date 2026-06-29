import { NextResponse } from 'next/server'
import { requireAnyAdminPermission } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_portfolio', 'view_portfolio'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const [tools, story, links] = await Promise.allSettled([
    supabase
      .from('portfolio_tools')
      .select('id, name, category, icon, sort_order, created_at')
      .order('sort_order', { ascending: true }),
    supabase
      .from('learning_story')
      .select('id, year, title, title_th, description, description_th, type, icon, sort_order, created_at')
      .order('sort_order', { ascending: true }),
    supabase
      .from('social_links')
      .select('id, name, label, href, icon, sort_order, is_active, created_at, updated_at')
      .order('sort_order', { ascending: true }),
  ])

  return NextResponse.json({
    tools: tools.status === 'fulfilled' ? (tools.value.data ?? []) : [],
    learningStory: story.status === 'fulfilled' ? (story.value.data ?? []) : [],
    socialLinks: links.status === 'fulfilled' ? (links.value.data ?? []) : [],
  })
}
