import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, ShieldCheck } from 'lucide-react'

import { AuthBrand } from '@/components/work/layout/auth-brand'
import { Footer } from '@/components/work/layout/footer'
import { getAccessContext, resolveLandingPath } from '@/lib/work/auth/permissions'
import { APP_NAME } from '@/lib/work/branding'

/**
 * Root entry point.
 *
 * SIGNED IN → routed by ROLE, read from the database. Agency staff land on the
 * admin dashboard, clients on their portal. Nothing here reads a preference, a
 * cookie or a stored "last portal" — where a person belongs is a fact about
 * their membership rows, and only those decide it.
 *
 * SIGNED OUT → a plain-language landing page, not a bounce straight to the
 * login form. Someone arriving from a proposal or an email link should see what
 * this workspace is before being asked to sign in. The only action it offers is
 * เข้าสู่ระบบ; there is no public sign-up — accounts are created by invitation.
 */
export default async function RootPage() {
  const context = await getAccessContext()
  if (context) redirect(await resolveLandingPath())

  return (
    <div className="legal-page work-home">
      <article className="panel work-home-hero">
        <AuthBrand />
        <h1>พื้นที่ทำงานร่วมกันระหว่างทีมงานกับลูกค้า</h1>
        <p className="muted">
          {APP_NAME} รวมทุกอย่างของโปรเจกต์ไว้ที่เดียว — สถานะงาน ความคืบหน้า กำหนดส่งมอบ
          ยอดค้างชำระ เอกสาร ตัวอย่างงาน และประวัติการเปลี่ยนแปลง แทนที่จะกระจายอยู่ในอีเมลและแชทหลายที่
        </p>

        <div className="work-home-cta">
          <Link className="primary" href="/work/login">
            เข้าสู่ระบบ
            <ArrowRight size={15} />
          </Link>
          <Link className="outline" href="/work/about">
            พื้นที่ทำงานนี้คืออะไร
          </Link>
        </div>

        <p className="secure-note">
          <ShieldCheck size={13} /> การเชื่อมต่อถูกเข้ารหัสแบบต้นทางถึงปลายทาง · บัญชีสร้างโดยคำเชิญเท่านั้น
        </p>
      </article>

      <section className="work-home-features">
        <div className="work-home-feature">
          <h2>ติดตามได้ทุกขั้น</h2>
          <p>สถานะ ความคืบหน้า milestone และไทม์ไลน์กิจกรรมของแต่ละโปรเจกต์ อยู่ในที่เดียว</p>
        </div>
        <div className="work-home-feature">
          <h2>อนุมัติงานเป็นรอบ</h2>
          <p>ดูตัวอย่างงาน กดอนุมัติหรือขอแก้ไข และส่งคำขอเปลี่ยนแปลงพร้อมรายละเอียดได้จากในระบบ</p>
        </div>
        <div className="work-home-feature">
          <h2>การเงินโปร่งใส</h2>
          <p>งวดการชำระเงินและยอดค้าง ใบแจ้งหนี้ ชำระออนไลน์หรือแนบหลักฐานการโอนให้ทีมงานตรวจสอบ</p>
        </div>
        <div className="work-home-feature">
          <h2>ส่งมอบและดูแลต่อ</h2>
          <p>ไฟล์งาน ซอร์สโค้ด ข้อมูลการดีพลอยและการเผยแพร่ พร้อมการติดตามงานดูแลรักษาหลังส่งมอบ</p>
        </div>
      </section>

      <Footer />
    </div>
  )
}
