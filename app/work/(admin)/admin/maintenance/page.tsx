import { PlannedRoute } from '@/components/work/states/planned-route'

export const metadata = { title: 'การดูแลรักษา — flowstate' }

export default function AdminMaintenancePage() {
  return (
    <PlannedRoute
      title={'การดูแลรักษา'}
      description={'แพ็กเกจดูแลรักษาและรอบการเรียกเก็บเงิน'}
      phase={'เฟส 17'}
    />
  )
}
