'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, ExternalLink, FileText, Loader2, UploadCloud } from 'lucide-react'
import { AdminPageSection } from '@/components/admin/AdminPage'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'

const RESUME_PREVIEW_URL =
  '/api/portfolio/resume'

export function ResumeTab() {
  const { getAdminHeaders } = useAdminAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [lastUploaded, setLastUploaded] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)

  async function handleUpload(file: File) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('กรุณาเลือกไฟล์ PDF')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('ไฟล์ใหญ่เกินไป (สูงสุด 10MB)')
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
      if (!res.ok) throw new Error(json.error || 'อัปโหลดไม่สำเร็จ')
      toast.success('อัปโหลดเรซูเม่แล้ว')
      setLastUploaded(new Date().toLocaleString())
      setPreviewKey((current) => current + 1)
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
        title="เรซูเม่ / CV"
        description="ไฟล์ PDF ที่ใช้กับปุ่มดาวน์โหลดบนหน้า portfolio"
      >
        <div className="overflow-hidden rounded-xl border border-[#dfe3e8] bg-white">
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-h-80 border-b border-[#eef1f4] p-5 xl:border-b-0 xl:border-r">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-[#dfe3e8] bg-[#f6fbff] text-[#409EFE]">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#09090b]">Centered101-resume.pdf</p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-[#647084]">portfolio/resume/Centered101-resume.pdf</p>
                  </div>
                </div>
                <a
                  href={RESUME_PREVIEW_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#dfe3e8] bg-white px-3 text-xs font-bold text-[#647084] transition hover:border-[#409EFE]/40 hover:text-[#409EFE]"
                >
                  <ExternalLink className="size-3.5" /> เปิดดู
                </a>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-[#dfe3e8] bg-[#fbfdff] p-3">
                  <p className="text-[11px] font-bold uppercase text-[#94a3b8]">ประเภทไฟล์</p>
                  <p className="mt-1 text-sm font-black text-[#09090b]">PDF</p>
                </div>
                <div className="rounded-lg border border-[#dfe3e8] bg-[#fbfdff] p-3">
                  <p className="text-[11px] font-bold uppercase text-[#94a3b8]">ขนาดสูงสุด</p>
                  <p className="mt-1 text-sm font-black text-[#09090b]">10MB</p>
                </div>
                <div className="rounded-lg border border-[#dfe3e8] bg-[#fbfdff] p-3">
                  <p className="text-[11px] font-bold uppercase text-[#94a3b8]">พื้นที่จัดเก็บ</p>
                  <p className="mt-1 text-sm font-black text-[#09090b]">Supabase</p>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-2 rounded-lg border border-[#dbeafe] bg-[#f6fbff] p-3 text-xs font-semibold leading-relaxed text-[#647084]">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#409EFE]" />
                <p>การอัปโหลดจะแทนที่ไฟล์เดิมใน path เดียวกัน ลิงก์ดาวน์โหลดบนหน้า portfolio จะอัปเดตอัตโนมัติ</p>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-[#dfe3e8] bg-[#fbfdff]">
                <div className="flex items-center justify-between border-b border-[#eef1f4] px-4 py-3">
                  <div>
                    <p className="text-xs font-black text-[#09090b]">ตัวอย่างไฟล์ที่อัปโหลด</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-[#647084]">แสดงผ่าน proxy ของเว็บ เพื่อไม่ให้ PDF ถูก browser บล็อก</p>
                  </div>
                  <FileText className="size-4 text-[#409EFE]" />
                </div>
                <iframe
                  key={previewKey}
                  title="ตัวอย่างเรซูเม่"
                  src={`${RESUME_PREVIEW_URL}?v=${previewKey}#toolbar=0&navpanes=0`}
                  className="h-[520px] w-full bg-white"
                />
              </div>
            </div>

            <div className="flex min-h-80 flex-col justify-between p-5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex min-h-56 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#b9dafb] bg-[#f6fbff] px-5 py-8 text-center transition hover:border-[#409EFE] hover:bg-[#eef7ff] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <div className="grid size-12 place-items-center rounded-xl border border-[#dbeafe] bg-white text-[#409EFE]">
                  {uploading ? <Loader2 className="size-5 animate-spin" /> : <UploadCloud className="size-5" />}
                </div>
                <p className="mt-3 text-sm font-black text-[#09090b]">
                  {uploading ? 'กำลังอัปโหลดเรซูเม่...' : 'อัปโหลดเรซูเม่ใหม่'}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#647084]">เลือกไฟล์ PDF เพื่อแทนที่ไฟล์เดิม</p>
                {lastUploaded && <p className="mt-2 text-[11px] font-semibold text-[#409EFE]">อัปเดตล่าสุด {lastUploaded}</p>}
              </button>

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
            </div>
          </div>
        </div>
      </AdminPageSection>
    </div>
  )
}
