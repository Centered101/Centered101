import { Panel, PageHeading } from '@/components/work/data/panel'
import { EmptyState } from '@/components/work/states'
import { requireAdmin } from '@/lib/work/auth/permissions'
import { formatDate } from '@/lib/work/format'
import { getClients } from '@/lib/work/queries/clients'

export const metadata = { title: 'ลูกค้า' }

/**
 * Client companies.
 *
 * A `client` here is a COMPANY RECORD, not a person who can sign in. Portal
 * access is granted per project through project_members — appearing in this
 * list gives nobody a login.
 */
export default async function AdminClientsPage() {
  await requireAdmin()
  const clients = await getClients()

  return (
    <>
      <PageHeading title="ลูกค้า" description={`ทั้งหมด ${clients.length} ราย`} />

      <Panel className="projects-panel">
        {clients.length === 0 ? (
          <EmptyState
            title="ยังไม่มีลูกค้า"
            description="เพิ่มลูกค้าเพื่อเริ่มสร้างโปรเจกต์แรก"
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ลูกค้า</th>
                  <th>รหัส</th>
                  <th>ผู้ติดต่อ</th>
                  <th>อีเมล</th>
                  <th>โทรศัพท์</th>
                  <th>โปรเจกต์</th>
                  <th>เพิ่มเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <strong>{client.name}</strong>
                    </td>
                    <td className="muted">{client.clientCode ?? '—'}</td>
                    <td>{client.contactName ?? '—'}</td>
                    <td className="muted">{client.contactEmail ?? '—'}</td>
                    <td className="muted">{client.contactPhone ?? '—'}</td>
                    <td>{client.projectCount}</td>
                    <td className="muted">{formatDate(client.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  )
}
