import { PlannedRoute } from '@/components/work/states/planned-route'

export const metadata = { title: 'การชำระเงิน — flowstate' }

export default function PortalPaymentsPage() {
  return (
    <PlannedRoute
      eyebrow="โปรเจกต์"
      title={'การชำระเงิน'}
      description={'ไมล์สโตนและประวัติการชำระเงินของโปรเจกต์นี้'}
      phase={'เฟส 10'}
    />
  )
}
