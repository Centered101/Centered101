import { PlannedRoute } from '@/components/work/states/planned-route'

export const metadata = { title: 'คำขอเปลี่ยนแปลง — flowstate' }

export default function PortalChangeRequestsPage() {
  return (
    <PlannedRoute
      eyebrow="โปรเจกต์"
      title={'คำขอเปลี่ยนแปลง'}
      description={'ส่งและติดตามคำขอเปลี่ยนแปลง'}
      phase={'เฟส 14'}
    />
  )
}
