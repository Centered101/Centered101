import { PlannedRoute } from '@/components/work/states/planned-route'

export const metadata = { title: 'ตัวอย่างงาน — flowstate' }

export default function PortalPreviewPage() {
  return (
    <PlannedRoute
      eyebrow="โปรเจกต์"
      title={'ตัวอย่างงาน'}
      description={'ดูตัวอย่างงานล่าสุดและประวัติเวอร์ชัน'}
      phase={'เฟส 13'}
    />
  )
}
