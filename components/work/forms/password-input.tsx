'use client'

import { useId, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/**
 * A password field with a reveal toggle.
 *
 * Shared by all three places that ask for one — sign-in, the recovery form and
 * the account panel — so the control behaves and looks the same in each, and
 * so the accessibility details below are decided once.
 *
 * REVEALING IS NOT PERSISTED and each field owns its own state. A toggle that
 * remembered "shown" would put the next person's password on screen in a
 * shared or projected window, having been told to once, days earlier.
 *
 * The button is `tabIndex={-1}` on purpose: tabbing out of a password field
 * should reach the submit button, not an optional control, and the toggle is
 * still reachable by pointer and by screen-reader navigation.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [shown, setShown] = useState(false)
  const describedBy = useId()

  return (
    <div className="password-field">
      <input {...props} className={className} type={shown ? 'text' : 'password'} />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setShown((value) => !value)}
        tabIndex={-1}
        aria-label={shown ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
        aria-pressed={shown}
        aria-describedby={describedBy}
      >
        {shown ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
      <span id={describedBy} hidden>
        รหัสผ่านจะแสดงเป็นข้อความธรรมดาเมื่อเปิด
      </span>
    </div>
  )
}
