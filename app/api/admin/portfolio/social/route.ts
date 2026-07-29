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
  const { id, is_active, move, order } = await request.json()

  if (Array.isArray(order)) {
    const updates = order
      .filter((item) => item?.id)
      .map((item, index) => ({
        id: String(item.id),
        sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : (index + 1) * 100,
      }))

    if (updates.length === 0) return NextResponse.json({ error: 'order required' }, { status: 400 })

    const { data: maxRows, error: maxError } = await supabase
      .from('social_links')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)

    if (maxError) return NextResponse.json({ error: maxError.message }, { status: 500 })

    const maxOrder = Number(maxRows?.[0]?.sort_order ?? 0)
    const tempBase = Math.max(maxOrder, updates.length * 100) + 10000

    for (let index = 0; index < updates.length; index += 1) {
      const { error } = await supabase
        .from('social_links')
        .update({ sort_order: tempBase + index })
        .eq('id', updates[index].id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const savedLinks = []
    for (const item of updates) {
      const { data, error } = await supabase
        .from('social_links')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)
        .select('id, name, label, href, icon, is_active, sort_order')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      savedLinks.push(data)
    }

    return NextResponse.json({ links: savedLinks })
  }

  if (move && typeof move === 'object') {
    const moveId = String(move.id || '')
    const direction = move.direction === 'up' ? -1 : move.direction === 'down' ? 1 : 0
    if (!moveId || direction === 0) return NextResponse.json({ error: 'move id and direction required' }, { status: 400 })

    const { data: links, error: loadError } = await supabase
      .from('social_links')
      .select('id, sort_order')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })

    if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 })

    const ordered = links ?? []
    const currentIndex = ordered.findIndex((link) => link.id === moveId)
    const targetIndex = currentIndex + direction
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
      return NextResponse.json({ links: ordered })
    }

    const current = ordered[currentIndex]
    const target = ordered[targetIndex]
    const numericOrders = ordered.map((link, index) => Number(link.sort_order ?? index))
    let currentOrder = Number(current.sort_order ?? currentIndex)
    let targetOrder = Number(target.sort_order ?? targetIndex)

    if (currentOrder === targetOrder) {
      currentOrder = currentIndex * 100
      targetOrder = targetIndex * 100
    }

    const tempOrder = Math.max(...numericOrders, currentOrder, targetOrder, 0) + 10000

    const { error: firstError } = await supabase
      .from('social_links')
      .update({ sort_order: tempOrder })
      .eq('id', current.id)
    if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 })

    const { error: secondError } = await supabase
      .from('social_links')
      .update({ sort_order: currentOrder })
      .eq('id', target.id)
    if (secondError) return NextResponse.json({ error: secondError.message }, { status: 500 })

    const { error: thirdError } = await supabase
      .from('social_links')
      .update({ sort_order: targetOrder })
      .eq('id', current.id)
    if (thirdError) return NextResponse.json({ error: thirdError.message }, { status: 500 })

    return NextResponse.json({
      links: [
        { id: current.id, sort_order: targetOrder },
        { id: target.id, sort_order: currentOrder },
      ],
    })
  }

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
