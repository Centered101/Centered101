import { PlannedRoute } from '@/components/work/states/planned-route'

export const metadata = { title: 'โปรเจกต์ — flowstate' }

export default function AdminProjectsPage() {
  return (
    <PlannedRoute
      title={'โปรเจกต์'}
      description={'โปรเจกต์ทั้งหมดในพื้นที่ทำงาน'}
      phase={'เฟส 5'}
    />
  )
}
