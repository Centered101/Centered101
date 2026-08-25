'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, CircleHelp, LogOut, Settings, X, Zap } from 'lucide-react'

import { signOut } from '@/lib/work/auth/actions'
import { isNavItemActive, type NavItem } from '@/lib/work/nav'

/**
 * Sidebar.
 *
 * Same markup and classes as the prototype. Two behavioural changes:
 *  - nav entries are <Link>s instead of buttons that only set local state
 *  - the active item is derived from the URL, not from a useState value
 */
export function Sidebar({
  items,
  workspaceName,
  workspaceRole,
  workspaceInitial,
  userName,
  userEmail,
  userInitial,
  mobileOpen,
  onClose,
}: {
  items: NavItem[]
  workspaceName: string
  workspaceRole: string
  workspaceInitial: string
  userName: string
  userEmail: string
  userInitial: string
  mobileOpen: boolean
  onClose: () => void
}) {
  const pathname = usePathname()

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="brand">
        <div className="brand-mark">
          <Zap size={16} fill="currentColor" />
        </div>
        <span>flowstate</span>
        <button onClick={onClose} className="mobile-close" aria-label="ปิดเมนู">
          <X size={18} />
        </button>
      </div>
      <div className="workspace">
        <div className="avatar">{workspaceInitial}</div>
        <div>
          <strong>{workspaceName}</strong>
          <small>พื้นที่ทำงาน{workspaceRole}</small>
        </div>
        <ChevronDown size={15} />
      </div>
      <nav>
        {items.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={isNavItemActive(pathname, href) ? 'active' : ''}
            onClick={onClose}
          >
            <Icon size={17} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <Link href="/work/admin/settings">
          <Settings size={17} />
          ตั้งค่า
        </Link>
        <button type="button">
          <CircleHelp size={17} />
          ศูนย์ช่วยเหลือ
        </button>
        <div className="profile">
          <div className="avatar small">{userInitial}</div>
          <div>
            <strong>{userName}</strong>
            <small>{userEmail}</small>
          </div>
        </div>
        {/* Sign-out is a form, not a link: it mutates session state, so it
            must be a POST to a Server Action rather than something a
            prefetch or a crawler can trigger by following a URL. */}
        <form action={signOut}>
          <button type="submit" className="sidebar-logout">
            <LogOut size={16} />
            ออกจากระบบ
          </button>
        </form>
      </div>
    </aside>
  )
}
