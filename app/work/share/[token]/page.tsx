import Image from 'next/image'
import type { Metadata } from 'next'

import { isPlausibleShareToken } from '@/lib/work/tokens'

/**
 * Public share link.
 *
 * Outside both portals and outside the app shell — the viewer is anonymous by
 * design and must never see workspace chrome, navigation, or anything about
 * the organisation beyond the single shared resource.
 *
 * Today this only validates the token's shape. Resolution against
 * `share_links` — exists, not revoked, not expired, view budget remaining,
 * password if set, all checked *before* any project data is loaded — arrives
 * with Phase 13. It fails closed in the meantime.
 */
export const metadata: Metadata = {
  title: 'ลิงก์แชร์',
  // A share link must never reach a search index.
  robots: { index: false, follow: false },
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const plausible = isPlausibleShareToken(token)

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
        <h1>{plausible ? 'ลิงก์นี้ยังไม่พร้อมใช้งาน' : 'ลิงก์ไม่ถูกต้อง'}</h1>
        <p className="muted">
          {plausible
            ? 'ระบบลิงก์แชร์จะเปิดใช้งานในเฟส 13 — ขณะนี้ยังไม่สามารถเปิดดูเนื้อหาได้'
            : 'ลิงก์นี้ไม่ถูกต้อง หมดอายุ หรือถูกยกเลิกแล้ว'}
        </p>
      </div>
    </div>
  )
}
