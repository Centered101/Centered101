'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronsUpDown, LogOut, UserRound } from 'lucide-react'

import { Avatar } from '@/components/work/data/avatar'
import { signOut } from '@/lib/work/auth/actions'

/**
 * The account card at the foot of the sidebar.
 *
 * Used to be two things sitting permanently on screen: a `<Link>` naming the
 * account, and a full-width "ออกจากระบบ" button directly under it — both
 * visible all the time, at the bottom of every page. This is that same
 * information, but sign-out (and the link to the account page) now live
 * behind a click, the way the notification bell and the feedback menu next
 * to it already work — same outside-click/Escape contract as both, so it
 * behaves like the rest of this sidebar's menus rather than its own thing.
 *
 * The identity itself (avatar, name, email) is still visible at rest — only
 * the ACTIONS moved behind the click. Someone glancing at the sidebar still
 * sees whose account they're in without opening anything.
 */
export function AccountMenu({
  accountHref,
  accountLabel,
  userName,
  userEmail,
  userInitial,
  userAvatarUrl,
  isAccountPage,
  onNavigate,
}: {
  accountHref: string
  /** "โปรไฟล์" for a client, "การตั้งค่า" for staff — accountHref points at different pages per portal (lib/work/nav.ts), so the menu names the one it actually opens rather than a label that's wrong half the time. */
  accountLabel: string
  userName: string
  userEmail: string
  userInitial: string
  userAvatarUrl: string | null
  isAccountPage: boolean
  onNavigate: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function close() {
    setOpen(false)
    onNavigate()
  }

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        type="button"
        className="profile"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-current={isAccountPage ? 'page' : undefined}
      >
        <Avatar src={userAvatarUrl} initial={userInitial} name={userName} />
        <div>
          <strong>{userName}</strong>
          <small>{userEmail}</small>
        </div>
        <ChevronsUpDown size={14} />
      </button>

      {/* Opens UPWARD (.account-panel, in CSS): this sits at the bottom of a
          sticky sidebar, so a panel opening down would run off the viewport
          more often than not. Comes after the trigger in the markup — CSS
          positions it, not DOM order — so tabbing into a closed menu still
          reaches the trigger first, the way it would for any other button
          with a hidden panel behind it. */}
      {open && (
        <div className="account-panel" role="dialog" aria-label="บัญชี">
          <div className="account-panel-head">
            <Avatar src={userAvatarUrl} initial={userInitial} name={userName} />
            <div>
              <strong>{userName}</strong>
              <small>{userEmail}</small>
            </div>
          </div>

          <Link href={accountHref} className="account-panel-item" onClick={close}>
            <UserRound size={16} />
            {accountLabel}
          </Link>

          {/* Sign-out is a form, not a link: it mutates session state, so it
              must be a POST to a Server Action rather than something a
              prefetch or a crawler can trigger by following a URL. */}
          <form action={signOut}>
            <button type="submit" className="account-panel-item account-panel-signout">
              <LogOut size={16} />
              ออกจากระบบ
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
