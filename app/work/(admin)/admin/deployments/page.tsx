import { PlannedRoute } from '@/components/work/states/planned-route'

export const metadata = { title: 'การเผยแพร่ — flowstate' }

export default function AdminDeploymentsPage() {
  return (
    <PlannedRoute
      title={'การเผยแพร่'}
      description={'สถานะการเผยแพร่ทั้งตัวอย่างและใช้งานจริง'}
      phase={'เฟส 16'}
    />
  )
}
