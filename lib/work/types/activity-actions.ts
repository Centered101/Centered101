/**
 * Every action the workspace writes to `activity_logs`, with how it reads in
 * the feed.
 *
 * THIS MAP IS THE LIST. `ActivityAction` is derived from its keys and is the
 * type `logActivity()` accepts, so an action cannot be written without also
 * being given a label here — the previous arrangement kept the labels in
 * `queries/activity.ts` and the actions in ~50 call sites, and the two drifted
 * until 49 of the 65 actions in use were falling through to a raw
 * `project.created_self_serve` in the client's notification list.
 *
 * Not a PostgreSQL enum: `activity_logs.action` is `text`, so this union is
 * not covered by the `pg_enum` check in `enums.ts`. The compiler is the check
 * instead, which is why the map is keyed rather than a bare array.
 *
 * TONE is editorial, not decorative — green for something that went well,
 * orange for something that wants attention, violet for something new, blue
 * for ordinary progress. (The brand override block at the top of work.css
 * currently flattens all four to blue; the semantics are kept correct here so
 * that retiring that block is a stylesheet change and nothing more.)
 */
export type ActivityPresentation = {
  title: string
  icon: 'payment' | 'check' | 'branch' | 'file'
  tone: 'blue' | 'green' | 'violet' | 'orange'
}

export const ACTIVITY_ACTIONS = {
  // ---------------------------------------------------------------- project
  'project.created': { title: 'สร้างโปรเจกต์', icon: 'file', tone: 'violet' },
  'project.created_self_serve': { title: 'ลูกค้าสร้างโปรเจกต์เอง', icon: 'file', tone: 'violet' },
  'project.updated': { title: 'อัปเดตโปรเจกต์', icon: 'file', tone: 'blue' },
  'project.status_changed': { title: 'เปลี่ยนสถานะโปรเจกต์', icon: 'check', tone: 'blue' },
  'project.requirements_updated': { title: 'อัปเดตความต้องการ', icon: 'file', tone: 'blue' },
  'project.submitted': { title: 'ส่งโปรเจกต์ให้ทีมงานตรวจสอบ', icon: 'check', tone: 'blue' },
  'project.review_started': { title: 'เริ่มตรวจสอบโปรเจกต์', icon: 'check', tone: 'blue' },
  'project.information_requested': { title: 'ขอข้อมูลเพิ่มเติม', icon: 'file', tone: 'orange' },
  'project.information_submitted': { title: 'ส่งข้อมูลเพิ่มเติมแล้ว', icon: 'file', tone: 'blue' },
  'project.approved_for_quotation': { title: 'อนุมัติให้เสนอราคา', icon: 'check', tone: 'green' },
  'project.rejected': { title: 'ปฏิเสธโปรเจกต์', icon: 'check', tone: 'orange' },
  'project.payment_requirement_met': {
    title: 'ชำระเงินครบตามเงื่อนไข',
    icon: 'payment',
    tone: 'green',
  },
  'project.ready_to_start': { title: 'พร้อมเริ่มงาน', icon: 'check', tone: 'green' },
  'project.started': { title: 'เริ่มงานแล้ว', icon: 'check', tone: 'green' },
  'project.archived': { title: 'จัดเก็บโปรเจกต์', icon: 'file', tone: 'orange' },
  'project.archived_self_serve': { title: 'ลูกค้าจัดเก็บโปรเจกต์เอง', icon: 'file', tone: 'orange' },
  'project.unarchived': { title: 'นำโปรเจกต์กลับมา', icon: 'file', tone: 'blue' },
  'project.asset_uploaded': { title: 'อัปโหลดไฟล์ประกอบ', icon: 'file', tone: 'blue' },
  'project.asset_reviewed': { title: 'ตรวจไฟล์ประกอบแล้ว', icon: 'check', tone: 'blue' },

  // ------------------------------------------------------- workspace
  'organization.renamed': { title: 'เปลี่ยนชื่อพื้นที่ทำงาน', icon: 'file', tone: 'blue' },

  // ------------------------------------------------------- people on a project
  'client.created': { title: 'เพิ่มลูกค้าใหม่', icon: 'file', tone: 'violet' },
  'member.invited': { title: 'เชิญสมาชิกทีม', icon: 'check', tone: 'violet' },
  'member.role_changed': { title: 'เปลี่ยนบทบาทสมาชิก', icon: 'check', tone: 'blue' },
  'member.removed': { title: 'นำสมาชิกออกจากทีม', icon: 'check', tone: 'orange' },
  'project_invitation.created': { title: 'ส่งคำเชิญเข้าโปรเจกต์', icon: 'check', tone: 'violet' },
  'project_invitation.revoked': { title: 'ยกเลิกคำเชิญ', icon: 'check', tone: 'orange' },
  'project_member.role_changed': { title: 'เปลี่ยนบทบาทในโปรเจกต์', icon: 'check', tone: 'blue' },
  'project_member.removed': { title: 'นำสมาชิกออกจากโปรเจกต์', icon: 'check', tone: 'orange' },

  // ---------------------------------------------------------------- payment
  'payment.created': { title: 'สร้างรายการชำระเงิน', icon: 'payment', tone: 'blue' },
  'payment.checkout_started': { title: 'เริ่มขั้นตอนชำระเงิน', icon: 'payment', tone: 'blue' },
  'payment.succeeded': { title: 'ได้รับการชำระเงิน', icon: 'payment', tone: 'green' },
  'payment.received': { title: 'ได้รับการชำระเงิน', icon: 'payment', tone: 'green' },
  'payment.failed': { title: 'การชำระเงินไม่สำเร็จ', icon: 'payment', tone: 'orange' },
  'payment.recorded_manual': {
    title: 'บันทึกการชำระเงินด้วยตนเอง',
    icon: 'payment',
    tone: 'blue',
  },
  'manual_payment.submitted': { title: 'ลูกค้าแจ้งโอนเงิน', icon: 'payment', tone: 'blue' },
  'manual_payment.verified': { title: 'ยืนยันการโอนเงินแล้ว', icon: 'payment', tone: 'green' },
  'payment_plan.created': { title: 'สร้างแผนการชำระเงิน', icon: 'payment', tone: 'violet' },
  'payment_plan.accepted': {
    title: 'ลูกค้ายอมรับแผนการชำระเงิน',
    icon: 'payment',
    tone: 'green',
  },
  'payment_plan.changes_requested': {
    title: 'ขอแก้ไขแผนการชำระเงิน',
    icon: 'payment',
    tone: 'orange',
  },
  'payment_plan.change_request_resolved': {
    title: 'แก้ไขแผนการชำระเงินแล้ว',
    icon: 'payment',
    tone: 'blue',
  },
  'milestone.completed': { title: 'ไมล์สโตนเสร็จสมบูรณ์', icon: 'check', tone: 'green' },
  'invoice.created': { title: 'ออกใบแจ้งหนี้', icon: 'file', tone: 'blue' },
  'pricing_item.added': { title: 'เพิ่มรายการราคา', icon: 'file', tone: 'blue' },

  // -------------------------------------------------------------- agreement
  'agreement.sent': { title: 'ส่งข้อตกลงให้ลูกค้า', icon: 'file', tone: 'blue' },
  'agreement.changes_requested': { title: 'ลูกค้าขอแก้ไขข้อตกลง', icon: 'file', tone: 'orange' },

  // -------------------------------------------- work (execution) milestones
  'work_milestone.created': { title: 'เพิ่มงานในไทม์ไลน์', icon: 'check', tone: 'violet' },
  'work_milestone.template_applied': {
    title: 'ใช้เทมเพลตไทม์ไลน์',
    icon: 'check',
    tone: 'violet',
  },
  'work_milestone.updated': { title: 'อัปเดตงานในไทม์ไลน์', icon: 'check', tone: 'blue' },
  'work_milestone.reordered': { title: 'จัดลำดับงานใหม่', icon: 'check', tone: 'blue' },
  'work_milestone.started': { title: 'เริ่มลงมืองาน', icon: 'check', tone: 'blue' },
  'work_milestone.submitted_for_review': {
    title: 'ส่งงานให้ตรวจรับ',
    icon: 'check',
    tone: 'blue',
  },
  'work_milestone.approved': { title: 'ลูกค้าตรวจรับงานแล้ว', icon: 'check', tone: 'green' },
  'work_milestone.completed': { title: 'งานเสร็จสมบูรณ์', icon: 'check', tone: 'green' },
  'work_milestone.changes_requested': {
    title: 'ลูกค้าขอแก้ไขงาน',
    icon: 'check',
    tone: 'orange',
  },
  'work_milestone.blocked': { title: 'งานติดปัญหา', icon: 'check', tone: 'orange' },
  'work_milestone.cancelled': { title: 'ยกเลิกงาน', icon: 'check', tone: 'orange' },
  'work_milestone.deadline_changed': { title: 'เปลี่ยนกำหนดส่งงาน', icon: 'check', tone: 'blue' },
  'work_milestone.timeline_change_requested': {
    title: 'ขอเลื่อนกำหนดส่งงาน',
    icon: 'check',
    tone: 'orange',
  },
  'work_milestone.admin_override': {
    title: 'ทีมงานปรับสถานะงานเอง',
    icon: 'check',
    tone: 'orange',
  },

  // ------------------------------------------------ delivery, docs, sharing
  'deployment.created': { title: 'เผยแพร่สำเร็จ', icon: 'branch', tone: 'violet' },

  // Phase 6 — publishing identity, distinct from `deployment.created` above:
  // that records ONE deploy event, these record the project's live state and
  // where its code lives. Two different questions, two different events.
  'publishing.updated': { title: 'อัปเดตข้อมูลการเผยแพร่', icon: 'branch', tone: 'blue' },
  'publishing.published': { title: 'เผยแพร่โปรเจกต์', icon: 'branch', tone: 'green' },
  'publishing.unpublished': { title: 'ยกเลิกการเผยแพร่', icon: 'branch', tone: 'orange' },
  'source_code.attached': { title: 'แนบไฟล์ซอร์สโค้ด', icon: 'file', tone: 'violet' },
  // Logged because handover is exactly the event a later dispute asks about.
  'source_code.downloaded': { title: 'ดาวน์โหลดซอร์สโค้ด', icon: 'file', tone: 'green' },

  // Phase 7 — delivery and handover. `handover.completed` is the project
  // reaching DELIVERED; `handover.acknowledged` is the CLIENT confirming they
  // received it. Two events because they are two different facts, asserted by
  // two different parties.
  'deliverable.created': { title: 'เพิ่มรายการส่งมอบ', icon: 'check', tone: 'blue' },
  'deliverable.updated': { title: 'แก้ไขรายการส่งมอบ', icon: 'check', tone: 'blue' },
  'deliverable.delivered': { title: 'ส่งมอบรายการแล้ว', icon: 'check', tone: 'green' },
  'handover.completed': { title: 'ส่งมอบโปรเจกต์', icon: 'check', tone: 'green' },
  'handover.acknowledged': { title: 'ลูกค้ายืนยันรับมอบ', icon: 'check', tone: 'green' },
  'document.created': { title: 'เพิ่มเอกสาร', icon: 'file', tone: 'blue' },
  // Phase 5. `document.uploaded` is distinct from `document.created` above:
  // that one is a generated finance record (an invoice the system produced),
  // this one is a file a person chose and uploaded.
  'document.uploaded': { title: 'อัปโหลดเอกสาร', icon: 'file', tone: 'blue' },
  'document.updated': { title: 'แก้ไขข้อมูลเอกสาร', icon: 'file', tone: 'blue' },
  // Its own event, not folded into `document.updated`: "who let the client
  // see this, and when" is the question an access dispute actually asks.
  'document.visibility_changed': { title: 'เปลี่ยนสิทธิ์การเข้าถึงเอกสาร', icon: 'file', tone: 'orange' },
  'document.replaced': { title: 'แทนที่เอกสารด้วยฉบับใหม่', icon: 'file', tone: 'violet' },
  'document.archived': { title: 'เก็บเอกสารเข้าคลัง', icon: 'file', tone: 'orange' },
  'brand.updated': { title: 'อัปเดตแบรนด์โปรเจกต์', icon: 'check', tone: 'violet' },
  'change_request.created': { title: 'คำขอเปลี่ยนแปลงใหม่', icon: 'file', tone: 'orange' },
  'maintenance.updated': { title: 'อัปเดตแพ็กเกจดูแลรักษา', icon: 'check', tone: 'green' },

  // Phase 8 — the change-request review lifecycle. Each decision is its own
  // event because "who approved this, and when" is the question a scope
  // dispute asks, and a single generic `change_request.updated` would bury it.
  'change_request.under_review': { title: 'รับคำขอเข้าตรวจสอบ', icon: 'file', tone: 'blue' },
  'change_request.quoted': { title: 'เสนอราคาคำขอเปลี่ยนแปลง', icon: 'file', tone: 'blue' },
  'change_request.approved': { title: 'อนุมัติคำขอเปลี่ยนแปลง', icon: 'check', tone: 'green' },
  'change_request.rejected': { title: 'ปฏิเสธคำขอเปลี่ยนแปลง', icon: 'file', tone: 'orange' },
  'change_request.information_requested': {
    title: 'ขอข้อมูลเพิ่มเติมสำหรับคำขอ',
    icon: 'file',
    tone: 'orange',
  },
  'change_request.started': { title: 'เริ่มดำเนินการตามคำขอ', icon: 'check', tone: 'blue' },
  'change_request.completed': { title: 'ปิดคำขอเปลี่ยนแปลง', icon: 'check', tone: 'green' },
  'change_request.cancelled': { title: 'ยกเลิกคำขอเปลี่ยนแปลง', icon: 'file', tone: 'orange' },

  // Phase 8 — maintenance. Plans are billing (accountant); records are work
  // actually performed (project managers/developers). Separate events for the
  // same reason they have separate policies.
  'maintenance.plan_created': { title: 'สร้างแผนดูแลรักษา', icon: 'check', tone: 'green' },
  'maintenance.plan_updated': { title: 'แก้ไขแผนดูแลรักษา', icon: 'check', tone: 'blue' },
  'maintenance.status_changed': { title: 'เปลี่ยนสถานะแผนดูแลรักษา', icon: 'check', tone: 'orange' },
  'maintenance.record_created': { title: 'บันทึกงานดูแลรักษา', icon: 'check', tone: 'green' },
  'maintenance.record_deleted': { title: 'ลบบันทึกงานดูแลรักษา', icon: 'check', tone: 'orange' },
  'share_link.created': { title: 'สร้างลิงก์แชร์', icon: 'branch', tone: 'violet' },
  'share_link.revoked': { title: 'ยกเลิกลิงก์แชร์', icon: 'branch', tone: 'orange' },
  'feedback.submitted': { title: 'ส่งความคิดเห็น', icon: 'file', tone: 'blue' },
} as const satisfies Record<string, ActivityPresentation>

/** The actions `logActivity()` accepts — the keys of the map above. */
export type ActivityAction = keyof typeof ACTIVITY_ACTIONS

/**
 * How an entry reads when its action is not in the map.
 *
 * Only reachable for rows already in the database from an action since renamed
 * or removed — a new one cannot compile. The raw verb is dropped from the
 * title (it meant nothing to the client reading their notifications) and the
 * entry still renders, because a silent gap in an audit trail is worse than a
 * vague line in one. `activityDetail` re-attaches the verb, so an operator
 * reading the same feed can still see what it was.
 */
export const UNKNOWN_ACTIVITY: ActivityPresentation = {
  title: 'กิจกรรมในระบบ',
  icon: 'file',
  tone: 'blue',
}
