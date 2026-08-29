import Link from 'next/link'

import { resolveLandingPath } from '@/lib/work/auth/permissions'
import { requireUser } from '@/lib/work/auth/session'
import { ResetPasswordForm } from './reset-form'

export const metadata = { title: 'ตั้งรหัสผ่านใหม่' }

/**
 * Where a recovery link lands, after the callback has exchanged its code.
 *
 * NOT in PUBLIC_PREFIXES, deliberately. By the time this renders there is a
 * real session — the recovery link is what created it — so `requireUser()`
 * holds, and someone arriving here without a link is bounced to /login rather
 * than shown a password form for an account nobody has proven they own.
 *
 * The page being reachable is not itself permission: the action behind the
 * form re-checks that the session came from a recovery link before it writes.
 */
export default async function ResetPasswordPage() {
  await requireUser('/work/reset-password')
  const landingPath = await resolveLandingPath()

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>ตั้งรหัสผ่านใหม่</h1>
        <p className="muted">เลือกรหัสผ่านใหม่สำหรับบัญชีของคุณ</p>

        <ResetPasswordForm landingPath={landingPath} />

        <p className="auth-alt">
          <Link href={landingPath}>ข้ามไปก่อน</Link>
        </p>
      </div>
    </div>
  )
}
