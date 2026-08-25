'use client'

import Link from 'next/link'
import { Bell, Menu, Moon, Sun } from 'lucide-react'

/**
 * Topbar.
 *
 * The prototype's admin/client toggle flipped a useState value and re-rendered
 * a different body from the same page. The two portals are now separate route
 * trees, so the same control navigates between them instead. The markup and
 * `.role-switch` classes are unchanged, so it looks identical.
 *
 * This switch is developer convenience for now. Once Phase 4 lands it is
 * rendered only for users who actually hold both roles — and, as always, the
 * real boundary is server-side, not this control.
 */
export function Topbar({
  breadcrumb,
  activePortal,
  userInitial,
  dark,
  onToggleTheme,
  onOpenMobileNav,
}: {
  breadcrumb: string
  activePortal: 'admin' | 'portal'
  userInitial: string
  dark: boolean
  onToggleTheme: () => void
  onOpenMobileNav: () => void
}) {
  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={onOpenMobileNav} aria-label="เปิดเมนู">
        <Menu size={20} />
      </button>
      <div className="breadcrumbs">
        <span>พื้นที่ทำงาน</span>
        <span>/</span>
        <strong>{breadcrumb}</strong>
      </div>
      <div className="top-actions">
        <div className="role-switch">
          <Link href="/work/admin/dashboard" className={activePortal === 'admin' ? 'selected' : ''}>
            แอดมิน
          </Link>
          <Link href="/work/portal" className={activePortal === 'portal' ? 'selected' : ''}>
            ลูกค้า
          </Link>
        </div>
        <button className="icon-btn" onClick={onToggleTheme} aria-label="สลับธีม">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="icon-btn notification" aria-label="การแจ้งเตือน">
          <Bell size={18} />
          <i />
        </button>
        <div className="top-avatar">{userInitial}</div>
      </div>
    </header>
  )
}
