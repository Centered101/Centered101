import { PlannedRoute } from '@/components/work/states/planned-route'

export const metadata = { title: 'คำขอเปลี่ยนแปลง — flowstate' }

export default function AdminChangeRequestsPage() {
  return (
    <PlannedRoute
      title={'คำขอเปลี่ยนแปลง'}
      description={'คำขอเปลี่ยนแปลงที่รออนุมัติ'}
      phase={'เฟส 14'}
    />
  )
}
