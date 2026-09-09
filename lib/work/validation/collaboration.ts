import { z } from './zod'

import { PROJECT_COLLABORATION_ROLES, PROJECT_TYPES } from '@/lib/work/types/enums'

const uuid = z.string().uuid('รหัสไม่ถูกต้อง')

/**
 * A CLIENT creating their own project. Deliberately minimal — no
 * organizationId, no clientId, no ownerId anywhere in this schema. Those are
 * resolved server-side, from the authenticated session, never from form
 * input (createOwnProject, services/projects.ts).
 */
export const createOwnProjectSchema = z.object({
  name: z.string().trim().min(1, 'กรุณากรอกชื่อโปรเจกต์').max(200),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((value) => (value ? value : null)),
  type: z.enum(PROJECT_TYPES).default('WEBSITE'),
})

export type CreateOwnProjectInput = z.infer<typeof createOwnProjectSchema>

/** Inviting someone onto a self-serve project. Role can never be OWNER — see migration 0026's own constraint, mirrored here so the form fails fast. */
export const inviteMemberSchema = z.object({
  projectId: uuid,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('อีเมลไม่ถูกต้อง'),
  role: z.enum(PROJECT_COLLABORATION_ROLES).refine((value) => value !== 'OWNER', {
    message: 'ไม่สามารถเชิญเป็นเจ้าของโปรเจกต์ได้',
  }),
})

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>

export const changeMemberRoleSchema = z.object({
  projectId: uuid,
  memberId: uuid,
  role: z.enum(PROJECT_COLLABORATION_ROLES).refine((value) => value !== 'OWNER', {
    message: 'ไม่สามารถเปลี่ยนเป็นเจ้าของโปรเจกต์ได้จากที่นี่',
  }),
})

export type ChangeMemberRoleInput = z.infer<typeof changeMemberRoleSchema>
