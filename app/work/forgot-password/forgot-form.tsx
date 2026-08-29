'use client'

import { useActionState } from 'react'
import { Mail } from 'lucide-react'

import { requestPasswordReset, type AuthState } from '@/lib/work/auth/actions'

const EMPTY: AuthState = {}

/**
 * Asks for the address to send a recovery link to.
 *
 * The success message is the same whether or not the address has an account.
 * That is not vagueness for its own sake: a form that says "no such account"
 * answers "is this person a client of yours?" for anyone who cares to ask,
 * and the client list is exactly what the rest of this app works to keep
 * private.
 */
export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, EMPTY)

  return (
    <form className="auth-form" action={action}>
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

      <button className="primary full" type="submit" disabled={pending}>
        {pending ? 'กำลังส่ง…' : 'ส่งลิงก์ตั้งรหัสผ่านใหม่'}
        <Mail size={16} />
      </button>

      {state.error && <p className="auth-error">{state.error}</p>}
      {state.message && <p className="auth-success">{state.message}</p>}
    </form>
  )
}
