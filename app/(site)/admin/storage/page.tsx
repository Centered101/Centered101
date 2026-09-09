'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Archive,
  Copy,
  ExternalLink,
  File,
  FileCode,
  FileText,
  FileVideo,
  Folder,
  Globe,
  HardDrive,
  Image as ImageIcon,
  Lock,
  Loader2,
  Music,
  RefreshCw,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminEmpty, AdminError, AdminLoading } from '@/components/admin/AdminStates'
import { AdminPageContainer, AdminPageHeader, AdminPageSection } from '@/components/admin/AdminPage'
import { useAdminApi } from '@/lib/hooks/useAdminApi'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { usePageTitle } from '@/lib/hooks/use-page-title'
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

type StorageData = {
  buckets: BucketInfo[]
  files: FileItem[]
  activeBucket: string | null
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatDate(iso: string) {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function bucketColor(name: string) {
  if (name === 'portfolio') return '#409EFE'
  if (name === 'public') return '#22C55E'
  if (name === 'general') return '#A1A1AA'
  return '#84D4FA'
}

function fileIconClass(mime: string, isFolder?: boolean) {
  if (isFolder) return 'text-warning'
  if (mime.startsWith('image/')) return 'text-[var(--admin-accent)]'
  if (mime === 'application/pdf') return 'text-destructive'
  if (mime.includes('zip') || mime.includes('gzip')) return 'text-warning'
  if (mime.startsWith('video/')) return 'text-[#A855F7]'
  if (mime.startsWith('audio/')) return 'text-success'
  if (mime.startsWith('text/') || mime.includes('json')) return 'text-foreground-light'
  return 'text-foreground-muted'
}

function FileIcon({ mime, isFolder }: { mime: string; isFolder?: boolean }) {
  const className = cn('size-4 shrink-0', fileIconClass(mime, isFolder))
  if (isFolder) return <Folder className={className} />
  if (mime.startsWith('image/')) return <ImageIcon className={className} />
  if (mime === 'application/pdf') return <FileText className={className} />
  if (mime.includes('zip') || mime.includes('gzip')) return <Archive className={className} />
  if (mime.startsWith('video/')) return <FileVideo className={className} />
  if (mime.startsWith('audio/')) return <Music className={className} />
  if (mime.startsWith('text/') || mime.includes('json')) return <FileCode className={className} />
  return <File className={className} />
}

function copyUrl(url: string) {
  navigator.clipboard.writeText(url)
  toast.success('คัดลอก URL แล้ว')
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string | number
  detail: string
}) {
  return (
    <div className="rounded-lg border border-surface-300 bg-surface-100 p-3 sm:p-4">
      <p className="text-[11px] font-bold text-foreground-muted">{label}</p>
      <p className="mt-2 text-2xl font-black text-foreground">{value}</p>
      <p className="mt-1 truncate text-xs text-foreground-faint">{detail}</p>
    </div>
  )
}

function BucketButton({
  bucket,
  active,
  onClick,
}: {
  bucket: BucketInfo
  active: boolean
  onClick: () => void
}) {
  const color = bucketColor(bucket.name)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group w-full rounded-lg border p-3 text-left transition',
        active
          ? 'border-[var(--admin-accent)]/50 bg-[var(--admin-accent)]/10'
          : 'border-surface-300 bg-dash-canvas hover:border-surface-400 hover:bg-surface-200'
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-lg border border-surface-300"
          style={{ color, backgroundColor: `${color}18` }}
        >
          <HardDrive className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate font-mono text-sm font-black text-foreground">{bucket.name}</span>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold',
                bucket.public
                  ? 'border-success/25 bg-success/10 text-success'
                  : 'border-surface-400 bg-surface-100 text-foreground-muted'
              )}
            >
              {bucket.public ? <Globe className="size-2.5" /> : <Lock className="size-2.5" />}
              {bucket.public ? 'public' : 'private'}
            </span>
          </span>
          <span className="mt-1 block text-xs text-foreground-muted">
            {bucket.fileCount} ไฟล์ · {bucket.folderCount} โฟลเดอร์
          </span>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-300">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${Math.min((bucket.totalBytes / (1024 * 1024 * 1024)) * 100, 100)}%`,
                backgroundColor: color,
              }}
            />
          </span>
        </span>
      </div>
    </button>
  )
}

function FileRow({ file }: { file: FileItem }) {
  const folder = file.path.split('/').slice(0, -1).join('/')
  return (
    <div className="grid gap-3 border-b border-surface-300/60 px-3 py-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_180px_120px_120px] md:items-center md:px-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-surface-300 bg-dash-canvas">
          <FileIcon mime={file.mimeType} isFolder={file.isFolder} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-bold text-foreground">{file.name}</p>
          <p className="mt-0.5 truncate text-xs text-foreground-muted">
            {folder ? `ใน ${folder}` : file.path}
          </p>
        </div>
      </div>

      <div className="hidden truncate font-mono text-xs text-foreground-muted md:block">
        {file.isFolder ? 'folder' : file.mimeType || '-'}
      </div>
      <div className="hidden font-mono text-xs text-foreground-muted md:block">
        {file.isFolder ? '-' : formatBytes(file.size)}
      </div>
      <div className="flex items-center justify-between gap-3 md:justify-end">
        <span className="text-xs text-foreground-muted md:hidden">
          {file.isFolder ? 'folder' : formatBytes(file.size)}
        </span>
        <span className="hidden text-xs text-foreground-muted md:inline">{formatDate(file.lastModified)}</span>
        {!file.isFolder && (
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => copyUrl(file.url)}
              className="grid size-8 place-items-center rounded-lg border border-surface-300 bg-surface-100 text-foreground-muted transition hover:border-surface-400 hover:text-foreground"
              title="คัดลอก URL"
            >
              <Copy className="size-3.5" />
            </button>
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="grid size-8 place-items-center rounded-lg border border-surface-300 bg-surface-100 text-foreground-muted transition hover:border-surface-400 hover:text-foreground"
              title="เปิดไฟล์"
            >
              <ExternalLink className="size-3.5" />
            </a>
          </span>
        )}
      </div>
    </div>
  )
}

function FilePanel({
  bucket,
  files,
  loading,
  onUpload,
}: {
  bucket: BucketInfo | null
  files: FileItem[]
  loading: boolean
  onUpload: () => void
}) {
  if (!bucket) {
    return (
      <AdminEmpty
        title="เลือก bucket เพื่อดูไฟล์"
        description="เลือกพื้นที่จัดเก็บจากรายการด้านซ้าย"
      />
    )
  }

  return (
    <AdminPageSection
      className="overflow-hidden"
      title={bucket.name}
      description={`${bucket.fileCount} ไฟล์ · ${bucket.folderCount} โฟลเดอร์ · ${formatBytes(bucket.totalBytes)}`}
    >
      <div className="-mx-3 -my-3 sm:-mx-5 sm:-my-4">
        <div className="flex flex-col gap-3 border-b border-surface-300 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-surface-300 bg-dash-canvas text-[var(--admin-accent)]">
              <HardDrive className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-black text-foreground">{bucket.name}</p>
              <p className="truncate text-xs text-foreground-muted">
                {bucket.fileSizeLimit ? `จำกัด ${formatBytes(bucket.fileSizeLimit)} / ไฟล์` : 'ไม่จำกัดขนาดต่อไฟล์'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onUpload}
            className="h-9 w-full gap-2 rounded-lg bg-[var(--admin-accent)] text-xs font-bold text-white hover:bg-[var(--admin-accent)]/90 sm:w-auto"
          >
            <Upload className="size-3.5" />
            อัปโหลดไฟล์
          </Button>
        </div>

        {loading ? (
          <div className="grid min-h-64 place-items-center text-xs text-foreground-muted">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              กำลังโหลดไฟล์...
            </span>
          </div>
        ) : files.length === 0 ? (
          <AdminEmpty title="Bucket นี้ยังว่าง" description="อัปโหลดไฟล์แรกเพื่อเริ่มใช้งาน" />
        ) : (
          <div>
            <div className="hidden grid-cols-[minmax(0,1fr)_180px_120px_120px] border-b border-surface-300 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-foreground-faint md:grid">
              <span>Path</span>
              <span>ประเภท</span>
              <span>ขนาด</span>
              <span className="text-right">การทำงาน</span>
            </div>
            {files.map((file) => (
              <FileRow key={file.path} file={file} />
            ))}
          </div>
        )}
      </div>
    </AdminPageSection>
  )
}

export default function StoragePage() {
  usePageTitle('พื้นที่จัดเก็บ')
  const { getAdminHeaders } = useAdminAuth()
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data, loading, error, refetch } = useAdminApi<StorageData>('/api/admin/storage')
  const buckets = data?.buckets ?? []
  const activeBucketName = selectedBucket ?? buckets[0]?.name ?? null
  const activeBucket = buckets.find((bucket) => bucket.name === activeBucketName) ?? null
  const fileQuery = activeBucketName ? `/api/admin/storage?bucket=${encodeURIComponent(activeBucketName)}` : '/api/admin/storage?bucket='
  const {
    data: fileData,
    loading: filesLoading,
    refetch: refetchFiles,
  } = useAdminApi<StorageData>(fileQuery)
  const files = fileData?.files ?? []

  const totals = useMemo(() => {
    const totalBytes = buckets.reduce((sum, bucket) => sum + bucket.totalBytes, 0)
    const totalFiles = buckets.reduce((sum, bucket) => sum + bucket.fileCount, 0)
    const totalFolders = buckets.reduce((sum, bucket) => sum + bucket.folderCount, 0)
    const publicBuckets = buckets.filter((bucket) => bucket.public).length
    return { totalBytes, totalFiles, totalFolders, publicBuckets }
  }, [buckets])

  async function refreshAll() {
    await refetch()
    await refetchFiles()
  }

  function openUploadDialog() {
    if (!activeBucketName) return
    fileInputRef.current?.click()
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !activeBucketName) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('bucket', activeBucketName)
      const response = await fetch('/api/admin/assets/upload', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: form,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'อัปโหลดไม่สำเร็จ')
      toast.success(`อัปโหลด "${file.name}" แล้ว`)
      await refreshAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'อัปโหลดไม่สำเร็จ')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading) return <AdminLoading message="กำลังโหลดพื้นที่จัดเก็บ..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  return (
    <AdminPageContainer>
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />

      <AdminPageHeader
        title="พื้นที่จัดเก็บ"
        description={`${buckets.length} bucket · ${totals.totalFiles} ไฟล์ · ใช้พื้นที่ ${formatBytes(totals.totalBytes)}`}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={refreshAll}
          disabled={uploading}
          className="h-9 border-surface-300 bg-surface-100 text-xs text-foreground-light hover:bg-surface-200 hover:text-foreground"
        >
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          {uploading ? 'กำลังอัปโหลด...' : 'รีเฟรช'}
        </Button>
      </AdminPageHeader>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Bucket ทั้งหมด" value={buckets.length} detail={`${totals.publicBuckets} public bucket`} />
        <SummaryCard label="ไฟล์ทั้งหมด" value={totals.totalFiles} detail={`${totals.totalFolders} โฟลเดอร์`} />
        <SummaryCard label="พื้นที่ใช้" value={formatBytes(totals.totalBytes)} detail="รวมจาก bucket root" />
        <SummaryCard label="Bucket ที่เลือก" value={activeBucket?.name ?? '-'} detail={activeBucket?.public ? 'public access' : 'private access'} />
      </section>

      {buckets.length === 0 ? (
        <AdminEmpty
          title="ยังไม่มี bucket พื้นที่จัดเก็บ"
          description="สร้าง bucket ได้ใน Supabase Dashboard > Storage"
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <AdminPageSection title="Buckets" description="เลือกพื้นที่จัดเก็บที่ต้องการจัดการ">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {buckets.map((bucket) => (
                <BucketButton
                  key={bucket.id}
                  bucket={bucket}
                  active={bucket.name === activeBucketName}
                  onClick={() => setSelectedBucket(bucket.name)}
                />
              ))}
            </div>
          </AdminPageSection>

          <FilePanel
            bucket={activeBucket}
            files={files}
            loading={filesLoading}
            onUpload={openUploadDialog}
          />
        </div>
      )}
    </AdminPageContainer>
  )
}
