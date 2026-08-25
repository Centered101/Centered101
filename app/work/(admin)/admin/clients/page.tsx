import { PlannedRoute } from '@/components/work/states/planned-route'

export const metadata = { title: 'ลูกค้า — flowstate' }

export default function AdminClientsPage() {
  return (
    <PlannedRoute
      title={'ลูกค้า'}
      description={'จัดการข้อมูลลูกค้าและผู้ติดต่อทั้งหมด'}
      phase={'เฟส 5'}
    />
  )
}
