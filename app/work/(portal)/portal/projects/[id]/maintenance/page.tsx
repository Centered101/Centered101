import { PlannedRoute } from '@/components/work/states/planned-route'

export const metadata = { title: 'การดูแลรักษา — flowstate' }

export default function PortalMaintenancePage() {
  return (
    <PlannedRoute
      eyebrow="โปรเจกต์"
      title={'การดูแลรักษา'}
      description={'แพ็กเกจดูแลรักษาและการเรียกเก็บเงิน'}
      phase={'เฟส 17'}
    />
  )
}
