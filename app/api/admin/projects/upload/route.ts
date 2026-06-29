import { NextResponse } from 'next/server'
import { requireAnyAdminPermission, writeAdminAuditLog } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = process.env.SUPABASE_PORTFOLIO_BUCKET || 'portfolio-projects'

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'application/octet-stream',
])

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'application/octet-stream': 'ico',
}

function safeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function ensureBucket(supabase: NonNullable<ReturnType<typeof createAdminClient>>) {
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
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
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message || fallback)
  }

  return fallback
}

export async function POST(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_portfolio', 'manage_media', 'upload_media'])
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase admin client is not configured' }, { status: 503 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  const slug = safeName(String(formData.get('slug') || 'project'))

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 })
  }

  const inferredExtension = safeName(file.name.split('.').pop() || '')
  const contentType = file.type || (inferredExtension === 'svg' ? 'image/svg+xml' : inferredExtension === 'ico' ? 'image/x-icon' : '')

  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json({ error: 'Only image files are allowed, including svg and ico' }, { status: 400 })
  }

  const extension = EXTENSION_BY_TYPE[contentType] || inferredExtension || 'img'
  const baseName = safeName(file.name.replace(/\.[^.]+$/, '')) || 'poster'
  const filePath = `projects/${slug || 'project'}/${Date.now()}-${baseName}.${extension}`
  const buffer = Buffer.from(await file.arrayBuffer())

  let uploadResult = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType,
      upsert: false,
    })

  if (uploadResult.error && isMissingBucketError(uploadResult.error)) {
    try {
      await ensureBucket(supabase)
      uploadResult = await supabase.storage
        .from(BUCKET)
        .upload(filePath, buffer, {
          contentType,
          upsert: false,
        })
    } catch (error) {
      const message = errorMessage(error, 'Failed to prepare Supabase storage bucket')
      console.error('Portfolio project poster bucket error:', error)
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  if (uploadResult.error) {
    console.error('Portfolio project poster upload error:', uploadResult.error)
    await writeAdminAuditLog(request, auth, {
      action: 'portfolio_project.poster_upload',
      resource: 'storage',
      resourceId: filePath,
      outcome: 'failed',
      metadata: { slug, bucket: BUCKET, error: uploadResult.error.message },
    })

    return NextResponse.json({ error: uploadResult.error.message }, { status: 500 })
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath)

  await writeAdminAuditLog(request, auth, {
    action: 'portfolio_project.poster_upload',
    resource: 'storage',
    resourceId: filePath,
    metadata: { slug, bucket: BUCKET, contentType },
  })

  return NextResponse.json({
    path: filePath,
    publicUrl: data.publicUrl,
  })
}
