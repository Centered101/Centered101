'use client'

import { usePageTitle } from '@/lib/hooks/use-page-title'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Archive, ChevronDown, ChevronRight, Copy, ExternalLink,
  File, FileCode, FileText, FileVideo, Folder, Globe,
  HardDrive, Image, Lock, Loader2, Music, RefreshCw, Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { useAdminApi } from '@/lib/hooks/useAdminApi'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { AdminPageContainer, AdminPageHeader } from '@/components/admin/AdminPage'
import { cn } from '@/lib/utils'

type BucketInfo = {
  id: string
  name: string
  public: boolean
  fileSizeLimit: number | null
  allowedMimeTypes: string[] | null
  createdAt: string
  fileCount: number
  folderCount: number
  totalBytes: number
  totalMB: number
}

type FileItem = {
  name: string
  path: string
  id: string | null
  size: number
  mimeType: string
  lastModified: string
  isFolder: boolean
  url: string
}

type BucketsData = { buckets: BucketInfo[]; files: FileItem[]; activeBucket: string | null }
type BucketFilesData = { buckets: BucketInfo[]; files: FileItem[]; activeBucket: string | null }

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function FileIcon({ mime, isFolder }: { mime: string; isFolder?: boolean }) {
  const cls = 'size-3.5 shrink-0'
  if (isFolder) return <Folder className={cls} style={{ color: '#F59E0B' }} />
  if (mime.startsWith('image/')) return <Image className={cls} style={{ color: '#409EFE' }} />
  if (mime === 'application/pdf') return <FileText className={cls} style={{ color: '#EF4444' }} />
  if (mime.includes('zip') || mime.includes('gzip')) return <Archive className={cls} style={{ color: '#F59E0B' }} />
  if (mime.startsWith('video/')) return <FileVideo className={cls} style={{ color: '#A855F7' }} />
  if (mime.startsWith('audio/')) return <Music className={cls} style={{ color: '#22C55E' }} />
  if (mime.startsWith('text/') || mime.includes('json')) return <FileCode className={cls} style={{ color: '#A1A1AA' }} />
  return <File className={cls} style={{ color: '#52525b' }} />
}

const BUCKET_COLORS: Record<string, string> = {
  public: '#22C55E',
  content: '#409EFE',
  projects: '#A855F7',
  backups: '#F59E0B',
}
function bucketColor(name: string) {
  return BUCKET_COLORS[name] ?? '#52525b'
}

function copyUrl(url: string) {
  navigator.clipboard.writeText(url)
  toast.success('URL copied')
}

// ---------- per-bucket section ----------
function BucketSection({ bucket, onUpload }: { bucket: BucketInfo; onUpload: (bucketName: string) => void }) {
  const [open, setOpen] = useState(true)
  const { data, loading } = useAdminApi<BucketFilesData>(
    `/api/admin/storage?bucket=${encodeURIComponent(bucket.name)}`
  )
  const files = data?.files ?? []
  const color = bucketColor(bucket.name)
  const pct = bucket.totalMB > 0 ? Math.min((bucket.totalMB / 1024) * 100, 100) : 0

  return (
    <div className="rounded-xl border border-[#27272A] bg-[#18181B] overflow-hidden">
      {/* Bucket header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[#27272A]/30"
      >
        <div
          className="grid size-9 shrink-0 place-items-center rounded-lg"
          style={{ backgroundColor: color + '18', color }}
        >
          <HardDrive className="size-4" />
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-[#FAFAFA]">{bucket.name}</span>
              <span
                className="flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  borderColor: bucket.public ? '#22C55E33' : '#52525b33',
                  color: bucket.public ? '#22C55E' : '#52525b',
                  backgroundColor: bucket.public ? '#22C55E0d' : 'transparent',
                }}
              >
                {bucket.public ? <Globe className="size-2.5" /> : <Lock className="size-2.5" />}
                {bucket.public ? 'Public' : 'Private'}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-[#52525b]">
              {bucket.fileCount} files · {bucket.folderCount} folders · {formatBytes(bucket.totalBytes)}
              {bucket.fileSizeLimit ? ` · max ${formatBytes(bucket.fileSizeLimit)}/file` : ''}
            </p>
          </div>

          {/* Usage bar */}
          <div className="hidden flex-1 max-w-32 sm:block">
            <div className="h-1 overflow-hidden rounded-full bg-[#27272A]">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onUpload(bucket.name) }}
            className="hidden h-7 items-center gap-1.5 rounded-lg border border-[#27272A] bg-[#09090B] px-2.5 text-[11px] text-[#A1A1AA] transition-colors hover:border-[#409EFE]/30 hover:text-[#409EFE] sm:flex"
          >
            <Upload className="size-3" />
            Upload
          </button>
          {open
            ? <ChevronDown className="size-4 text-[#3f3f46]" />
            : <ChevronRight className="size-4 text-[#3f3f46]" />}
        </div>
      </div>

      {/* File list */}
      {open && (
        <div className="border-t border-[#27272A]">
          {loading ? (
            <div className="flex h-20 items-center justify-center gap-2 text-[12px] text-[#52525b]">
              <Loader2 className="size-3.5 animate-spin" />
              Loading files...
            </div>
          ) : files.length === 0 ? (
            <div className="flex h-20 items-center justify-center text-[12px] text-[#3f3f46]">
              Bucket is empty
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-150 text-left">
                <thead>
                  <tr className="border-b border-[#27272A] text-[10px] font-semibold uppercase tracking-widest text-[#3f3f46]">
                    <th className="px-5 py-2.5">Path</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Size</th>
                    <th className="px-4 py-2.5">Modified</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]/40">
                  {files.map((f) => {
                    const depth = f.path.split('/').length - 1
                    return (
                    <tr key={f.path} className={cn('transition-colors hover:bg-[#27272A]/20', f.isFolder && 'bg-[#27272A]/10')}>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 16}px` }}>
                          <FileIcon mime={f.mimeType} isFolder={f.isFolder} />
                          <span className="max-w-60 truncate font-mono text-xs text-[#A1A1AA]">{f.name}</span>
                          {depth > 0 && (
                            <span className="truncate font-mono text-[10px] text-[#3f3f46]">in {f.path.split('/').slice(0, -1).join('/')}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-[#52525b]">
                        {f.isFolder ? 'folder' : (f.mimeType || '—')}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[#52525b]">
                        {f.isFolder ? '—' : formatBytes(f.size)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[#52525b]">
                        {f.lastModified
                          ? new Date(f.lastModified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {!f.isFolder && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => copyUrl(f.url)}
                            className="grid size-7 place-items-center rounded-lg border border-[#27272A] text-[#52525b] hover:border-[#3f3f46] hover:text-[#A1A1AA]"
                            title="Copy URL"
                          >
                            <Copy className="size-3" />
                          </button>
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="grid size-7 place-items-center rounded-lg border border-[#27272A] text-[#52525b] hover:border-[#3f3f46] hover:text-[#A1A1AA]"
                            title="Open file"
                          >
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                        )}
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------- main page ----------
export default function StoragePage() {
  usePageTitle('Storage')
  const { getAdminHeaders } = useAdminAuth()
  const [uploading, setUploading] = useState(false)
  const [uploadTarget, setUploadTarget] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, loading, error, refetch } = useAdminApi<BucketsData>('/api/admin/storage')
  const buckets = data?.buckets ?? []
  const totalBytes = buckets.reduce((s, b) => s + b.totalBytes, 0)
  const totalFiles = buckets.reduce((s, b) => s + b.fileCount, 0)

  function handleUploadClick(bucketName: string) {
    setUploadTarget(bucketName)
    fileInputRef.current?.click()
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uploadTarget) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('bucket', uploadTarget)
      const res = await fetch('/api/admin/assets/upload', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: form,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      toast.success(`Uploaded "${file.name}" to ${uploadTarget}`)
      refetch()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploading(false)
      setUploadTarget(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading) return <AdminLoading message="Loading storage buckets..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  return (
    <AdminPageContainer>
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
      <AdminPageHeader
        title="Storage Buckets"
        description={`${buckets.length} buckets · ${totalFiles} files · ${formatBytes(totalBytes)}`}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={refetch}
          disabled={uploading}
          className={cn(
            'h-8 border-[#27272A] bg-[#18181B] text-xs text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA]',
            uploading && 'opacity-60'
          )}
        >
          {uploading
            ? <><Loader2 className="size-3.5 animate-spin" /> Uploading...</>
            : <RefreshCw className="size-3.5" />}
        </Button>
      </AdminPageHeader>

      {/* Buckets */}
      {buckets.length === 0 ? (
        <AdminEmpty
          title="No storage buckets"
          description="Create buckets in the Supabase Dashboard → Storage"
        />
      ) : (
        <div className="space-y-3">
          {buckets.map((b) => (
            <BucketSection key={b.id} bucket={b} onUpload={handleUploadClick} />
          ))}
        </div>
      )}
    </AdminPageContainer>
  )
}
