import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DOWNLOAD_NAME = 'Centered101-resume.pdf'
const RESUME_SOURCES = [
  { bucket: 'portfolio', path: 'resume/Centered101-resume.pdf' },
  { bucket: 'general', path: 'Centered101-resume.pdf' },
]

export async function GET(request: Request) {
  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase admin client is not configured' }, { status: 503 })
  }

  for (const source of RESUME_SOURCES) {
    const { data, error } = await supabase.storage.from(source.bucket).download(source.path)
    if (error || !data) continue

    const headers = new Headers()
    headers.set('Content-Type', 'application/pdf')
    headers.set('Cache-Control', 'no-store')
    headers.set('X-Content-Type-Options', 'nosniff')

    const url = new URL(request.url)
    const disposition = url.searchParams.get('download') === '1' ? 'attachment' : 'inline'
    headers.set('Content-Disposition', `${disposition}; filename="${DOWNLOAD_NAME}"`)

    return new NextResponse(data, { headers })
  }

  return NextResponse.json({ error: 'Resume file not found' }, { status: 404 })
}
