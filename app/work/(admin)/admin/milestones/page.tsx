import { PlannedRoute } from '@/components/work/states/planned-route'

export const metadata = { title: 'ไมล์สโตน — flowstate' }

export default function AdminMilestonesPage() {
  return (
    <PlannedRoute
      title={'ไมล์สโตน'}
      description={'ไมล์สโตนและกำหนดส่งมอบทุกโปรเจกต์'}
      phase={'เฟส 8'}
    />
  )
}
