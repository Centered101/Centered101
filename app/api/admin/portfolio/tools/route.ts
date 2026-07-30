import { NextResponse } from 'next/server'
import { requireAnyAdminPermission } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPortfolioToolGroup } from '@/lib/portfolio/tool-groups'

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_portfolio', 'view_portfolio'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 })
  const { data, error } = await supabase
    .from('portfolio_tools')
    .select('id, name, category, icon, sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tools: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_portfolio', 'edit_portfolio'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 })
  const { id, name, category, icon, sort_order } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const cleanName = name.trim()
  const cleanCategory = category?.trim() || getPortfolioToolGroup({ name: cleanName })
  if (id) {
    const { data, error } = await supabase
      .from('portfolio_tools')
      .update({ name: cleanName, category: cleanCategory, icon: icon?.trim() || null, sort_order: sort_order ?? 0 })
      .eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ tool: data })
  }
  const { data, error } = await supabase
    .from('portfolio_tools')
    .insert({ name: cleanName, category: cleanCategory, icon: icon?.trim() || null, sort_order: sort_order ?? 0 })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tool: data })
}

export async function PATCH(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_portfolio', 'edit_portfolio'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 })
  const { order } = await request.json() as { order?: { id: string; sort_order?: number }[] }

  if (!Array.isArray(order) || order.length === 0) {
    return NextResponse.json({ error: 'order required' }, { status: 400 })
  }

  const savedTools = []
  for (const item of order) {
    if (!item.id) continue
    const { data, error } = await supabase
      .from('portfolio_tools')
      .update({ sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : 0 })
      .eq('id', item.id)
      .select('id, name, category, icon, sort_order')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    savedTools.push(data)
  }

  return NextResponse.json({ tools: savedTools })
}

export async function DELETE(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_portfolio', 'delete_portfolio'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 })
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabase.from('portfolio_tools').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
