import { PlannedRoute } from '@/components/work/states/planned-route'

export const metadata = { title: 'โปรเจกต์ — flowstate' }

export default function PortalProjectsPage() {
  return (
    <PlannedRoute
      title={'โปรเจกต์ของคุณ'}
      description={'โปรเจกต์ทั้งหมดที่คุณเข้าถึงได้'}
      phase={'เฟส 9'}
    />
  )
}
