'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { FileText, Upload, ExternalLink, Loader2 } from 'lucide-react'
import { AdminPageSection } from '@/components/admin/AdminPage'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'

const RESUME_URL =
  'https://wwcduaaqtyopvofzlouw.supabase.co/storage/v1/object/public/general/Centered101-resume.pdf?download=Centered101-resume.pdf'

export function ResumeTab() {
  const { getAdminHeaders } = useAdminAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [lastUploaded, setLastUploaded] = useState<string | null>(null)

  async function handleUpload(file: File) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please select a PDF file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)')
      return
    }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/portfolio/resume', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      toast.success('Resume uploaded')
      setLastUploaded(new Date().toLocaleString())
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6 p-6">
      <AdminPageSection
        title="Resume / CV"
        description="PDF shown by the Download button in the portfolio Hero & Footer"
      >
        <div className="rounded-xl border border-[#27272A] bg-[#18181B] p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-[#27272A] bg-[#09090B] text-[#409EFE]">
              <FileText className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#FAFAFA]">Centered101-resume.pdf</p>
              <p className="truncate text-[11px] text-[#52525b]">general/Centered101-resume.pdf · Supabase storage</p>
            </div>
            <a
              href={RESUME_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 items-center gap-1.5 rounded-lg border border-[#27272A] px-3 text-xs text-[#A1A1AA] transition-colors hover:border-[#409EFE]/50 hover:text-[#FAFAFA]"
            >
              <ExternalLink className="size-3.5" /> View
            </a>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleUpload(f)
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-[#409EFE]/30 bg-[#409EFE]/10 px-4 text-xs font-medium text-[#409EFE] transition-colors hover:bg-[#409EFE]/20 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              {uploading ? 'Uploading...' : 'Upload new resume'}
            </button>
            {lastUploaded && <span className="text-[11px] text-[#52525b]">Updated {lastUploaded}</span>}
          </div>

          <p className="mt-3 text-[11px] text-[#3f3f46]">
            Uploading replaces the file at the same path, so the portfolio download link updates automatically. PDF only, max 10MB.
          </p>
        </div>
      </AdminPageSection>
    </div>
  )
}
