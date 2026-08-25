import { PlannedRoute } from '@/components/work/states/planned-route'

export const metadata = { title: 'ซอร์สโค้ด — flowstate' }

export default function PortalSourceCodePage() {
  return (
    <PlannedRoute
      eyebrow="โปรเจกต์"
      title={'ซอร์สโค้ด'}
      description={'สิทธิ์เข้าถึงซอร์สโค้ดและการส่งมอบ'}
      phase={'เฟส 12'}
    />
  )
}
