import Link from 'next/link'

import { LegalSection, LegalShell } from '@/components/work/layout/legal-shell'
import { APP_NAME } from '@/lib/work/branding'
import { LEGAL } from '@/lib/work/legal'

export const metadata = { title: 'เกี่ยวกับพื้นที่ทำงานนี้' }

/**
 * A plain-language introduction to the workspace.
 *
 * PUBLIC, like the two legal pages — someone linked here from the login screen
 * or a proposal has no session yet, so this route lives outside the app shell
 * and borrows the same LegalShell frame. Despite the component's name it is
 * generic prose chrome, not privacy-specific.
 *
 * SCOPE: this describes what the software is and what each side can do with it.
 * It is not the commercial agreement (that is the per-project contract) and not
 * the rules of use (that is /work/terms-of-service). Every capability named
 * below maps to a route that exists under app/work — if a feature is removed,
 * its line here goes with it, the same standard the privacy page is held to.
 *
 * `updated` is kept here rather than in lib/work/legal.ts because that file is
 * for the two documents a lawyer needs to review; this page is not one of them.
 */
const ABOUT_UPDATED = '2026-09-09'

export default function WorkAboutPage() {
  return (
    <LegalShell
      title="เกี่ยวกับพื้นที่ทำงานนี้"
      intro={`${APP_NAME} คือพื้นที่ทำงานร่วมกันระหว่างทีมงานกับลูกค้า สำหรับติดตามโปรเจกต์ตั้งแต่เริ่มจนส่งมอบและดูแลต่อ`}
      updated={ABOUT_UPDATED}
    >
      <LegalSection title="1. พื้นที่ทำงานนี้คืออะไร">
        <p>
          {APP_NAME} ({LEGAL.serviceUrl}) เป็นที่เดียวที่รวมทุกอย่างของโปรเจกต์ไว้ด้วยกัน —
          สถานะงาน ความคืบหน้า กำหนดส่งมอบ ยอดค้างชำระ เอกสาร ตัวอย่างงาน และประวัติการเปลี่ยนแปลง
          แทนที่จะกระจายอยู่ในอีเมล แชท และไฟล์แนบหลายที่
        </p>
        <p>
          พื้นที่ทำงานมีสองด้านที่ใช้ข้อมูลชุดเดียวกัน <strong>ฝั่งลูกค้า</strong> สำหรับติดตามและอนุมัติงาน
          และ <strong>ฝั่งทีมงาน</strong> สำหรับบริหารโปรเจกต์ทั้งหมด ระบบจะพาคุณไปยังฝั่งที่ตรงกับสิทธิ์ของคุณโดยอัตโนมัติหลังเข้าสู่ระบบ
        </p>
      </LegalSection>

      <LegalSection title="2. สำหรับลูกค้า — ทำอะไรได้บ้าง">
        <ul>
          <li>
            <strong>ดูสถานะและความคืบหน้า</strong> ของแต่ละโปรเจกต์ พร้อม milestone และไทม์ไลน์กิจกรรม
          </li>
          <li>
            <strong>ตรวจงวดการชำระเงินและยอดค้าง</strong> ชำระผ่านช่องทางออนไลน์ หรือแนบหลักฐานการโอนให้ทีมงานตรวจสอบ
          </li>
          <li>
            <strong>เปิดเอกสาร</strong> — ใบเสนอราคา ใบแจ้งหนี้ สัญญา — และดาวน์โหลดผ่านลิงก์ที่มีอายุสั้น
          </li>
          <li>
            <strong>ดูตัวอย่างงานและรีวิว</strong> กดอนุมัติหรือขอแก้ไขในแต่ละรอบได้จากในระบบ
          </li>
          <li>
            <strong>ส่งคำขอเปลี่ยนแปลง</strong> (change request) พร้อมรายละเอียด และติดตามว่าทีมงานรับไปทำถึงไหน
          </li>
          <li>
            <strong>รับการส่งมอบ</strong> — ไฟล์งาน ซอร์สโค้ด ข้อมูลการดีพลอยและการเผยแพร่ — เมื่อโปรเจกต์เสร็จและชำระเงินครบ
          </li>
          <li>
            <strong>ติดตามการดูแลรักษา</strong> หลังส่งมอบ ทั้งงานที่กำลังทำและรายการที่รออยู่
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. สำหรับทีมงานเอเจนซี">
        <p>ฝั่งผู้ดูแลเป็นแดชบอร์ดบริหารงานทั้งเอเจนซีในที่เดียว</p>
        <ul>
          <li>
            <strong>โปรเจกต์</strong> — สร้าง กำหนดขอบเขต ราคา งวดชำระ ผู้เกี่ยวข้อง และเดินสถานะตั้งแต่เริ่มจนปิดงาน
          </li>
          <li>
            <strong>ลูกค้าและสมาชิก</strong> — เชิญเข้าโปรเจกต์เป็นรายคน กำหนดสิทธิ์ต่อโปรเจกต์
          </li>
          <li>
            <strong>การเงิน</strong> — ออกใบแจ้งหนี้ บันทึกการรับชำระ และยืนยันหลักฐานการโอนที่ลูกค้าแนบมา
          </li>
          <li>
            <strong>Milestone และคำขอเปลี่ยนแปลง</strong> — คิวงานรวมทุกโปรเจกต์ ไม่ต้องไล่ทีละที่
          </li>
          <li>
            <strong>รีวิวงาน การส่งมอบ การดีพลอย และการดูแลรักษา</strong> — จัดการรอบตรวจงานและปล่อยงานให้ลูกค้าเห็น
          </li>
          <li>
            <strong>กล่องงานเข้าและบันทึกกิจกรรม</strong> — สิ่งที่ต้องจัดการ และประวัติที่แก้ไม่ได้เพื่อการตรวจสอบย้อนหลัง
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. สิทธิ์การเข้าถึงและความปลอดภัย">
        <p>
          การแบ่งแยกข้อมูลระหว่างลูกค้าบังคับใช้ที่ชั้นฐานข้อมูลด้วย Row Level Security ไม่ใช่แค่ซ่อนเมนู
          ลูกค้าแต่ละรายเห็นเฉพาะโปรเจกต์ที่ถูกเพิ่มเข้าไป การเดา URL หรือรหัสโปรเจกต์ของรายอื่นจะไม่ได้ข้อมูลกลับไป
        </p>
        <p>
          ไฟล์เอกสารและซอร์สโค้ดเก็บในที่จัดเก็บแบบไม่เปิดสาธารณะ ทุกการดาวน์โหลดต้องผ่านการตรวจสอบสิทธิ์
          และได้ลิงก์ที่หมดอายุในเวลาสั้น ๆ การเชื่อมต่อทั้งหมดถูกเข้ารหัสระหว่างทาง
        </p>
      </LegalSection>

      <LegalSection title="5. เริ่มต้นใช้งาน">
        <p>
          บัญชีผูกกับอีเมลของคุณ เข้าสู่ระบบด้วย Google หรืออีเมลและรหัสผ่านก็ได้ หลังเข้าสู่ระบบ
          ระบบจะพาไปยังฝั่งที่ตรงกับสิทธิ์ของคุณเอง — ไม่มีการเลือกพอร์ทัลด้วยตนเอง
        </p>
        <p>
          ถ้าได้รับคำเชิญเข้าโปรเจกต์ ลิงก์ในอีเมลจะพาไปหน้ายอมรับคำเชิญ เมื่อยอมรับแล้วโปรเจกต์นั้นจะปรากฏในรายการของคุณ
          หากต้องการให้เพื่อนร่วมงานเข้าถึงด้วย แจ้งทีมงานเพื่อเพิ่มบัญชีของเขา อย่าแบ่งปันบัญชีเดียวกัน
        </p>
        <p>
          <Link href="/work">ไปที่พื้นที่ทำงาน</Link>
        </p>
      </LegalSection>

      <LegalSection title="6. เอกสารและการติดต่อ">
        <p>
          ตัวเลขและสถานะในพื้นที่ทำงานมีไว้เพื่อความสะดวกในการติดตาม เอกสารที่ออกอย่างเป็นทางการเช่นใบแจ้งหนี้และใบเสร็จเป็นหลักฐานที่ใช้อ้างอิง
          และเงื่อนไขทางธุรกิจทั้งหมดเป็นไปตามสัญญาของแต่ละโปรเจกต์
        </p>
        <ul>
          <li>
            <Link href="/work/terms-of-service">ข้อกำหนดการใช้งาน</Link>
          </li>
          <li>
            <Link href="/work/privacy-policy">นโยบายความเป็นส่วนตัว</Link>
          </li>
          <li>
            ติดต่อทีมงาน · <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>
          </li>
        </ul>
      </LegalSection>
    </LegalShell>
  )
}
