import { NextResponse } from 'next/server'
import { requireAnyAdminPermission, writeAdminAuditLog } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_media', 'upload_media'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const url = new URL(request.url)
  const bucket = url.searchParams.get('bucket')

  let query = supabase
    .from('digital_assets')
    .select('id, name, file_path, public_url, mime_type, size_bytes, bucket, alt_text, created_at, updated_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (bucket) query = query.eq('bucket', bucket)

  const { data, error } = await query

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ assets: [], storageByBucket: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const assets = data ?? []

  // Calculate storage breakdown per bucket
  const bucketMap = new Map<string, { used: number; count: number }>()
  for (const asset of assets) {
    const b = bucketMap.get(asset.bucket) ?? { used: 0, count: 0 }
    b.used += asset.size_bytes || 0
    b.count += 1
    bucketMap.set(asset.bucket, b)
  }

  const storageByBucket = Array.from(bucketMap.entries()).map(([name, info]) => ({
    bucket: name,
    usedBytes: info.used,
    usedGB: parseFloat((info.used / 1024 / 1024 / 1024).toFixed(3)),
    count: info.count,
  }))

  return NextResponse.json({ assets, storageByBucket })
}

export async function DELETE(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_media', 'delete_media'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const url = new URL(request.url)
  const id = url.searchParams.get('id')?.trim()
  if (!id) return NextResponse.json({ error: 'Asset id is required' }, { status: 400 })

  const { error } = await supabase
    .from('digital_assets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    await writeAdminAuditLog(request, auth, { action: 'asset.delete', resource: 'digital_assets', resourceId: id, outcome: 'failed', metadata: { error: error.message } })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await writeAdminAuditLog(request, auth, { action: 'asset.delete', resource: 'digital_assets', resourceId: id })
  return NextResponse.json({ ok: true })
}
