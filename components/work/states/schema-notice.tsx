import { AlertCircle } from 'lucide-react'

import { Panel } from '@/components/work/data/panel'

/**
 * Shown when the user is signed in but the database schema has not been
 * applied yet, so memberships and roles cannot be read.
 *
 * The alternative would be an app that silently behaves as though nobody
 * belongs to any organization — which looks like a permissions bug rather than
 * an unrun migration. Saying so directly saves a debugging session.
 */
export function SchemaNotice() {
  return (
    <Panel className="schema-notice">
      <div className="stat-icon icon-orange">
        <AlertCircle size={18} />
      </div>
      <div>
        <h2>ยังไม่ได้ติดตั้งฐานข้อมูล</h2>
        <p className="muted">
          เข้าสู่ระบบสำเร็จแล้ว แต่ยังไม่ได้รัน migration บน Supabase
          จึงยังอ่านข้อมูลสมาชิกและสิทธิ์ไม่ได้
        </p>
        <pre className="schema-notice-code">
          npx supabase link --project-ref tsllijdpxshvvwkyorzq{'\n'}
          npx supabase db push
        </pre>
      </div>
    </Panel>
  )
}
