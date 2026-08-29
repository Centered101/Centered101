import { LegalSection, LegalShell } from '@/components/work/layout/legal-shell'
import { LEGAL, LEGAL_UPDATED } from '@/lib/work/legal'

export const metadata = { title: 'นโยบายความเป็นส่วนตัว' }

/**
 * Privacy notice for the workspace.
 *
 * WHAT IS DESCRIBED HERE WAS CHECKED AGAINST THE CODE, not written from a
 * template: the tables listed are the tables that exist, the cookies named are
 * the only cookies /work sets, and the access rules stated are the ones RLS
 * actually enforces. If any of that changes, this page changes with it —
 * a privacy notice that describes a system you no longer run is worse than
 * none, because it is a written claim that is false.
 *
 * The operating entity's own details come from lib/work/legal.ts and are still
 * placeholders. See the warning at the top of that file.
 */
export default function WorkPrivacyPolicyPage() {
  return (
    <LegalShell
      title="นโยบายความเป็นส่วนตัว"
      intro={`นโยบายนี้อธิบายว่า ${LEGAL.serviceName} เก็บ ใช้ และปกป้องข้อมูลของคุณอย่างไร`}
      updated={LEGAL_UPDATED.privacy}
    >
      <LegalSection title="1. ผู้ควบคุมข้อมูล">
        <p>
          {LEGAL.entityName} เป็นผู้ควบคุมข้อมูลส่วนบุคคลที่ประมวลผลผ่าน {LEGAL.serviceUrl}
          {' '}หากมีคำถามหรือต้องการใช้สิทธิ์ของคุณ ติดต่อได้ที่{' '}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>
        </p>
        {/* Rendered only once a real address is set. A privacy notice that
            shows "ที่อยู่: —" is worse than one that omits the line: it looks
            like the field was answered. */}
        {LEGAL.address !== '—' && <p>ที่อยู่ {LEGAL.address}</p>}
      </LegalSection>

      <LegalSection title="2. ข้อมูลที่เราเก็บ">
        <p>เราเก็บเฉพาะข้อมูลที่จำเป็นต่อการให้บริการพื้นที่ทำงานนี้ ได้แก่</p>
        <ul>
          <li>
            <strong>ข้อมูลบัญชี</strong> — อีเมล ชื่อที่แสดง และรูปโปรไฟล์ หากคุณเข้าสู่ระบบด้วย
            Google เราจะได้รับข้อมูลเหล่านี้จากบัญชี Google ของคุณ เราไม่เคยเห็นรหัสผ่าน Google ของคุณ
          </li>
          <li>
            <strong>ข้อมูลโปรเจกต์</strong> — ชื่อโปรเจกต์ ขอบเขตงาน สถานะ ความคืบหน้า
            กำหนดส่งมอบ และเงื่อนไขการส่งมอบ ซึ่งทีมงานเป็นผู้บันทึก
          </li>
          <li>
            <strong>ข้อมูลการเงิน</strong> — มูลค่าโปรเจกต์ งวดการชำระเงิน ใบแจ้งหนี้ และบันทึกการรับชำระ
            เราไม่เก็บหมายเลขบัตรเครดิตหรือข้อมูลบัตรใด ๆ บนระบบของเรา
          </li>
          <li>
            <strong>เอกสาร</strong> — ไฟล์ที่อัปโหลดเข้าโปรเจกต์ เช่น ใบเสนอราคา ใบแจ้งหนี้ และสัญญา
          </li>
          <li>
            <strong>บันทึกกิจกรรม</strong> — การกระทำสำคัญในระบบ พร้อมผู้ทำ เวลา และรายการที่เกี่ยวข้อง
            บันทึกนี้แก้ไขหรือลบไม่ได้ เพราะมีไว้เพื่อการตรวจสอบย้อนหลัง
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. วัตถุประสงค์ในการใช้ข้อมูล">
        <p>
          เราใช้ข้อมูลข้างต้นเพื่อให้บริการตามสัญญาที่ตกลงกันไว้เท่านั้น ได้แก่
          การยืนยันตัวตนและควบคุมสิทธิ์เข้าถึง การแสดงสถานะโปรเจกต์และยอดค้างชำระ
          การออกและจัดเก็บเอกสาร และการตรวจสอบย้อนหลังเมื่อเกิดข้อโต้แย้ง
        </p>
        <p>
          <strong>เราไม่ขายข้อมูลส่วนบุคคลของคุณ</strong> และไม่ใช้ข้อมูลโปรเจกต์ของลูกค้ารายหนึ่ง
          เพื่อประโยชน์ของอีกราย
        </p>
      </LegalSection>

      <LegalSection title="4. สิทธิ์การเข้าถึงข้อมูล">
        <p>
          การแบ่งแยกข้อมูลระหว่างลูกค้าบังคับใช้ที่ชั้นฐานข้อมูลด้วย Row Level Security
          ไม่ใช่แค่การซ่อนเมนูในหน้าจอ ลูกค้าแต่ละรายเห็นได้เฉพาะโปรเจกต์ที่ถูกเพิ่มเข้าไปเท่านั้น
          การเดา URL หรือรหัสโปรเจกต์ของรายอื่นจะไม่ได้ข้อมูลกลับไป
        </p>
        <p>
          ไฟล์เอกสารเก็บในที่จัดเก็บแบบไม่เปิดสาธารณะ การดาวน์โหลดแต่ละครั้งต้องผ่านการตรวจสอบสิทธิ์
          และได้ลิงก์ที่มีอายุสั้นเท่านั้น
        </p>
      </LegalSection>

      <LegalSection title="5. คุกกี้">
        <p>
          พื้นที่ทำงานนี้ใช้คุกกี้เพื่อรักษาสถานะการเข้าสู่ระบบเท่านั้น หากไม่มีคุกกี้นี้
          คุณจะต้องเข้าสู่ระบบใหม่ทุกครั้งที่เปลี่ยนหน้า เราไม่ใช้คุกกี้เพื่อโฆษณาหรือติดตามข้ามเว็บไซต์
        </p>
        <p>
          เว็บไซต์อาจเปิดใช้ Vercel Analytics เพื่อวัดประสิทธิภาพหน้าเว็บในภาพรวม
          ซึ่งเป็นการเก็บสถิติแบบไม่ระบุตัวตนและไม่ใช้คุกกี้
        </p>
      </LegalSection>

      <LegalSection title="6. ผู้ให้บริการภายนอก">
        <p>เราใช้ผู้ให้บริการโครงสร้างพื้นฐานเท่าที่จำเป็น และแต่ละรายเข้าถึงได้เฉพาะส่วนที่ต้องใช้</p>
        <ul>
          <li>
            <strong>Supabase</strong> — ฐานข้อมูล ระบบยืนยันตัวตน และที่จัดเก็บไฟล์
          </li>
          <li>
            <strong>Vercel</strong> — โฮสติ้งและการส่งข้อมูลผ่านเครือข่าย
          </li>
          <li>
            <strong>Google</strong> — เฉพาะเมื่อคุณเลือกเข้าสู่ระบบด้วยบัญชี Google
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="7. ระยะเวลาเก็บรักษา">
        <p>
          ข้อมูลโปรเจกต์ เอกสาร และบันทึกทางการเงินจะถูกเก็บไว้ตลอดระยะเวลาที่ยังมีความสัมพันธ์ทางธุรกิจ
          และหลังจากนั้นตามระยะเวลาที่กฎหมายบัญชีและภาษีกำหนด บันทึกกิจกรรมถูกออกแบบให้แก้ไขไม่ได้
          จึงจะคงอยู่ตราบเท่าที่โปรเจกต์ที่เกี่ยวข้องยังอยู่
        </p>
      </LegalSection>

      <LegalSection title="8. สิทธิ์ของคุณ">
        <p>
          ภายใต้พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล คุณมีสิทธิ์ขอเข้าถึง ขอสำเนา ขอแก้ไขให้ถูกต้อง
          ขอให้ลบ ขอให้ระงับการใช้ และคัดค้านการประมวลผลข้อมูลส่วนบุคคลของคุณ
          ส่งคำขอได้ที่ <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>
        </p>
        <p>
          โปรดทราบว่าคำขอให้ลบข้อมูลอาจถูกจำกัดด้วยหน้าที่ตามกฎหมาย เช่น
          เอกสารทางบัญชีที่ต้องเก็บตามกำหนดระยะเวลา
        </p>
      </LegalSection>

      <LegalSection title="9. ความปลอดภัย">
        <p>
          การเชื่อมต่อทั้งหมดเข้ารหัสระหว่างทาง สิทธิ์เข้าถึงข้อมูลบังคับใช้ที่ชั้นฐานข้อมูล
          และคีย์ที่มีสิทธิ์สูงไม่เคยถูกส่งไปยังเบราว์เซอร์ อย่างไรก็ตาม
          ไม่มีระบบใดปลอดภัยอย่างสมบูรณ์ หากพบช่องโหว่ กรุณาแจ้งเราตามช่องทางติดต่อข้างต้น
        </p>
      </LegalSection>

      <LegalSection title="10. การเปลี่ยนแปลงนโยบาย">
        <p>
          หากมีการแก้ไขนโยบายนี้ เราจะปรับวันที่ &ldquo;ปรับปรุงล่าสุด&rdquo; ด้านบน
          และแจ้งให้ทราบหากเป็นการเปลี่ยนแปลงที่มีนัยสำคัญต่อสิทธิ์ของคุณ
        </p>
      </LegalSection>
    </LegalShell>
  )
}
