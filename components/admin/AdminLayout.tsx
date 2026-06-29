'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Github, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { AIChatSidebar } from '@/components/admin/AIChatSidebar'
import { CommandPalette } from '@/components/admin/CommandPalette'
import { useAdminAuth } from '@/components/admin/AdminAuthProvider'

export function AdminLayout({ children }: { children: React.ReactNode }) {
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
          <p className="text-xs text-[#52525b]">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen w-full bg-[#09090B] px-5 py-10 text-[#FAFAFA]">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xs items-center">
          <section className="w-full rounded-2xl border border-[#27272A] bg-[#18181B] p-8 shadow-2xl shadow-black/60">
            {/* Logo + title */}
            <div className="mb-8 flex flex-col items-center gap-4">
              <div className="overflow-hidden rounded-2xl border border-[#27272A] bg-[#09090B] p-0.5">
                <Image
                  src="/admin/favicon.png"
                  alt="Centered101 Admin"
                  width={64}
                  height={64}
                  className="rounded-xl"
                  priority
                />
              </div>
              <div className="text-center">
                <h1 className="text-lg font-bold tracking-tight text-[#FAFAFA]">Centered101 Admin</h1>
                <p className="mt-1 text-xs text-[#3f3f46]">Restricted access — authorized users only</p>
              </div>
            </div>

            {/* GitHub OAuth */}
            <Button
              className="h-10 w-full gap-2.5 bg-[#FAFAFA] text-sm font-semibold text-[#09090B] hover:bg-white disabled:opacity-60"
              onClick={() => loginWithGitHub()}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Github className="size-4" />
              )}
              {isLoading ? 'Connecting...' : 'Continue with GitHub'}
            </Button>

            <p className="mt-5 text-center text-[10px] text-[#3f3f46]">
              Only authorized GitHub accounts can access this panel
            </p>
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
          <main className="flex-1 overflow-y-auto">{children}</main>
          {aiOpen && <AIChatSidebar onClose={() => setAiOpen(false)} />}
        </div>
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  )
}
