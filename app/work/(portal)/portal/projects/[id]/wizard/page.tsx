import { notFound } from 'next/navigation'

import { Panel, PageHeading } from '@/components/work/data/panel'
import { requireProjectAccess } from '@/lib/work/auth/permissions'
import {
  DELIVERY_ITEM_LABELS,
  PROJECT_STATUS_LABELS,
  UNLOCKABLE_RESOURCE_LABELS,
  formatDate,
  formatMoney,
} from '@/lib/work/format'
import {
  getProjectById,
  getProjectFeatures,
  getProjectIntake,
} from '@/lib/work/queries/projects'
import { getPricingTotals } from '@/lib/work/queries/pricing'
import { getProjectAssets } from '@/lib/work/queries/assets'
import { isWizardStepKey, WIZARD_STEPS, nextWizardStep, type WizardStepKey } from '@/lib/work/wizard-steps'
import { WizardNav } from './wizard-nav'
import { WizardDirtyProvider } from './wizard-dirty'
import {
  BrandStepForm,
  BudgetStepForm,
  DeliveryStepForm,
  PaymentProposalStepForm,
  RequirementsStepForm,
  ScopeStepForm,
  TimelineStepForm,
} from './wizard-steps-forms'
import { ReviewSubmitForm } from './review-submit-form'

export const metadata = { title: 'ตั้งค่าโปรเจกต์' }

/**
 * The client intake wizard, steps 2–10 (docs/PROJECT_WORKSPACE_ARCHITECTURE.md,
 * docs/ADMIN_PROJECT_REVIEW.md §1). Step 1 (Basic Information) is
 * `/portal/projects/new` — it already creates the DRAFT row this page
 * continues editing. Every step writes to that SAME row (or its scope/asset
 * children), which is what makes "leave and come back later" free: the
 * DRAFT project already IS the saved draft.
 *
 * OWNER-only past this point (`requireProjectAccess().isProjectOwner`) —
 * the same guard every write action re-checks independently.
 */
export default async function ProjectWizardPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ step?: string }>
}) {
  const { id } = await props.params
  const { step } = await props.searchParams
  const access = await requireProjectAccess(id)
  if (!access.isProjectOwner) notFound()

  const project = await getProjectById(id)
  if (!project) notFound()

  const currentStep: WizardStepKey = isWizardStepKey(step) ? step : 'requirements'
  const nextStep = nextWizardStep(currentStep)
  const nextHref = nextStep
    ? `/work/portal/projects/${id}/wizard?step=${nextStep}`
    : `/work/portal/projects/${id}`

  const [intake, features, totals, assets] = await Promise.all([
    getProjectIntake(id),
    getProjectFeatures(id),
    getPricingTotals(id),
    getProjectAssets(id),
  ])
  if (!intake) notFound()

  return (
    <>
      <PageHeading
        eyebrow={project.projectCode}
        title={project.name}
        description={`สถานะ: ${PROJECT_STATUS_LABELS[project.status]}`}
      />

      <WizardDirtyProvider>
        <WizardNav projectId={id} current={currentStep} />

        <Panel>
          {currentStep === 'requirements' && (
            <RequirementsStepForm projectId={id} intake={intake} nextHref={nextHref} />
          )}
          {currentStep === 'scope' && <ScopeStepForm projectId={id} features={features} nextHref={nextHref} />}
          {currentStep === 'timeline' && <TimelineStepForm projectId={id} intake={intake} nextHref={nextHref} />}
          {currentStep === 'budget' && <BudgetStepForm projectId={id} intake={intake} nextHref={nextHref} />}
          {/* No totalAmount/currency: the estimate comes from the client's own
              budget in `intake`, not from the pricing-derived official total. */}
          {currentStep === 'payment' && (
            <PaymentProposalStepForm projectId={id} intake={intake} nextHref={nextHref} />
          )}
          {currentStep === 'delivery' && <DeliveryStepForm projectId={id} intake={intake} nextHref={nextHref} />}
          {currentStep === 'brand' && <BrandStepForm projectId={id} assets={assets} nextHref={nextHref} />}
          {currentStep === 'review' && (
            <ReviewSummary
              project={project}
              intake={intake}
              features={features}
              totals={totals}
              assets={assets}
              projectId={id}
            />
          )}
        </Panel>
      </WizardDirtyProvider>
    </>
  )
}

function ReviewSummary({
  project,
  intake,
  features,
  totals,
  assets,
  projectId,
}: {
  project: NonNullable<Awaited<ReturnType<typeof getProjectById>>>
  intake: NonNullable<Awaited<ReturnType<typeof getProjectIntake>>>
  features: Awaited<ReturnType<typeof getProjectFeatures>>
  totals: Awaited<ReturnType<typeof getPricingTotals>>
  assets: Awaited<ReturnType<typeof getProjectAssets>>
  projectId: string
}) {
  return (
    <div className="work-form">
      <div className="full ownership-rows">
        <div>
          <span>ชื่อโปรเจกต์</span>
          <strong>{project.name}</strong>
        </div>
        <div>
          <span>เป้าหมาย</span>
          <strong>{intake.requirements.goals ?? '—'}</strong>
        </div>
        <div>
          <span>ขอบเขตงาน</span>
          <strong>{features.length > 0 ? features.map((f) => f.name).join(', ') : '—'}</strong>
        </div>
        <div>
          <span>กำหนดเวลาที่ต้องการ</span>
          <strong>
            {formatDate(intake.requestedStartDate)} – {formatDate(intake.requestedDeadline)}
            {intake.importantLaunchDate && ` (เปิดตัว ${formatDate(intake.importantLaunchDate)})`}
          </strong>
        </div>
        <div>
          <span>ระยะเวลา/ความสำคัญ</span>
          <strong>
            {intake.requestedDuration ?? '—'} · {intake.requestedPriority ?? 'NORMAL'}
          </strong>
        </div>
        <div>
          <span>งบประมาณ</span>
          <strong>
            {intake.requestedBudgetMin !== null || intake.requestedBudgetMax !== null
              ? `${formatMoney(intake.requestedBudgetMin, intake.requestedCurrency)} – ${formatMoney(intake.requestedBudgetMax, intake.requestedCurrency)}`
              : '—'}
            {intake.requestedBudgetPreferred !== null &&
              ` (ต้องการ ${formatMoney(intake.requestedBudgetPreferred, intake.requestedCurrency)})`}
          </strong>
        </div>
        <div>
          <span>แผนการชำระเงินที่เสนอ</span>
          <strong>
            {intake.requestedPaymentPlan
              ? intake.requestedPaymentPlan.type === 'CUSTOM'
                ? `กำหนดเอง — ${intake.requestedPaymentPlan.notes ?? 'ขอพูดคุยกับทีมงาน'}`
                : intake.requestedPaymentPlan.milestones
                    .map((m) => `${m.name} ${(m.percentageBp / 100).toFixed(0)}%`)
                    .join(' + ')
              : '—'}
          </strong>
        </div>
        <div>
          <span>รายการที่ต้องการให้ส่งมอบ</span>
          <strong>
            {intake.requestedDelivery.length + intake.requestedDeliveryCustom.length > 0
              ? [
                  ...intake.requestedDelivery.map((key) => DELIVERY_ITEM_LABELS[key] ?? key),
                  ...intake.requestedDeliveryCustom,
                ].join(', ')
              : '—'}
          </strong>
        </div>
        <div>
          <span>ไฟล์แบรนด์/อ้างอิงที่แนบ</span>
          <strong>{assets.length} ไฟล์</strong>
        </div>
        {totals.grandTotal > 0 && (
          <div>
            <span>ราคาปัจจุบัน (ถ้ามีการระบุไว้)</span>
            <strong>{formatMoney(totals.grandTotal, totals.currency)}</strong>
          </div>
        )}
      </div>

      <p className="muted full">
        การส่งมอบที่ทีมงานจะปลดล็อกให้จริงขึ้นอยู่กับเงื่อนไขการชำระเงินที่ตกลงกัน (
        {Object.values(UNLOCKABLE_RESOURCE_LABELS).join(' / ')}) ไม่ใช่รายการที่คุณระบุไว้ข้างต้นโดยอัตโนมัติ
      </p>

      <ReviewSubmitForm projectId={projectId} />
    </div>
  )
}
