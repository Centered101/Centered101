'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, LogOut, X } from 'lucide-react'

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
        <div className="brand-mark brand-logo">
          <Image
            src="/work/favicon.ico"
            alt=""
            width={28}
            height={28}
            unoptimized
            /* Both dimensions inline: Tailwind preflight's `height: auto` on img
               otherwise trips next/image's aspect-ratio warning. */
            style={{ width: 28, height: 28 }}
          />
        </div>
        <span>Centered101&apos;s Work</span>
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
      {/* No Settings link down here.
          It used to be hardcoded, which broke twice over once the nav became
          real: it duplicated the ตั้งค่า entry in adminNav, and it pointed at
          /work/admin/settings from BOTH portals — so a client clicking it was
          bounced straight back out by requireAdmin(). Navigation belongs in
          lib/work/nav.ts, where each portal declares its own. */}
      <div className="sidebar-bottom">
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
