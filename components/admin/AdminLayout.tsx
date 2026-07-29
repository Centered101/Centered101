'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Github, Loader2, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { AIChatSidebar } from '@/components/admin/AIChatSidebar'
import { CommandPalette } from '@/components/admin/CommandPalette'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const {
    isAuthenticated,
    isBooting,
    isLoading,
    authMode,
    authInfo,
    adminUsername,
    loginWithGitHub,
  } = useAdminAuth()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  // Restore accent color from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('admin_accent_color')
    if (saved) document.documentElement.style.setProperty('--admin-accent', saved)
  }, [])

  if (isBooting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090B]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-5 animate-spin rounded-full border-2 border-[#27272A] border-t-[#409EFE]" />
          <p className="text-xs text-[#52525b]">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="relative min-h-screen w-full overflow-hidden bg-[#09090B] px-5 py-10 text-[#FAFAFA]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(64,158,254,0.12),transparent_26rem)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px]" />

        <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
          <section className="w-full overflow-hidden rounded-2xl border border-[#27272A] bg-[#18181B]/92 shadow-2xl shadow-black/70 backdrop-blur-xl">
            <div className="border-b border-[#27272A] px-7 py-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#409EFE]/20 bg-[#409EFE]/10 px-3 py-1 text-[11px] font-semibold text-[#409EFE]">
                <ShieldCheck className="size-3.5" />
                ระบบหลังบ้าน
              </div>
            </div>

            <div className="px-7 py-8">
              <div className="mb-8 flex flex-col items-center gap-4 text-center">
                <div className="relative overflow-hidden rounded-2xl border border-[#409EFE]/25 bg-[#09090B] p-1 shadow-[0_18px_70px_-32px_rgba(64,158,254,0.9)]">
                  <div className="absolute inset-0 bg-[#409EFE]/10 blur-xl" />
                  <div className="relative overflow-hidden rounded-xl">
                <Image
                  src="/admin/favicon.png"
                  alt="Centered101 Admin"
                  width={64}
                  height={64}
                  className="rounded-xl"
                  priority
                />
                  </div>
              </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-[#FAFAFA]">เข้าสู่ระบบแอดมิน</h1>
                  <p className="mt-2 text-sm leading-6 text-[#71717A]">
                    สำหรับผู้ดูแลระบบ Centered101 ที่ได้รับสิทธิ์เท่านั้น
                  </p>
                </div>
              </div>

              <div className="mb-5 rounded-xl border border-[#27272A] bg-[#09090B] p-4">
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-[#27272A] bg-[#18181B] text-[#409EFE]">
                    <LockKeyhole className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#FAFAFA]">ยืนยันตัวตนด้วย GitHub</p>
                    <p className="mt-1 text-xs leading-5 text-[#71717A]">
                      ระบบจะตรวจสอบบัญชี GitHub กับรายชื่อผู้ดูแลที่อนุญาตไว้
                    </p>
                  </div>
                </div>
              </div>

              <Button
                className="h-11 w-full gap-2.5 rounded-lg bg-[#FAFAFA] text-sm font-bold text-[#09090B] hover:bg-white disabled:opacity-60"
                onClick={() => loginWithGitHub(pathname === '/admin/login' ? '/admin' : pathname)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Github className="size-4" />
                )}
                {isLoading ? 'กำลังเชื่อมต่อ...' : 'เข้าสู่ระบบด้วย GitHub'}
              </Button>

              <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#52525B]">
                <Sparkles className="size-3.5 text-[#409EFE]" />
                ปลอดภัยด้วยสิทธิ์เฉพาะบัญชีที่ได้รับอนุญาต
              </div>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090B] text-[#FAFAFA]">
      {/* Desktop sidebar */}
      <div className="hidden shrink-0 lg:flex">
        <AdminSidebar authInfo={authInfo} authMode={authMode} adminUsername={adminUsername} />
      </div>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full shadow-2xl">
            <AdminSidebar
              authInfo={authInfo}
              authMode={authMode}
              adminUsername={adminUsername}
              onNavClick={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminTopbar
          onMenuOpen={() => setSidebarOpen(true)}
          onCommandOpen={() => setCommandOpen(true)}
          onAIToggle={() => setAiOpen((v) => !v)}
          aiOpen={aiOpen}
        />
        <div className="flex flex-1 overflow-hidden">
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
          {aiOpen && <AIChatSidebar onClose={() => setAiOpen(false)} />}
        </div>
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  )
}
