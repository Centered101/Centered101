import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ProjectPosterPayload = {
  repo_name?: string
  poster_url?: string
  enabled?: boolean
}

const POSTER_BUCKET = process.env.SUPABASE_PORTFOLIO_BUCKET || 'portfolio'
const MAX_POSTER_SIZE = 8 * 1024 * 1024
const POSTER_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]
const POSTER_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'svg', 'ico']

function isAuthorized(request: Request) {
  const token = process.env.ADMIN_DASHBOARD_TOKEN || process.env.ADMIN_TOKEN
  const providedToken = request.headers.get('x-admin-token') || ''

  return Boolean(token && providedToken && token === providedToken)
}

function cleanFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function ensurePosterBucket(supabase: NonNullable<ReturnType<typeof createAdminClient>>) {
  const { data: bucket } = await supabase.storage.getBucket(POSTER_BUCKET)

  if (!bucket) {
    const { error } = await supabase.storage.createBucket(POSTER_BUCKET, {
      public: true,
      fileSizeLimit: MAX_POSTER_SIZE,
      allowedMimeTypes: POSTER_MIME_TYPES,
    })

    if (error && !error.message.toLowerCase().includes('already exists')) {
      throw error
    }

    return
  }

  if (!bucket.public) {
    const { error } = await supabase.storage.updateBucket(POSTER_BUCKET, {
      public: true,
      fileSizeLimit: MAX_POSTER_SIZE,
      allowedMimeTypes: POSTER_MIME_TYPES,
    })

    if (error) {
      throw error
    }
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase admin client is not configured' }, { status: 503 })
  }

  const { data, error } = await supabase
    .from('portfolio_project_posters')
    .select('repo_name, poster_url, enabled, updated_at')
    .order('repo_name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ posters: data || [] })
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase admin client is not configured' }, { status: 503 })
  }

  const contentType = request.headers.get('content-type') || ''
  let repoName = ''
  let posterUrl = ''
  let enabled = true

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const file = formData.get('file')
    repoName = String(formData.get('repo_name') || '').trim()
    enabled = String(formData.get('enabled') || 'true') !== 'false'

    if (!repoName || !file || typeof file === 'string') {
      return NextResponse.json({ error: 'Repo name and poster file are required' }, { status: 400 })
    }

    const extension = cleanFileName(file.name.split('.').pop() || 'png')
    const isAllowedMime = POSTER_MIME_TYPES.includes(file.type)
    const isAllowedExtension = POSTER_EXTENSIONS.includes(extension)

    if (!isAllowedMime && !isAllowedExtension) {
      return NextResponse.json({ error: 'Poster must be png, jpg, webp, avif, svg, or ico' }, { status: 400 })
    }

    if (file.size > MAX_POSTER_SIZE) {
      return NextResponse.json({ error: 'Poster file is too large. Max size is 8MB' }, { status: 400 })
    }

    try {
      await ensurePosterBucket(supabase)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Supabase storage bucket is not ready'
      return NextResponse.json({ error: message }, { status: 500 })
    }

    const safeRepoName = cleanFileName(repoName) || 'project'
    const filePath = `project-posters/${safeRepoName}-${Date.now()}.${extension}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(POSTER_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type || (extension === 'ico' ? 'image/x-icon' : 'application/octet-stream'),
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage
      .from(POSTER_BUCKET)
      .getPublicUrl(filePath)

    posterUrl = publicUrlData.publicUrl
  } else {
    const payload = (await request.json()) as ProjectPosterPayload
    repoName = payload.repo_name?.trim() || ''
    posterUrl = payload.poster_url?.trim() || ''
    enabled = payload.enabled ?? true
  }

  if (!repoName || !posterUrl) {
    return NextResponse.json({ error: 'Repo name and poster URL are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('portfolio_project_posters')
    .upsert(
      {
        repo_name: repoName,
        poster_url: posterUrl,
        enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'repo_name' }
    )
    .select('repo_name, poster_url, enabled, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ poster: data })
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const repoName = url.searchParams.get('repo_name')?.trim()

  if (!repoName) {
    return NextResponse.json({ error: 'Repo name is required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase admin client is not configured' }, { status: 503 })
  }

  const { error } = await supabase
    .from('portfolio_project_posters')
    .delete()
    .eq('repo_name', repoName)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
