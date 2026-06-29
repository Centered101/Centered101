import { NextResponse } from 'next/server'
import { requireAnyAdminPermission } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_portfolio', 'view_portfolio'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 })
  const { data, error } = await supabase
    .from('social_links')
    .select('id, name, label, href, icon, is_active, sort_order')
    .order('sort_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ links: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_portfolio', 'edit_portfolio'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 })
  const { id, name, label, href, icon, is_active, sort_order } = await request.json()
  if (!href?.trim()) return NextResponse.json({ error: 'href required' }, { status: 400 })
  const payload = {
    name: name?.trim() || '',
    label: label?.trim() || '',
    href: href.trim(),
    icon: icon?.trim() || null,
    is_active: is_active ?? true,
    sort_order: sort_order ?? 0,
  }
  if (id) {
    const { data, error } = await supabase.from('social_links').update(payload).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ link: data })
  }
  const { data, error } = await supabase.from('social_links').insert(payload).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ link: data })
}

export async function PATCH(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_portfolio', 'edit_portfolio'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 })
  const { id, is_active } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { data, error } = await supabase.from('social_links').update({ is_active }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ link: data })
}

export async function DELETE(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_portfolio', 'delete_portfolio'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 })
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabase.from('social_links').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
