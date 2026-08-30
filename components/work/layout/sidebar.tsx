'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, X } from 'lucide-react'

import { Avatar } from '@/components/work/data/avatar'
import { signOut } from '@/lib/work/auth/actions'
import { APP_NAME } from '@/lib/work/branding'
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
  workspaceRole,
  accountHref,
  userName,
  userEmail,
  userInitial,
  userAvatarUrl,
  mobileOpen,
  onClose,
}: {
  items: NavItem[]
  /**
   * What this workspace is, in one line under the brand — "ผู้ดูแลระบบ
   * สูงสุด", "ลูกค้า". Null renders nothing.
   *
   * REPLACED THE WORKSPACE CHIP that used to sit below the brand. The chip
   * carried the organization name, an avatar tile and a chevron — and the
   * chevron promised a workspace switcher that was never built. Worse, it was
   * fed the user's OWN display name in the client portal, where there is no
   * organization to name, so the sidebar said who you are three times over.
   * The one part that told you something is kept; the rest is gone.
   *
   * (The schema does allow one person to hold several memberships, and
   * `getAccessContext()` still takes only the oldest. That gap is unchanged
   * and now unadvertised, which is the honest state until a real switcher
   * exists.)
   */
  workspaceRole: string | null
  /** Destination for the identity card at the foot of the sidebar. */
  accountHref: string
  userName: string
  userEmail: string
  userInitial: string
  userAvatarUrl: string | null
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
        <div className="brand-text">
          <span>{APP_NAME}</span>
          {workspaceRole && <small>พื้นที่ทำงาน{workspaceRole}</small>}
        </div>
        <button onClick={onClose} className="mobile-close" aria-label="ปิดเมนู">
          <X size={18} />
        </button>
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
        {/* A link, not a decoration: the card already names the account, so
            it is where people reach for it. */}
        <Link
          href={accountHref}
          className="profile"
          onClick={onClose}
          aria-current={isNavItemActive(pathname, accountHref) ? 'page' : undefined}
        >
          <Avatar src={userAvatarUrl} initial={userInitial} name={userName} />
          <div>
            <strong>{userName}</strong>
            <small>{userEmail}</small>
          </div>
        </Link>
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
