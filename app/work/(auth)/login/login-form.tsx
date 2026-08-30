'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Mail } from 'lucide-react'

import { PasswordInput, useActionToast } from '@/components/work/forms'
import {
  signInWithGoogle,
  signInWithMagicLink,
  signInWithPassword,
  signUpWithPassword,
  type AuthState,
} from '@/lib/work/auth/actions'

type Mode = 'signin' | 'signup' | 'magic'

const EMPTY: AuthState = {}

/**
 * Sign-in form.
 *
 * Three modes over one set of fields, so the card does not change shape as the
 * user switches. Every submission goes to a Server Action — credentials are
 * never handled by client-side JavaScript, and whether a sign-in succeeded is
 * never something this component decides.
 *
 * FORM-LEVEL RESULTS ARE TOASTS, field-level ones are not. "อีเมลหรือ
 * รหัสผ่านไม่ถูกต้อง" is about the submission, so it goes to the same
 * Toaster every other action in the app reports through; "รูปแบบอีเมลไม่
 * ถูกต้อง" is about one input and stays beside it, where the correction has
 * to be made. Sonner renders into an aria-live region, so the announcement
 * the removed role="alert" paragraphs provided is not lost.
 */
export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<Mode>('signin')

  const [signInState, signInAction, signInPending] = useActionState(signInWithPassword, EMPTY)
  const [signUpState, signUpAction, signUpPending] = useActionState(signUpWithPassword, EMPTY)
  const [magicState, magicAction, magicPending] = useActionState(signInWithMagicLink, EMPTY)
  const [googleState, googleAction, googlePending] = useActionState(signInWithGoogle, EMPTY)

  // One per action rather than one for the merged `state` below: each carries
  // its own result, and a hook cannot be called conditionally.
  useActionToast(signInState)
  useActionToast(signUpState)
  useActionToast(magicState)
  useActionToast(googleState)

  const state = mode === 'signin' ? signInState : mode === 'signup' ? signUpState : magicState
  const action =
    mode === 'signin' ? signInAction : mode === 'signup' ? signUpAction : magicAction
  const pending =
    mode === 'signin' ? signInPending : mode === 'signup' ? signUpPending : magicPending

  return (
    <>
      <div className="range-tabs auth-tabs">
        <button
          type="button"
          className={mode === 'signin' ? 'selected' : ''}
          onClick={() => setMode('signin')}
        >
          เข้าสู่ระบบ
        </button>
        <button
          type="button"
          className={mode === 'signup' ? 'selected' : ''}
          onClick={() => setMode('signup')}
        >
          สมัครสมาชิก
        </button>
        <button
          type="button"
          className={mode === 'magic' ? 'selected' : ''}
          onClick={() => setMode('magic')}
        >
          ลิงก์อีเมล
        </button>
      </div>

      <form className="auth-form" action={action}>
        {next && <input type="hidden" name="next" value={next} />}

        {mode === 'signup' && (
          <>
            <label className="field-label" htmlFor="fullName">
              ชื่อ-นามสกุล
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              placeholder="ชื่อของคุณ"
              aria-invalid={Boolean(state.fieldErrors?.fullName)}
            />
            {state.fieldErrors?.fullName && (
              <p className="field-error">{state.fieldErrors.fullName}</p>
            )}
          </>
        )}

        <label className="field-label" htmlFor="email">
          อีเมล
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        {state.fieldErrors?.email && <p className="field-error">{state.fieldErrors.email}</p>}

        {mode !== 'magic' && (
          <>
            <label className="field-label" htmlFor="password">
              รหัสผ่าน
            </label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={8}
              placeholder="อย่างน้อย 8 ตัวอักษร"
              aria-invalid={Boolean(state.fieldErrors?.password)}
            />
            {state.fieldErrors?.password && (
              <p className="field-error">{state.fieldErrors.password}</p>
            )}
            {/* Only on sign-in: offering "forgot password" while somebody is
                choosing a new one reads as an error message. */}
            {mode === 'signin' && (
              <Link className="auth-secondary-link" href="/work/forgot-password">
                ลืมรหัสผ่าน?
              </Link>
            )}
          </>
        )}

        <button className="primary full" type="submit" disabled={pending}>
          {pending
            ? 'กำลังดำเนินการ…'
            : mode === 'signin'
              ? 'เข้าสู่ระบบ'
              : mode === 'signup'
                ? 'สมัครสมาชิก'
                : 'ส่งลิงก์เข้าสู่ระบบ'}
          {mode === 'magic' ? <Mail size={16} /> : <ArrowUpRight size={16} />}
        </button>
      </form>

      <div className="auth-divider">
        <span>หรือ</span>
      </div>

      <form action={googleAction}>
        {next && <input type="hidden" name="next" value={next} />}
        <button className="outline full" type="submit" disabled={googlePending}>
          <GoogleMark />
          {googlePending ? 'กำลังเปลี่ยนเส้นทาง…' : 'ดำเนินการต่อด้วย Google'}
        </button>
      </form>
    </>
  )
}

/** Google's mark, inlined so the button needs no external asset. */
function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}
