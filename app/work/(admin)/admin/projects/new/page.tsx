import { PlannedRoute } from '@/components/work/states/planned-route'

export const metadata = { title: 'สร้างโปรเจกต์ — flowstate' }

export default function AdminNewProjectPage() {
  return (
    <PlannedRoute
      title={'สร้างโปรเจกต์'}
      description={'ตัวช่วยสร้างโปรเจกต์ 10 ขั้นตอน'}
      phase={'เฟส 6'}
    />
  )
}
