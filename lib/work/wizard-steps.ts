/**
 * The client intake wizard's step list (docs/PROJECT_WORKSPACE_ARCHITECTURE.md,
 * docs/ADMIN_PROJECT_REVIEW.md §1). Step 1 (Basic Information) is the
 * existing `/portal/projects/new` form (`createOwnProject`) — it already
 * creates the DRAFT row, which IS the draft this wizard resumes into, so it
 * is not repeated here. Steps 2–9 all write to that same row.
 */
export const WIZARD_STEPS = [
  { key: 'requirements', label: 'ความต้องการ' },
  { key: 'scope', label: 'ขอบเขตงาน' },
  { key: 'timeline', label: 'กำหนดเวลา' },
  { key: 'budget', label: 'งบประมาณ' },
  { key: 'payment', label: 'แผนการชำระเงิน' },
  { key: 'delivery', label: 'การส่งมอบ' },
  { key: 'brand', label: 'แบรนด์และไฟล์แนบ' },
  { key: 'review', label: 'ตรวจทานและส่ง' },
] as const

export type WizardStepKey = (typeof WIZARD_STEPS)[number]['key']

export function isWizardStepKey(value: string | undefined): value is WizardStepKey {
  return WIZARD_STEPS.some((step) => step.key === value)
}

export function nextWizardStep(current: WizardStepKey): WizardStepKey | null {
  const index = WIZARD_STEPS.findIndex((step) => step.key === current)
  return WIZARD_STEPS[index + 1]?.key ?? null
}
