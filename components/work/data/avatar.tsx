'use client'

import { useState } from 'react'
import Image from 'next/image'

/**
 * An account chip: the provider's picture when there is one, the initial
 * otherwise.
 *
 * A client component even though both call sites could render it on the
 * server, because `onError` is not decoration. Google's avatar URLs are signed
 * and do rotate, and an <img> that 404s renders as a broken-image glyph rather
 * than as nothing — the fallback is what keeps the chip looking deliberate on
 * the day the URL goes stale.
 */
export function Avatar({
  src,
  initial,
  name,
  className = 'avatar small',
  size = 29,
}: {
  src: string | null
  initial: string
  /** Used as the alt text; the chip is redundant with the name beside it. */
  name: string
  className?: string
  /** Must match what the CSS renders, so next/image raises no ratio warning. */
  size?: number
}) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return <div className={className}>{initial}</div>
  }

  return (
    <Image
      className={`${className} avatar-photo`}
      src={src}
      alt={name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
    />
  )
}

// initialFor() moved to lib/work/format.ts: it is a pure function, and
// exporting it from a 'use client' module made it uncallable from the Server
// Components that need it.
