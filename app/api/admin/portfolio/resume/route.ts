import { NextResponse } from 'next/server'
import { requireAnyAdminPermission, writeAdminAuditLog } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'general'
const RESUME_PATH = 'Centered101-resume.pdf'
const DOWNLOAD_NAME = 'Centered101-resume.pdf'
const MAX_SIZE = 10 * 1024 * 1024

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

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 })
  }

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!isPdf) {
    return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const uploadResult = await supabase.storage.from(BUCKET).upload(RESUME_PATH, buffer, {
    contentType: 'application/pdf',
    upsert: true,
  })

  if (uploadResult.error) {
    console.error('Resume upload error:', uploadResult.error)
    await writeAdminAuditLog(request, auth, {
      action: 'portfolio.resume_upload',
      resource: 'storage',
      resourceId: `${BUCKET}/${RESUME_PATH}`,
      outcome: 'failed',
      metadata: { error: uploadResult.error.message },
    })

    return NextResponse.json({ error: uploadResult.error.message }, { status: 500 })
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(RESUME_PATH)

  await writeAdminAuditLog(request, auth, {
    action: 'portfolio.resume_upload',
    resource: 'storage',
    resourceId: `${BUCKET}/${RESUME_PATH}`,
    metadata: { size: file.size, name: file.name },
  })

  return NextResponse.json({
    path: RESUME_PATH,
    publicUrl: `${data.publicUrl}?download=${DOWNLOAD_NAME}`,
  })
}
