import { NextResponse } from 'next/server'
import { requireAnyAdminPermission } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

type SearchResult = {
  id: string
  type: 'user' | 'project' | 'message' | 'log'
  title: string
  description: string
  href: string
}

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['view_logs', 'manage_settings', 'manage_users', 'manage_projects'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json({ results: [] })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ results: [] })

  const like = `%${q}%`

  const [users, projects, messages, logs] = await Promise.allSettled([
    supabase
      .from('admin_users')
      .select('id, email, github_username, display_name')
      .or(`email.ilike.${like},github_username.ilike.${like},display_name.ilike.${like}`)
      .limit(4),
    supabase
      .from('portfolio_projects')
      .select('id, title, slug, short_description, status')
      .or(`title.ilike.${like},short_description.ilike.${like},slug.ilike.${like}`)
      .limit(4),
    supabase
      .from('contact_messages')
      .select('id, name, email, subject')
      .or(`name.ilike.${like},email.ilike.${like},subject.ilike.${like}`)
      .limit(4),
    supabase
      .from('admin_audit_log')
      .select('id, action, resource, created_at')
      .or(`action.ilike.${like},resource.ilike.${like}`)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const results: SearchResult[] = []

  if (users.status === 'fulfilled' && users.value.data) {
    for (const u of users.value.data) {
      results.push({
        id: `user-${u.id}`,
        type: 'user',
        title: u.display_name || u.github_username || u.email || 'Unknown',
        description: u.email || u.github_username || '',
        href: '/admin/users',
      })
    }
  }

  if (projects.status === 'fulfilled' && projects.value.data) {
    for (const p of projects.value.data) {
      results.push({
        id: `project-${p.id}`,
        type: 'project',
        title: p.title,
        description: p.short_description || p.status || p.slug || '',
        href: '/admin/projects',
      })
    }
  }

  if (messages.status === 'fulfilled' && messages.value.data) {
    for (const m of messages.value.data) {
      results.push({
        id: `message-${m.id}`,
        type: 'message',
        title: m.name,
        description: m.subject || m.email || '',
        href: '/admin/business',
      })
    }
  }

  if (logs.status === 'fulfilled' && logs.value.data) {
    for (const l of logs.value.data) {
      results.push({
        id: `log-${l.id}`,
        type: 'log',
        title: l.action,
        description: l.resource || '',
        href: '/admin/logs',
      })
    }
  }

  return NextResponse.json({ results })
}
