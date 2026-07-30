import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const LOGO_SOURCES = [
  { bucket: 'portfolio', path: 'images/Tes-D.png' },
  { bucket: 'portfolio', path: 'branding/Tes-D.png' },
  { bucket: 'general', path: 'images/Tes-D.png' },
  { bucket: 'general', path: 'Tes-D.png' },
]

async function githubAvatarFallback() {
  try {
    const profile = await fetch('https://api.github.com/users/Centered101', {
      headers: { Accept: 'application/vnd.github+json' },
      next: { revalidate: 300 },
    })
    const json = await profile.json()
    const avatarUrl = typeof json?.avatar_url === 'string'
      ? json.avatar_url
      : 'https://github.com/Centered101.png?size=256'

    const avatar = await fetch(avatarUrl, { next: { revalidate: 300 } })
    if (!avatar.ok) return null

    const headers = new Headers()
    headers.set('Content-Type', avatar.headers.get('Content-Type') || 'image/png')
    headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400')
    headers.set('X-Content-Type-Options', 'nosniff')

    return new NextResponse(await avatar.arrayBuffer(), { headers })
  } catch {
    return null
  }
}

export async function GET() {
  const supabase = createAdminClient()
  if (supabase) {
    for (const source of LOGO_SOURCES) {
      const { data, error } = await supabase.storage.from(source.bucket).download(source.path)
      if (error || !data) continue

      const headers = new Headers()
      headers.set('Content-Type', data.type || 'image/png')
      headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400')
      headers.set('X-Content-Type-Options', 'nosniff')
      return new NextResponse(data, { headers })
    }
  }

  const githubAvatar = await githubAvatarFallback()
  if (githubAvatar) return githubAvatar

  return NextResponse.json({ error: 'Logo file not found' }, { status: 404 })
}
