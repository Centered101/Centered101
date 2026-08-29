import { NotFoundState } from '@/components/work/states'

export const metadata = { title: 'ไม่พบหน้านี้' }

export default function NotFound() {
  return (
    <div className="standalone-state">
      <NotFoundState />
    </div>
  )
}
