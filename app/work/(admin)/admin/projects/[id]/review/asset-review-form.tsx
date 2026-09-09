'use client'

import { useActionState, useState } from 'react'

import { useActionToast } from '@/components/work/forms'
import { reviewProjectAsset } from '@/lib/work/services/intake'
import type { ActionState } from '@/lib/work/services/projects'
import { PROJECT_ASSET_REVIEW_STATUSES } from '@/lib/work/types/enums'
import { PROJECT_ASSET_REVIEW_STATUS_LABELS } from '@/lib/work/format'

/** Admin Asset Review (docs/ADMIN_PROJECT_REVIEW.md §5) — a select that submits itself; a note field appears for anything other than APPROVED. */
export function AssetReviewForm({ projectId, assetId }: { projectId: string; assetId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(reviewProjectAsset, {})
  useActionToast(state)
  const [status, setStatus] = useState('')
  const [note, setNote] = useState('')

  return (
    <form action={formAction} className="row-inline">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="assetId" value={assetId} />
      <select name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value="" disabled>
          เลือกผล
        </option>
        {PROJECT_ASSET_REVIEW_STATUSES.filter((s) => s !== 'PENDING').map((s) => (
          <option key={s} value={s}>
            {PROJECT_ASSET_REVIEW_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      {status && status !== 'APPROVED' && (
        <input
          name="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="เหตุผล/คำชี้แจง"
        />
      )}
      {status && (
        <button type="submit" className="text-btn">
          บันทึก
        </button>
      )}
    </form>
  )
}
