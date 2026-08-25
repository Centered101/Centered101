import { PlannedRoute } from '@/components/work/states/planned-route'

export const metadata = { title: 'เอกสาร — flowstate' }

export default function PortalDocumentsPage() {
  return (
    <PlannedRoute
      eyebrow="โปรเจกต์"
      title={'เอกสาร'}
      description={'ใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ และสัญญา'}
      phase={'เฟส 15'}
    />
  )
}
