import Image from 'next/image'

import { APP_NAME } from '@/lib/work/branding'

/**
 * The workspace's name and mark, at the top of a signed-out card.
 *
 * ONE COMPONENT, FIVE PAGES. This markup was copied into login, share and
 * auth-code-error and left out of forgot-password and reset-password, which is
 * how a person mid-recovery ends up on an unbranded white card and cannot tell
 * whose site is asking for their new password.
 *
 * `unoptimized` because the source is a favicon that is already tiny — running
 * it through the image optimizer costs a round trip to save nothing. The
 * explicit `style` pins the rendered size so the card does not reflow while the
 * icon loads, and `alt=""` keeps it decorative: the name is right beside it in
 * text, and a screen reader announcing it twice helps no one.
 */
export function AuthBrand() {
  return (
    <div className="brand auth-brand">
      <div className="brand-mark brand-logo">
        <Image
          src="/work/favicon.ico"
          alt=""
          width={28}
          height={28}
          unoptimized
          style={{ width: 28, height: 28 }}
        />
      </div>
      <span>{APP_NAME}</span>
    </div>
  )
}
