import { NextResponse } from 'next/server'
import { requireAnyAdminPermission } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_portfolio', 'view_portfolio'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 })
  const { data, error } = await supabase
    .from('learning_story')
    .select('id, year, title, title_th, description, description_th, type, icon, sort_order')
    .order('sort_order', { ascending: true })
    .order('year', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ story: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_portfolio', 'edit_portfolio'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 })
  const { id, year, title, title_th, description, description_th, type, icon, sort_order } = await request.json()
  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })
  const payload = {
    year: String(year || new Date().getFullYear()),
    title: title.trim(),
    title_th: title_th?.trim() || null,
    description: description?.trim() || null,
    description_th: description_th?.trim() || null,
    type: type?.trim() || 'achievement',
    icon: icon?.trim() || null,
    sort_order: sort_order ?? 0,
  }
  if (id) {
    const { data, error } = await supabase.from('learning_story').update(payload).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ entry: data })
  }
  const { data, error } = await supabase.from('learning_story').insert(payload).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}

export async function DELETE(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_portfolio', 'delete_portfolio'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 })
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabase.from('learning_story').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
