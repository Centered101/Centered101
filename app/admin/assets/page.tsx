'use client'

import { usePageTitle } from '@/lib/hooks/use-page-title'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Archive, File, FileCode, FileText, HardDrive, Image, Loader2, Trash2, Upload } from 'lucide-react'
import { AdminLoading, AdminError, AdminEmpty } from '@/components/admin/AdminStates'
import { ConfirmModal } from '@/components/admin/ConfirmModal'
import { useAdminApi, useAdminMutation } from '@/lib/hooks/useAdminApi'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'
import { useAdminRealtime } from '@/lib/hooks/useAdminRealtime'
import { AdminPageContainer, AdminPageHeader } from '@/components/admin/AdminPage'
import { AdminPagination } from '@/components/admin/AdminPagination'

type Asset = {
  id: string
  name: string
  file_path: string
  public_url: string | null
  mime_type: string
  size_bytes: number
  bucket: string
  alt_text: string | null
  created_at: string
}

type StorageBucket = {
  bucket: string
  usedBytes: number
  usedGB: number
  count: number
}

type AssetsData = {
  assets: Asset[]
  storageByBucket: StorageBucket[]
}

const BUCKET_COLORS: Record<string, string> = {
  public: '#A1A1AA',
  content: '#22C55E',
  projects: '#F59E0B',
  backups: '#409EFE',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function FileIcon({ mime }: { mime: string }) {
  const cls = 'size-3.5 shrink-0'
  if (mime.startsWith('image/')) return <Image className={cls} style={{ color: '#409EFE' }} />
  if (mime === 'application/pdf') return <FileText className={cls} style={{ color: '#EF4444' }} />
  if (mime.includes('zip') || mime.includes('gzip') || mime.includes('tar')) return <Archive className={cls} style={{ color: '#F59E0B' }} />
  if (mime.startsWith('text/') || mime.includes('json')) return <FileCode className={cls} style={{ color: '#A1A1AA' }} />
  return <File className={cls} style={{ color: '#52525b' }} />
}

export default function AssetsPage() {
  usePageTitle('Assets')
  const { data, loading, error, refetch } = useAdminApi<AssetsData>('/api/admin/assets')
  const { mutate: deleteAsset } = useAdminMutation<undefined>('/api/admin/assets', 'DELETE')
  const { getAdminHeaders } = useAdminAuth()
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null)
  const [uploading, setUploading] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const fileInputRef = useRef<HTMLInputElement>(null)
  useAdminRealtime(['digital_assets'], refetch)

  if (loading) return <AdminLoading message="Loading assets..." />
  if (error) return <AdminError error={error} onRetry={refetch} />

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('bucket', 'public')
      const res = await fetch('/api/admin/assets/upload', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: form,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      toast.success(`Uploaded "${file.name}"`)
      refetch()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete(asset: Asset) {
    try {
      await deleteAsset(undefined, { id: asset.id })
      toast.success(`Deleted "${asset.name}"`)
      setDeleteTarget(null)
      refetch()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const assets = data?.assets ?? []
  const pagedAssets = assets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const buckets = data?.storageByBucket ?? []
  const totalGB = buckets.reduce((s, b) => s + b.usedGB, 0)
  const TOTAL_LIMIT = 35

  return (
    <AdminPageContainer>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleUpload}
      />
      <AdminPageHeader
        title="Digital Assets"
        description={`Files from Supabase · ${assets.length} files · ${totalGB.toFixed(2)} GB total`}
      >
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-lg bg-[#409EFE] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#60aeff] disabled:opacity-60"
        >
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
      </AdminPageHeader>

      {/* Storage overview */}
      <div className="rounded-xl border border-[#27272A] bg-[#18181B] p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="size-4 text-[#3f3f46]" />
            <h2 className="text-sm font-semibold text-[#FAFAFA]">Storage Usage</h2>
          </div>
          <span className="text-[11px] text-[#52525b]">
            {totalGB.toFixed(2)} GB / {TOTAL_LIMIT} GB ({Math.round((totalGB / TOTAL_LIMIT) * 100)}%)
          </span>
        </div>

        <div className="mb-4 h-2 overflow-hidden rounded-full bg-[#27272A]">
          {buckets.length === 0 ? (
            <div className="h-full w-0 rounded-full bg-[#409EFE]" />
          ) : (
            <div className="flex h-full" style={{ width: `${Math.min((totalGB / TOTAL_LIMIT) * 100, 100)}%` }}>
              {buckets.map((b, i) => (
                <div
                  key={b.bucket}
                  className={i === 0 ? 'rounded-l-full' : i === buckets.length - 1 ? 'rounded-r-full' : ''}
                  style={{
                    backgroundColor: BUCKET_COLORS[b.bucket] ?? '#52525b',
                    width: `${(b.usedGB / totalGB) * 100}%`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {buckets.length === 0 ? (
          <p className="text-[12px] text-[#3f3f46]">No storage data yet</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {buckets.map((b) => (
              <div key={b.bucket} className="rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2.5">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ backgroundColor: BUCKET_COLORS[b.bucket] ?? '#52525b' }} />
                  <span className="text-[11px] font-medium capitalize text-[#A1A1AA]">{b.bucket}</span>
                </div>
                <p className="font-mono text-sm font-bold text-[#FAFAFA]">{b.usedGB.toFixed(2)} GB</p>
                <p className="text-[10px] text-[#3f3f46]">{b.count} files</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Files table */}
      <div className="rounded-xl border border-[#27272A] bg-[#18181B]">
        <div className="border-b border-[#27272A] px-5 py-4">
          <h2 className="text-sm font-semibold text-[#FAFAFA]">Files</h2>
        </div>

        {assets.length === 0 ? (
          <AdminEmpty title="No files yet" description="Upload files to see them here" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-140 text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#27272A] text-[10px] font-semibold uppercase tracking-widest text-[#3f3f46]">
                  <th className="px-5 py-3">File</th>
                  <th className="px-4 py-3">Bucket</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]/50">
                {pagedAssets.map((asset) => (
                  <tr key={asset.id} className="transition-colors hover:bg-[#27272A]/20">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <FileIcon mime={asset.mime_type} />
                        <div>
                          <p className="font-medium text-[#FAFAFA]">{asset.name}</p>
                          <p className="font-mono text-[10px] text-[#52525b]">{asset.file_path}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded border border-[#27272A] bg-[#09090B] px-1.5 py-0.5 text-[10px] capitalize text-[#A1A1AA]">
                        {asset.bucket}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[#A1A1AA]">{formatBytes(asset.size_bytes)}</td>
                    <td className="px-4 py-3 text-[12px] text-[#52525b]">
                      {new Date(asset.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDeleteTarget(asset)}
                        className="grid size-7 place-items-center rounded-lg border border-[#27272A] bg-[#09090B] text-[#52525b] hover:text-[#EF4444]"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AdminPagination
          page={page}
          total={assets.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
          className="border-t border-[#27272A] px-5 py-3"
        />
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This file record will be soft-deleted. The original file in storage is not affected."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </AdminPageContainer>
  )
}
