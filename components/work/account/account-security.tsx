import { KeyRound } from 'lucide-react'

import { Panel, PanelHead } from '@/components/work/data/panel'
import { Status } from '@/components/work/data/status'
import { GoogleConnectionForm } from '@/components/work/forms/google-connection-form'
import { PasswordForm } from '@/components/work/forms/password-form'
import { hasPasswordIdentity, requireUser } from '@/lib/work/auth/session'
import { formatDate } from '@/lib/work/format'

/**
 * Sign-in methods for the current account: password, and connected providers.
 *
 * ONE COMPONENT, TWO PAGES. Staff manage this from /work/admin/settings and
 * clients from /work/portal/profile. The panels were briefly written out in
 * both — the same markup in two files, which is how the two pages start
 * offering different security controls to different people for no reason.
 *
 * It resolves the session itself rather than taking identities as props.
 * `requireUser()` is request-memoised, so this costs nothing, and it means a
 * page cannot pass in a stale or wrong identity list.
 */
export async function AccountSecurity({ returnTo }: { returnTo: string }) {
  const user = await requireUser()

  const identities = user.identities ?? []
  const googleIdentity = identities.find((identity) => identity.provider === 'google')
  const linked = !!googleIdentity

  // Same helper the server action uses, so what this panel shows and what
  // changePassword() decides can never disagree about whether a password
  // exists — a mismatch there would render "change" and then demand a current
  // password the account does not have.
  const hasPassword = hasPasswordIdentity(user)

  // Disconnecting the last remaining method would lock the account out for
  // good. The action enforces this; the UI explains it before they try.
  const canUnlink = identities.length > 1

  return (
    <>
      <Panel>
        <PanelHead
          title="วิธีเข้าสู่ระบบ"
          description="ช่องทางที่ใช้เข้าถึงบัญชีนี้ได้"
          action={<KeyRound className="panel-symbol" size={20} />}
        />

        <div className="connection-rows">
          <div className="connection-row">
            <div>
              <strong>อีเมลและรหัสผ่าน</strong>
              <small className="muted">{user.email ?? '—'}</small>
            </div>
            <Status tone={hasPassword ? 'green' : 'orange'}>
              {hasPassword ? 'ตั้งค่าแล้ว' : 'ยังไม่ได้ตั้งรหัสผ่าน'}
            </Status>
          </div>

          <div className="connection-row">
            <div>
              <strong>Google</strong>
              <small className="muted">
                {linked
                  ? `เชื่อมเมื่อ ${formatDate(googleIdentity?.created_at ?? null)}`
                  : 'เข้าสู่ระบบด้วยบัญชี Google ได้หลังเชื่อมต่อ'}
              </small>
            </div>
            <div className="connection-action">
              <Status tone={linked ? 'green' : 'blue'}>
                {linked ? 'เชื่อมแล้ว' : 'ยังไม่ได้เชื่อม'}
              </Status>
              {(!linked || canUnlink) && (
                <GoogleConnectionForm linked={linked} returnTo={returnTo} />
              )}
            </div>
          </div>
        </div>

        {linked && !canUnlink && (
          <p className="muted empty-inline">
            Google เป็นวิธีเข้าสู่ระบบเดียวของบัญชีนี้ — ตั้งรหัสผ่านด้านล่างก่อน
            จึงจะยกเลิกการเชื่อมได้
          </p>
        )}
      </Panel>

      <Panel>
        <PanelHead
          title={hasPassword ? 'เปลี่ยนรหัสผ่าน' : 'ตั้งรหัสผ่าน'}
          description={
            hasPassword
              ? 'ต้องกรอกรหัสผ่านปัจจุบันเพื่อยืนยันตัวตน'
              : 'ตั้งรหัสผ่านไว้เพื่อเข้าสู่ระบบด้วยอีเมลได้อีกทาง'
          }
        />
        <PasswordForm hasPassword={hasPassword} />
      </Panel>
    </>
  )
}
