import { NextResponse } from 'next/server'
import { requireAnyAdminPermission } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const KNOWN_TABLES = [
  // Portfolio
  { name: 'portfolio_projects', category: 'portfolio' },
  { name: 'portfolio_tools', category: 'portfolio' },
  { name: 'learning_story', category: 'portfolio' },
  { name: 'social_links', category: 'portfolio' },
  // Content
  { name: 'blog_posts', category: 'content' },
  { name: 'digital_assets', category: 'content' },
  { name: 'contact_messages', category: 'content' },
  // Analytics
  { name: 'portfolio_analytics', category: 'analytics' },
  { name: 'visitor_logs', category: 'analytics' },
  // Auth / RBAC
  { name: 'admin_users', category: 'auth' },
  { name: 'roles', category: 'auth' },
  { name: 'permissions', category: 'auth' },
  { name: 'role_permissions', category: 'auth' },
  { name: 'user_roles', category: 'auth' },
  // Security
  { name: 'audit_logs', category: 'security' },
  { name: 'login_logs', category: 'security' },
  { name: 'security_events', category: 'security' },
  { name: 'user_sessions', category: 'security' },
  // GitHub
  { name: 'github_profiles', category: 'github' },
  { name: 'github_repositories', category: 'github' },
  // Platform
  { name: 'subdomains', category: 'platform' },
  { name: 'system_settings', category: 'platform' },
] as const

type KnownTableName = (typeof KNOWN_TABLES)[number]['name']
const KNOWN_TABLE_NAMES = new Set<KnownTableName>(KNOWN_TABLES.map((t) => t.name))

function isKnownTable(t: string): t is KnownTableName {
  return (KNOWN_TABLE_NAMES as Set<string>).has(t)
}

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_database', 'view_logs'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const url = new URL(request.url)
  const table = url.searchParams.get('table')?.trim()

  // Row fetch mode: ?table=X&limit=Y
  if (table) {
    if (!isKnownTable(table)) {
      return NextResponse.json({ error: 'Unknown table' }, { status: 400 })
    }
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 100)
    const { data, error } = await supabase.from(table).select('*').limit(limit)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ rows: data ?? [], table, count: data?.length ?? 0 })
  }

  // Stats mode (default)
  const results = await Promise.allSettled(
    KNOWN_TABLES.map(async (t) => {
      const { count, error } = await supabase
        .from(t.name)
        .select('*', { count: 'exact', head: true })
      return {
        name: t.name,
        category: t.category,
        rows: error ? null : (count ?? 0),
        accessible: !error,
      }
    })
  )

  const tables = results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value
    return { name: KNOWN_TABLES[i].name, category: KNOWN_TABLES[i].category, rows: null, accessible: false }
  })

  return NextResponse.json({ tables })
}
