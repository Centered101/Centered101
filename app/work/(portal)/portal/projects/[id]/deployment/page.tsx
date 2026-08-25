import { PlannedRoute } from '@/components/work/states/planned-route'

export const metadata = { title: 'การเผยแพร่ — flowstate' }

export default function PortalDeploymentPage() {
  return (
    <PlannedRoute
      eyebrow="โปรเจกต์"
      title={'การเผยแพร่'}
      description={'สถานะการเผยแพร่ โดเมน และเวอร์ชัน'}
      phase={'เฟส 16'}
    />
  )
}
