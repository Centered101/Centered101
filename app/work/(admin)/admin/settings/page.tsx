import { PlannedRoute } from '@/components/work/states/planned-route'

export const metadata = { title: 'ตั้งค่า — flowstate' }

export default function AdminSettingsPage() {
  return (
    <PlannedRoute
      title={'ตั้งค่า'}
      description={'ตั้งค่าพื้นที่ทำงานและทีมงาน'}
      phase={'เฟส 5'}
    />
  )
}
