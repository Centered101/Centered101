'use server'

import { revalidatePath } from 'next/cache'

import { requireAdmin } from '@/lib/work/auth/permissions'
import { createClient } from '@/lib/work/supabase/server'
import { renameOrganizationSchema } from '@/lib/work/validation/organization'
import { logActivity } from './activity'
import type { ActionState } from './projects'

/**
 * Rename the agency workspace.
 *
 * Manager-only. The capability check here is what produces the readable
 * error; the GUARANTEE is `organizations_update_managers`, which re-checks
 * `app.is_org_manager(id)` against the real session. The update runs through
 * the caller's own client — never the admin client — so a non-manager who
 * reached this action gets zero rows back, not a silent success.
 *
 * `settings:manage` and `app.is_org_manager` resolve to the same two roles
 * (super_admin, admin); they are checked in both places on purpose, so the UI
 * and the database never disagree about who may do this.
 */
export async function renameOrganization(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requireAdmin()
  if (!staff.can('settings:manage')) {
    return { error: 'บัญชีของคุณไม่มีสิทธิ์แก้ไขข้อมูลพื้นที่ทำงาน' }
  }

  const parsed = renameOrganizationSchema.safeParse({ name: formData.get('name') })
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '')
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { fieldErrors }
  }

  const previousName = staff.organizationName
  if (parsed.data.name === previousName) {
    return { message: 'ยังไม่มีการเปลี่ยนแปลง' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('organizations')
    .update({ name: parsed.data.name })
    .eq('id', staff.organizationId)

  if (error) {
    console.error('[organization] rename failed', error)
    return { error: 'เปลี่ยนชื่อพื้นที่ทำงานไม่สำเร็จ' }
  }

  await logActivity({
    organizationId: staff.organizationId,
    action: 'organization.renamed',
    entityType: 'organization',
    entityId: staff.organizationId,
    metadata: { from: previousName, to: parsed.data.name },
  })

  revalidatePath('/work/admin/settings')
  revalidatePath('/work/admin/dashboard')

  return { message: 'เปลี่ยนชื่อพื้นที่ทำงานแล้ว' }
}
