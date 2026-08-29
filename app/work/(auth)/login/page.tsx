import Image from 'next/image'
import { redirect } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'

import { Footer } from '@/components/work/layout/footer'
import { resolveLandingPath } from '@/lib/work/auth/permissions'
import { getUser } from '@/lib/work/auth/session'
import { safeRedirectPath } from '@/lib/work/validation/auth'
import { LoginForm } from './login-form'

export const metadata = { title: 'เข้าสู่ระบบ' }

/**
 * Login.
 *
 * Rendered outside the app shell — there is no workspace to frame until
 * someone is signed in. An already-authenticated visitor is sent on rather
 * than shown a form they do not need.
 */
export default async function LoginPage({ searchParams }: PageProps<'/work/login'>) {
  const params = await searchParams
  const next = safeRedirectPath(typeof params.next === 'string' ? params.next : null, '')

  const user = await getUser()
  if (user) {
    redirect(next || (await resolveLandingPath()))
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
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
          <span>Centered101&apos;s Work</span>
        </div>
        <h1>เข้าสู่ระบบ</h1>
        <p className="muted">เข้าสู่พื้นที่ทำงานเพื่อจัดการโปรเจกต์และการชำระเงิน</p>

        <LoginForm next={next || undefined} />

        <p className="secure-note">
          <ShieldCheck size={13} /> การเชื่อมต่อถูกเข้ารหัสแบบต้นทางถึงปลายทาง
        </p>
      </div>
      <Footer />
    </div>
  )
}
