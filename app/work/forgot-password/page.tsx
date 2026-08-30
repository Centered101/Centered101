import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AuthBrand } from '@/components/work/layout/auth-brand'
import { Footer } from '@/components/work/layout/footer'
import { resolveLandingPath } from '@/lib/work/auth/permissions'
import { getUser } from '@/lib/work/auth/session'
import { ForgotPasswordForm } from './forgot-form'

export const metadata = { title: 'ลืมรหัสผ่าน' }

/**
 * Requesting a password-recovery link.
 *
 * Public — someone who cannot sign in is by definition signed out. An already
 * signed-in visitor is sent on instead: they do not need recovery, they need
 * the change-password form on their own settings page.
 */
export default async function ForgotPasswordPage() {
  const user = await getUser()
  if (user) redirect(await resolveLandingPath())

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <AuthBrand />
        <h1>ลืมรหัสผ่าน</h1>
        <p className="muted">
          กรอกอีเมลที่ใช้เข้าสู่ระบบ เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้
        </p>

        <ForgotPasswordForm />

        <p className="auth-alt">
          <Link href="/work/login">กลับไปหน้าเข้าสู่ระบบ</Link>
        </p>
      </div>
      <Footer />
    </div>
  )
}
