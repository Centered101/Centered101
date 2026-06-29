import { NextResponse } from 'next/server'
import { requireAnyAdminPermission } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

type RawItem = {
  name: string
  id: string | null
  metadata?: { size?: number; mimetype?: string } | null
  updated_at?: string | null
  created_at?: string | null
}

type FileEntry = {
  name: string
  path: string
  id: string | null
  size: number
  mimeType: string
  lastModified: string
  isFolder: boolean
  url: string
}

async function listPath(
  supabase: SupabaseClient,
  bucket: string,
  prefix: string,
  depth = 0
): Promise<FileEntry[]> {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 500,
    sortBy: { column: 'name', order: 'asc' },
  })
  if (error || !data) return []

  const results: FileEntry[] = []

  for (const item of data as RawItem[]) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name
    const isFolder = item.id === null

    if (isFolder) {
      results.push({
        name: item.name,
        path: fullPath,
        id: null,
        size: 0,
        mimeType: '',
        lastModified: item.updated_at ?? item.created_at ?? '',
        isFolder: true,
        url: '',
      })
      // Recurse into subfolder (max 3 levels deep)
      if (depth < 3) {
        const children = await listPath(supabase, bucket, fullPath, depth + 1)
        results.push(...children)
      }
    } else {
      const size = item.metadata?.size ?? 0
      results.push({
        name: item.name,
        path: fullPath,
        id: item.id,
        size,
        mimeType: item.metadata?.mimetype ?? '',
        lastModified: item.updated_at ?? item.created_at ?? '',
        isFolder: false,
        url: supabase.storage.from(bucket).getPublicUrl(fullPath).data.publicUrl,
      })
    }
  }

  return results
}

export async function GET(request: Request) {
  const auth = await requireAnyAdminPermission(request, ['manage_media', 'upload_media', 'view_logs'])
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const { data: rawBuckets, error: bucketsError } = await supabase.storage.listBuckets()
  if (bucketsError) return NextResponse.json({ error: bucketsError.message }, { status: 500 })

  const url = new URL(request.url)
  const activeBucket = url.searchParams.get('bucket')

  // Bucket stats: shallow list (root only) for fast counts
  const bucketsWithStats = await Promise.all(
    (rawBuckets ?? []).map(async (bucket) => {
      const { data: rootItems } = await supabase.storage.from(bucket.name).list('', { limit: 1000 })
      const items = rootItems ?? []
      const files = items.filter((f) => f.id !== null)
      const folders = items.filter((f) => f.id === null)
      const rootBytes = files.reduce((s, f) => s + ((f as RawItem).metadata?.size ?? 0), 0)

      return {
        id: bucket.id,
        name: bucket.name,
        public: bucket.public,
        fileSizeLimit: bucket.file_size_limit,
        allowedMimeTypes: bucket.allowed_mime_types,
        createdAt: bucket.created_at,
        fileCount: files.length,
        folderCount: folders.length,
        totalBytes: rootBytes,
        totalMB: parseFloat((rootBytes / 1024 / 1024).toFixed(2)),
      }
    })
  )

  // Deep file listing for selected bucket
  let files: FileEntry[] = []
  if (activeBucket) {
    files = await listPath(supabase, activeBucket, '')
  }

  return NextResponse.json({ buckets: bucketsWithStats, files, activeBucket })
}
