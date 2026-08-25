import { PlannedRoute } from '@/components/work/states/planned-route'

export const metadata = { title: 'การชำระเงิน — flowstate' }

export default function AdminPaymentsPage() {
  return (
    <PlannedRoute
      title={'การชำระเงิน'}
      description={'ติดตามการชำระเงินทุกโปรเจกต์'}
      phase={'เฟส 10'}
    />
  )
}
