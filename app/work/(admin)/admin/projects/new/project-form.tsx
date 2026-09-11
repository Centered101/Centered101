'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'

import { GearIcon } from '@/components/work/data/gear-icon'
import { SubmitButton } from '@/components/work/forms'
import { PricingItemsFieldset } from '@/components/work/domain/pricing-items-fieldset'
import { createProject, type ActionState } from '@/lib/work/services/projects'
import {
  DELIVERY_METHODS,
  PROJECT_TYPES,
  SOURCE_CODE_OWNERSHIPS,
} from '@/lib/work/types/enums'
import {
  DELIVERY_METHOD_LABELS,
  PROJECT_TYPE_LABELS,
  SOURCE_OWNERSHIP_LABELS,
} from '@/lib/work/format'

/**
 * Create-project form.
 *
 * A plain <form> posting to a Server Action, so it works before hydration and
 * needs no client-side fetch. The action inserts into Supabase and redirects
 * to the new project — nothing here updates React state and pretends a project
 * exists.
 *
 * Validation appears twice on purpose: `required` and `type` attributes give
 * instant feedback, and the Zod schema on the server decides. The browser
 * checks are a convenience; only the server's verdict is trusted.
 */
export function ProjectForm({
  clients,
  canPrice,
}: {
  clients: { id: string; name: string }[]
  /** `finance:write` — only then does adding pricing at creation time succeed against RLS. */
  canPrice: boolean
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(createProject, {})

  // useActionToast is not used here: this action redirects on success, so
  // there is never a success message to show — only the non-field error.
  // Field errors render beside the input they belong to, where the user is
  // already looking.
  useEffect(() => {
    if (state.error) toast.error(state.error)
  }, [state.error])

  return (
    <form action={formAction} className="work-form">
      <label>
        <span>ลูกค้า</span>
        <select name="clientId" required defaultValue="">
          <option value="" disabled>
            เลือกลูกค้า
          </option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        {state.fieldErrors?.clientId && <small className="field-error">{state.fieldErrors.clientId}</small>}
      </label>

      <label>
        <span>ชื่อโปรเจกต์</span>
        <input name="name" required maxLength={200} placeholder="เว็บไซต์องค์กร" />
        {state.fieldErrors?.name && <small className="field-error">{state.fieldErrors.name}</small>}
      </label>

      <label className="full">
        <span>รายละเอียด</span>
        <textarea name="description" rows={3} maxLength={2000} />
      </label>

      <label>
        <span>ประเภท</span>
        <select name="type" defaultValue="WEBSITE">
          {PROJECT_TYPES.map((type) => (
            <option key={type} value={type}>
              {PROJECT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>วันเริ่มงาน</span>
        <input name="startDate" type="date" />
      </label>

      <label>
        <span>กำหนดส่งมอบ</span>
        <input name="expectedDelivery" type="date" />
        {state.fieldErrors?.expectedDelivery && (
          <small className="field-error">{state.fieldErrors.expectedDelivery}</small>
        )}
      </label>

      <label>
        <span>วิธีส่งมอบ</span>
        <select name="deliveryMethod" defaultValue="DEVELOPER_HOSTED">
          {DELIVERY_METHODS.map((method) => (
            <option key={method} value={method}>
              {DELIVERY_METHOD_LABELS[method]}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>ความเป็นเจ้าของซอร์สโค้ด</span>
        <select name="sourceCodeOwnership" defaultValue="DEVELOPER">
          {SOURCE_CODE_OWNERSHIPS.map((ownership) => (
            <option key={ownership} value={ownership}>
              {SOURCE_OWNERSHIP_LABELS[ownership]}
            </option>
          ))}
        </select>
      </label>

      <label className="checkbox full">
        <input name="maintenanceEnabled" type="checkbox" />
        <GearIcon />
        <span>เปิดใช้แพ็กเกจดูแลรักษา</span>
      </label>

      {canPrice && <PricingItemsFieldset />}

      <div className="form-actions">
        <SubmitButton pendingLabel="กำลังสร้าง…">สร้างโปรเจกต์</SubmitButton>
      </div>
    </form>
  )
}
