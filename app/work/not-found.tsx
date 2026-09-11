import { NotFoundState } from '@/components/work/states/linked'
import { Footer } from '@/components/work/layout/footer'

export const metadata = { title: 'ไม่พบหน้านี้' }

export default function NotFound() {
  return (
    <div className="standalone-state">
      <NotFoundState />
      <Footer />
    </div>
  )
}
