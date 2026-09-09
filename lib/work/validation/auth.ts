import { z } from './zod'

/**
 * Auth input schemas.
 *
 * Parsed on the server inside every action — client-side validation is a
 * convenience for the user, never a check we rely on.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'กรุณากรอกอีเมล')
  .email('รูปแบบอีเมลไม่ถูกต้อง')
  .transform((value) => value.toLowerCase())

/**
 * 8 characters is Supabase's own default minimum. Enforcing a longer or more
 * ornate rule here than the auth server actually applies would reject
 * passwords Supabase would happily accept, so the two are kept aligned.
 */
export const passwordSchema = z.string().min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')

export const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(1, 'กรุณากรอกชื่อ').max(120),
})

/**
 * The editable half of a profile. Email is absent because it is the login
 * identity: changing it is an auth-server operation with its own confirmation
 * step, not a field on a settings form.
 */
export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, 'กรุณากรอกชื่อ').max(120, 'ชื่อยาวเกินไป'),
})

export const magicLinkSchema = z.object({ email: emailSchema })

/**
 * Setting a password where none exists yet — an account created through
 * Google. There is no current password to ask for, so there is no field for
 * one; whether that is true is decided by the server from the session, never
 * by which schema the form chose to submit against.
 */
export const setPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'รหัสผ่านยืนยันไม่ตรงกัน',
    path: ['confirmPassword'],
  })

/** Changing an existing password. The current one is proof, not a formality. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'กรุณากรอกรหัสผ่านปัจจุบัน'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'รหัสผ่านยืนยันไม่ตรงกัน',
    path: ['confirmPassword'],
  })
  // Caught here as well as by the auth server, so the user is told before the
  // round trip rather than after it.
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม',
    path: ['newPassword'],
  })

export type Credentials = z.infer<typeof credentialsSchema>
export type SignUpInput = z.infer<typeof signUpSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

/**
 * Only ever redirect to a path on this origin.
 *
 * Without this, `/work/login?next=https://evil.example` becomes an open redirect:
 * the user sees our domain, signs in, and is bounced to an attacker's page
 * that looks identical and asks them to "confirm" their password. Protocol
 * relative URLs (`//evil.example`) and backslash variants are rejected too.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = '/'): string {
  if (!value) return fallback
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback
  return value
}
