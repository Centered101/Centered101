import Image from 'next/image'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export const metadata = { title: 'เข้าสู่ระบบไม่สำเร็จ' }

/**
 * Shown when the code exchange in /auth/callback fails — an expired magic
 * link, a cancelled OAuth consent, or a provider that is not configured.
 *
 * The reason is displayed because these are almost always self-inflicted
 * configuration problems that the operator needs to see. It comes from
 * Supabase, not from user input, and is rendered as text by React.
 */
export default async function AuthCodeErrorPage({
  searchParams,
}: PageProps<'/work/auth/auth-code-error'>) {
  const params = await searchParams
  const reason = typeof params.reason === 'string' ? params.reason : null

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

        <div className="stat-icon icon-red">
          <AlertCircle size={18} />
        </div>

        <h1>เข้าสู่ระบบไม่สำเร็จ</h1>
        <p className="muted">
          ลิงก์อาจหมดอายุ ถูกใช้ไปแล้ว หรือคุณยกเลิกการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง
        </p>

        {reason && <p className="auth-notice">{reason}</p>}

        <Link className="primary full" href="/work/login" style={{ marginTop: 20 }}>
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </div>
  )
}
