import { NextResponse } from 'next/server'
import { requireAnyAdminPermission, writeAdminAuditLog } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
const ALLOWED_BUCKETS = ['portfolio'] as const

async function ensureBucket(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  bucket: string,
) {
  const { error } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: MAX_FILE_SIZE,
  })

  if (error && !error.message.toLowerCase().includes('already exists')) {
    throw error
  }
}

function isMissingBucketError(error: { message?: string; statusCode?: string | number } | null) {
  const message = error?.message?.toLowerCase() || ''
  const statusCode = String(error?.statusCode || '')
  return statusCode === '404' || message.includes('bucket not found') || message.includes('not found')
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message || fallback)
  }
  return fallback
}

export async function POST(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_portfolio', 'manage_media', 'upload_media'])
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
  const pathPrefixByBucket: Record<(typeof ALLOWED_BUCKETS)[number], string> = {
    portfolio: 'hero',
  }
  const filePath = `${pathPrefixByBucket[bucket as (typeof ALLOWED_BUCKETS)[number]]}/${Date.now()}_${safeName}`

  const arrayBuffer = await file.arrayBuffer()
  const fileBuffer = new Uint8Array(arrayBuffer)

  let uploadResult = await supabase.storage
    .from(bucket)
    .upload(filePath, fileBuffer, { contentType: file.type, upsert: false })

  if (uploadResult.error && isMissingBucketError(uploadResult.error)) {
    try {
      await ensureBucket(supabase, bucket)
      uploadResult = await supabase.storage
        .from(bucket)
        .upload(filePath, fileBuffer, { contentType: file.type, upsert: false })
    } catch (error) {
      const message = errorMessage(error, 'Failed to prepare Supabase storage bucket')
      console.error('Storage bucket prepare error:', error, '| bucket:', bucket)
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  const storageError = uploadResult.error
  if (storageError) {
    console.error('Storage upload error:', storageError, '| bucket:', bucket, '| path:', filePath)
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

  return NextResponse.json({
    asset: asset ?? {
      name: file.name,
      file_path: filePath,
      public_url: urlData?.publicUrl ?? null,
      mime_type: file.type || `application/${ext}`,
      size_bytes: file.size,
      bucket,
      alt_text: altText,
    },
  })
}
