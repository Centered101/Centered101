'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Bell } from 'lucide-react'

/**
 * The notification bell, rebuilt on real data.
 *
 * The bell was removed in Phase 4 because nothing wrote notifications and
 * nothing read them — a dot that never clears trains people to ignore the one
 * that eventually works. It comes back reading `activity_logs`, which is
 * written in the same transaction as the mutation it describes, so the list is
 * a record rather than a reconstruction.
 *
 * THE FEED IS RENDERED ON THE SERVER and handed in as `children`. Entries come
 * from `lib/work/queries/activity.ts`, which is `server-only`; this component
 * exists to open and close a panel, not to fetch. It is the same split the
 * shell already uses for pages.
 *
 * WHAT COUNTS AS SEEN lives in localStorage, not in the database. It is a
 * per-person, per-device reading position with no meaning to anyone else —
 * a column on `profiles` would make it a synchronised fact the app would then
 * have to keep true across tabs and devices, for a red dot. If storage is
 * unavailable or cleared, the worst case is the dot showing once more.
 */
const SEEN_KEY = 'work:activity-seen'

export function NotificationBell({
  latestId,
  children,
}: {
  /** Highest `activity_logs.id` the caller can see; null when the feed is empty. */
  latestId: number | null
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  // undefined until the effect below has run: localStorage is not available
  // during the server render, and reading it in a lazy initialiser would make
  // the first client paint disagree with the HTML.
  const [seenId, setSeenId] = useState<number | undefined>(undefined)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SEEN_KEY)
      setSeenId(stored === null ? 0 : Number(stored) || 0)
    } catch {
      setSeenId(0)
    }
  }, [])

  // Closing on an outside click or on Escape is what makes this behave like a
  // menu rather than a panel you have to hit the button again to dismiss.
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

  const unread = seenId !== undefined && latestId !== null && latestId > seenId

  function toggle() {
    const next = !open
    setOpen(next)
    // Opening is the act of reading, so the dot clears on open rather than on
    // close — closing without reading would otherwise mark everything seen.
    if (next && latestId !== null) {
      setSeenId(latestId)
      try {
        window.localStorage.setItem(SEEN_KEY, String(latestId))
      } catch {
        // A locked-down browser loses the reading position, not the feed.
      }
    }
  }

  return (
    <div className="bell" ref={rootRef}>
      <button
        type="button"
        className="icon-btn"
        onClick={toggle}
        aria-label={unread ? 'การแจ้งเตือน (มีรายการใหม่)' : 'การแจ้งเตือน'}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={17} />
        {unread && <span className="bell-dot" aria-hidden />}
      </button>

      {open && (
        <div className="bell-panel" role="dialog" aria-label="การแจ้งเตือน">
          <div className="bell-panel-head">
            <strong>การแจ้งเตือน</strong>
            <small className="muted">กิจกรรมล่าสุดในพื้นที่ทำงานของคุณ</small>
          </div>
          <div className="bell-panel-body">{children}</div>
        </div>
      )}
    </div>
  )
}
