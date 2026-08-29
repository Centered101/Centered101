'use client'

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
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
 *
 * THE KEY IS NAMESPACED BY USER ID. It used to be one shared key, which broke
 * as soon as two accounts used the same browser: signing in as staff and
 * opening the bell cleared the dot for the client account too, even though the
 * two see completely different feeds. Storage is per-origin, not per-session,
 * so the account has to be part of the key.
 */

// -----------------------------------------------------------------------------
// The reading position, as an external store
// -----------------------------------------------------------------------------
// localStorage is state that lives outside React, which is precisely what
// `useSyncExternalStore` is for. The alternative — an effect that reads storage
// and calls setState — is the pattern React's `set-state-in-effect` rule warns
// about: it renders once with the wrong value, then again with the right one.
//
// The store is module-level because the value is per-origin, not per-component:
// two bells on one page (there are not, but) would read the same thing.

function seenKey(userId: string): string {
  return `work:activity-seen:${userId}`
}

const listeners = new Set<() => void>()

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

/**
 * The stored reading position, or 0 when there is none.
 *
 * Must be cheap and return a stable primitive: useSyncExternalStore calls it on
 * every render and compares by identity, so an object would loop forever.
 */
function readSeen(userId: string): number {
  try {
    const stored = window.localStorage.getItem(seenKey(userId))
    return stored === null ? 0 : Number(stored) || 0
  } catch {
    // Private windows and locked-down browsers throw on access rather than
    // returning null. Losing the reading position only shows the dot again.
    return 0
  }
}

function writeSeen(userId: string, value: number): void {
  try {
    window.localStorage.setItem(seenKey(userId), String(value))
  } catch {
    // A locked-down browser loses the reading position, not the feed.
  }
  // Storage does not notify the tab that wrote it — the `storage` event fires
  // in OTHER tabs only — so the store publishes its own change.
  for (const listener of listeners) listener()
}

export function NotificationBell({
  userId,
  latestId,
  children,
}: {
  /** Whose reading position this is. Feeds differ per account, so must this. */
  userId: string
  /** Highest `activity_logs.id` the caller can see; null when the feed is empty. */
  latestId: number | null
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // The server snapshot is `undefined`, not 0: during SSR there is no reading
  // position to know, and claiming 0 would render the unread dot into the HTML
  // and then remove it on hydration.
  const seenId = useSyncExternalStore(
    subscribe,
    () => readSeen(userId),
    () => undefined,
  )

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
    if (next && latestId !== null) writeSeen(userId, latestId)
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
          {/* Entries are links. A click navigates without unmounting this
              component, so the panel has to be told to close — closing here
              rather than watching the URL keeps it to the event that actually
              happened. */}
          <div className="bell-panel-body" onClick={() => setOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
