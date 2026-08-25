import { PlannedRoute } from '@/components/work/states/planned-route'

export const metadata = { title: 'ใบแจ้งหนี้ — flowstate' }

export default function AdminInvoicesPage() {
  return (
    <PlannedRoute
      title={'ใบแจ้งหนี้'}
      description={'ใบแจ้งหนี้ ใบเสร็จ และใบกำกับภาษี'}
      phase={'เฟส 15'}
    />
  )
}
