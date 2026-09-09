import { z } from './zod'

import { ORG_ROLES } from '@/lib/work/types/enums'
import { emailSchema } from './auth'

/**
 * Team invitations.
 *
 * `super_admin` is absent from the invitable roles ON PURPOSE. Granting it is
 * a transfer of control over the whole workspace, and an invitation — which
 * can be sent to an address before anyone verifies who reads it — is the wrong
 * instrument for that. Promote an existing member to it instead, where the
 * account is already known.
 */
export const INVITABLE_ROLES = ORG_ROLES.filter((role) => role !== 'super_admin')

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(INVITABLE_ROLES as unknown as [string, ...string[]], {
    message: 'บทบาทไม่ถูกต้อง',
  }),
})

/**
 * Changing an existing member's role.
 *
 * `super_admin` IS allowed here, unlike in an invitation: this acts on an
 * account that already exists and is already on the team, so the person being
 * promoted is known rather than assumed from an address. Who may grant it is
 * decided in the service, not here — a schema cannot see who is asking.
 */
export const changeMemberRoleSchema = z.object({
  memberId: z.string().uuid('สมาชิกไม่ถูกต้อง'),
  role: z.enum(ORG_ROLES, { message: 'บทบาทไม่ถูกต้อง' }),
})

export const removeMemberSchema = z.object({
  memberId: z.string().uuid('สมาชิกไม่ถูกต้อง'),
})
