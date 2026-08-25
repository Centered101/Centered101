import { PlannedRoute } from '@/components/work/states/planned-route'

export const metadata = { title: 'ไฟล์ — flowstate' }

export default function AdminDocumentsPage() {
  return (
    <PlannedRoute
      title={'ไฟล์'}
      description={'เอกสารและไฟล์ทั้งหมดของโปรเจกต์'}
      phase={'เฟส 15'}
    />
  )
}
