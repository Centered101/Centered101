'use client'

import { useActionState } from 'react'

import { SubmitButton, useActionToast } from '@/components/work/forms'
import { DEPLOYMENT_ENVIRONMENT_LABELS } from '@/lib/work/format'
import { createDeployment, type ActionState } from '@/lib/work/services/projects'
import { DEPLOYMENT_ENVIRONMENTS } from '@/lib/work/types/enums'

/**
 * Records a deployment by hand.
 *
 * The brief's interim answer while there is no provider integration: an admin
 * saves a REAL preview URL, and the portal shows exactly that. Nothing invents
 * an example.vercel.app, and no page pretends a deployment exists.
 */
export function DeploymentForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(createDeployment, {})
  useActionToast(state)

  return (
    <form action={formAction} className="work-form">
      <input type="hidden" name="projectId" value={projectId} />

      <label>
        <span>สภาพแวดล้อม</span>
        <select name="environment" defaultValue="PREVIEW">
          {DEPLOYMENT_ENVIRONMENTS.map((environment) => (
            <option key={environment} value={environment}>
              {DEPLOYMENT_ENVIRONMENT_LABELS[environment]}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>เวอร์ชัน</span>
        <input name="version" placeholder="v1.0.0" maxLength={40} />
      </label>

      <label className="full">
        <span>URL</span>
        <input name="url" type="url" required placeholder="https://preview.example.com" />
        {state.fieldErrors?.url && <small className="field-error">{state.fieldErrors.url}</small>}
      </label>

      <label>
        <span>Commit SHA</span>
        <input name="commitSha" placeholder="a1b2c3d" />
        {state.fieldErrors?.commitSha && (
          <small className="field-error">{state.fieldErrors.commitSha}</small>
        )}
      </label>

      <label>
        <span>หมายเหตุ</span>
        <input name="notes" maxLength={1000} />
      </label>

      <div className="form-actions">
        <SubmitButton variant="outline" pendingLabel="กำลังบันทึก…">
          บันทึกการเผยแพร่
        </SubmitButton>
      </div>
    </form>
  )
}
