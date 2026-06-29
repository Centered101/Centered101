import { NextResponse } from 'next/server'
import { requireAnyAdminPermission, writeAdminAuditLog } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
const ALLOWED_BUCKETS = ['public', 'content', 'projects', 'backups'] as const

export async function POST(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_media', 'upload_media'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const bucket = (formData.get('bucket') as string | null) ?? 'public'
  const altText = (formData.get('alt_text') as string | null) ?? null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!ALLOWED_BUCKETS.includes(bucket as (typeof ALLOWED_BUCKETS)[number])) {
    return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File exceeds 50 MB limit' }, { status: 413 })
  }

  const ext = file.name.split('.').pop() ?? ''
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `${Date.now()}_${safeName}`

  const arrayBuffer = await file.arrayBuffer()
  const fileBuffer = new Uint8Array(arrayBuffer)

  const { error: storageError } = await supabase.storage
    .from(bucket)
    .upload(filePath, fileBuffer, { contentType: file.type, upsert: false })

  if (storageError) {
    console.error('Storage upload error:', storageError.message, '| bucket:', bucket, '| path:', filePath)
    return NextResponse.json({ error: storageError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath)

  const { data: asset, error: dbError } = await supabase
    .from('digital_assets')
    .insert({
      name: file.name,
      file_path: filePath,
      public_url: urlData?.publicUrl ?? null,
      mime_type: file.type || `application/${ext}`,
      size_bytes: file.size,
      bucket,
      alt_text: altText,
      uploaded_by: auth.adminUserId ?? null,
    })
    .select()
    .single()

  if (dbError) {
    // File uploaded to storage but DB insert failed — log but don't block
    console.warn('Asset DB insert failed after storage upload:', dbError.message)
  }

  await writeAdminAuditLog(request, auth, {
    action: 'asset.upload',
    resource: 'digital_assets',
    resourceId: asset?.id,
    metadata: { name: file.name, bucket, size_bytes: file.size },
  })

  return NextResponse.json({ asset: asset ?? { name: file.name, file_path: filePath, bucket } })
}
