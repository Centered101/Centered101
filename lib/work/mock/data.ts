/**
 * MOCK DATA — lifted verbatim from the v0 prototype.
 *
 * This exists so the UI keeps rendering while the schema is built in Phase 2.
 * Every export here is replaced by a Supabase query; nothing in this file is
 * a source of truth and nothing should gain business logic.
 *
 * Values are display strings (already formatted, e.g. "฿30,000") exactly as
 * the prototype had them. Real money becomes integer minor units in Phase 2 —
 * see docs/ARCHITECTURE.md §5.
 */

export type MockProject = {
  id: string
  client: string
  name: string
  status: string
  progress: number
  amount: string
  paid: string
  tone: string
}

export const mockProjects: MockProject[] = [
  {
    id: 'PRJ-2026-001',
    client: 'ABC Company',
    name: 'เว็บไซต์องค์กร',
    status: 'กำลังดำเนินการ',
    progress: 75,
    amount: '฿30,000',
    paid: '฿20,000',
    tone: 'blue',
  },
  {
    id: 'PRJ-2026-002',
    client: 'Nara Studio',
    name: 'แพลตฟอร์มจองบริการ',
    status: 'กำลังดำเนินการ',
    progress: 42,
    amount: '฿48,000',
    paid: '฿24,000',
    tone: 'violet',
  },
  {
    id: 'PRJ-2026-003',
    client: 'Kite Logistics',
    name: 'แดชบอร์ดปฏิบัติการ',
    status: 'เสร็จสมบูรณ์',
    progress: 100,
    amount: '฿55,000',
    paid: '฿55,000',
    tone: 'green',
  },
  {
    id: 'PRJ-2026-004',
    client: 'Mellow Cafe',
    name: 'ปรับปรุงอีคอมเมิร์ซ',
    status: 'รอดำเนินการ',
    progress: 12,
    amount: '฿22,000',
    paid: '฿8,000',
    tone: 'orange',
  },
]

/** Monthly revenue bar heights, as percentages of the chart area. */
export const mockRevenueBars = [38, 52, 44, 66, 51, 78, 63, 89, 74, 96, 82, 100]

export const mockMonthLabels = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
]

export type MockTimelineItem = {
  title: string
  status: string
  state: 'done' | 'active' | 'pending' | 'locked'
}

export const mockTimeline: MockTimelineItem[] = [
  { title: 'เก็บความต้องการ', status: 'เสร็จแล้ว', state: 'done' },
  { title: 'ออกแบบ UI', status: 'เสร็จแล้ว', state: 'done' },
  { title: 'พัฒนาเว็บไซต์', status: 'เสร็จแล้ว', state: 'done' },
  { title: 'ทดสอบระบบ', status: 'กำลังดำเนินการ', state: 'active' },
  { title: 'อนุมัติขั้นสุดท้าย', status: 'รอดำเนินการ', state: 'pending' },
  { title: 'ส่งมอบงาน', status: 'ล็อกอยู่', state: 'locked' },
]

export type MockActivity = {
  tone: 'blue' | 'green' | 'violet' | 'orange'
  icon: 'payment' | 'check' | 'branch' | 'file'
  title: string
  detail: string
  time: string
}

export const mockActivity: MockActivity[] = [
  {
    tone: 'blue',
    icon: 'payment',
    title: 'ได้รับการชำระเงิน',
    detail: 'ABC Company ชำระ ฿10,000',
    time: '12 นาที',
  },
  {
    tone: 'green',
    icon: 'check',
    title: 'ไมล์สโตนเสร็จสมบูรณ์',
    detail: 'Kite Logistics · พัฒนาเว็บไซต์',
    time: '2 ชม.',
  },
  {
    tone: 'violet',
    icon: 'branch',
    title: 'เผยแพร่สำเร็จ',
    detail: 'abc-company.com · v1.4.2',
    time: '4 ชม.',
  },
  {
    tone: 'orange',
    icon: 'file',
    title: 'คำขอเปลี่ยนแปลงใหม่',
    detail: 'Nara Studio · #004',
    time: '1 วัน',
  },
]

/** The single project surfaced in the client portal prototype. */
export const mockClientProject = {
  code: 'PRJ-2026-001',
  name: 'เว็บไซต์ ABC Company',
  subtitle: 'เว็บไซต์องค์กร · เริ่ม 12 ส.ค. 2569',
  status: 'กำลังดำเนินการ',
  progress: 75,
  progressNote: 'กำลังทดสอบระบบ',
  value: '฿30,000',
  paid: '฿25,000',
  remaining: '฿5,000',
  owner: 'ABC Company',
  sourceOwnership: 'ลูกค้าเป็นเจ้าของ',
  sourceAccess: 'เข้าถึงได้เต็มรูปแบบ',
  hosting: 'ดูแลโดยผู้พัฒนา',
  repository: 'centered101/abc-company-web',
}

export const mockMaintenance = {
  planName: 'แพ็กเกจดูแลเว็บไซต์',
  price: '฿1,500',
  period: '/ เดือน',
  nextBilling: '24 ก.ย. 2569',
  services: ['โฮสติ้ง', 'สำรองข้อมูล', 'แก้ไขข้อผิดพลาด', 'ความปลอดภัย'],
}

export const mockCurrentUser = {
  name: 'Centered101',
  email: 'admin@centered.dev',
  initial: 'C',
}

export const mockClientOrg = {
  name: 'ABC Company',
  initial: 'A',
}
