import type { Metadata } from 'next'

import { AuthBrand } from '@/components/work/layout/auth-brand'
import { Footer } from '@/components/work/layout/footer'
import { resolveShareLink } from '@/lib/work/queries/share-links'

/**
 * Public share link.
 *
 * Outside both portals and outside the app shell — the viewer is anonymous by
 * design and must never see workspace chrome, navigation, or anything about
 * the organisation beyond the single shared project's preview.
 *
 * Resolution happens entirely in `resolveShareLink()` (queries/share-links.ts)
 * with the privileged client, because there is no session here for RLS to
 * scope. This page only turns that result into one of a small set of Thai
 * messages — it never learns, and never shows, which specific check failed
 * beyond "invalid" / "revoked" / "expired" / "view limit reached". Collapsing
 * those into one visible message on the page (below) is deliberate: token
 * enumeration should learn nothing from the response.
 */
export const metadata: Metadata = {
  title: 'ลิงก์แชร์',
  // A share link must never reach a search index.
  robots: { index: false, follow: false },
}

const MESSAGES: Record<'invalid' | 'revoked' | 'expired' | 'exhausted', string> = {
  invalid: 'ลิงก์นี้ไม่ถูกต้อง',
  revoked: 'ลิงก์นี้ถูกยกเลิกแล้ว',
  expired: 'ลิงก์นี้หมดอายุแล้ว',
  exhausted: 'ลิงก์นี้ถูกเปิดดูครบจำนวนที่กำหนดแล้ว',
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const result = await resolveShareLink(token)

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <AuthBrand />
        {result.status === 'ok' ? (
          <>
            <h1>{result.projectName}</h1>
            {result.previewUrl ? (
              <>
                <p className="muted">ลิงก์แสดงตัวอย่างของโปรเจกต์นี้</p>
                <a className="primary" href={result.previewUrl} target="_blank" rel="noreferrer noopener">
                  เปิดดูตัวอย่าง
                </a>
              </>
            ) : (
              <p className="muted">ยังไม่มีลิงก์ตัวอย่างสำหรับโปรเจกต์นี้</p>
            )}
          </>
        ) : (
          <>
            <h1>เปิดลิงก์ไม่ได้</h1>
            <p className="muted">{MESSAGES[result.status]}</p>
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}
