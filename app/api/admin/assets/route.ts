import { NextResponse } from 'next/server'
import { requireAdminOwner, requireAnyAdminPermission, writeAdminAuditLog } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const STORAGE_PUBLIC_PATH = '/storage/v1/object/public/'

function parsePublicStorageUrl(value: string) {
  try {
    const url = new URL(value)
    const index = url.pathname.indexOf(STORAGE_PUBLIC_PATH)
    if (index === -1) return null

    const tail = url.pathname.slice(index + STORAGE_PUBLIC_PATH.length)
    const [bucket, ...pathParts] = tail.split('/').map((part) => decodeURIComponent(part))
    const filePath = pathParts.join('/')
    if (!bucket || !filePath) return null
    return { bucket, filePath }
  } catch {
    return null
  }
}

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
  const auth = await requireAnyAdminPermission(request, ['manage_portfolio', 'manage_media', 'delete_media'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const url = new URL(request.url)
  const id = url.searchParams.get('id')?.trim()
  const publicUrl = url.searchParams.get('public_url')?.trim()

  if (publicUrl && !id) {
    const parsed = parsePublicStorageUrl(publicUrl)
    if (!parsed) return NextResponse.json({ error: 'Invalid public storage URL' }, { status: 400 })
    if (!['public', 'portfolio'].includes(parsed.bucket)) {
      return NextResponse.json({ error: 'Only public or portfolio bucket files can be deleted from this action' }, { status: 400 })
    }
    if (parsed.bucket === 'portfolio') {
      const ownerAuth = await requireAdminOwner(request)
      if (!ownerAuth) return NextResponse.json({ error: 'Owner role required' }, { status: 403 })
    }

    const { error: storageError } = await supabase.storage.from(parsed.bucket).remove([parsed.filePath])
    if (storageError) {
      await writeAdminAuditLog(request, auth, {
        action: 'asset.storage_delete',
        resource: 'storage',
        resourceId: parsed.filePath,
        outcome: 'failed',
        metadata: { bucket: parsed.bucket, error: storageError.message },
      })
      return NextResponse.json({ error: storageError.message }, { status: 500 })
    }

    await supabase
      .from('digital_assets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('bucket', parsed.bucket)
      .eq('file_path', parsed.filePath)

    await writeAdminAuditLog(request, auth, {
      action: 'asset.storage_delete',
      resource: 'storage',
      resourceId: parsed.filePath,
      metadata: { bucket: parsed.bucket, public_url: publicUrl },
    })

    return NextResponse.json({ ok: true, bucket: parsed.bucket, file_path: parsed.filePath })
  }

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
