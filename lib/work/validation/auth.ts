import { z } from 'zod'

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

export const magicLinkSchema = z.object({ email: emailSchema })

export type Credentials = z.infer<typeof credentialsSchema>
export type SignUpInput = z.infer<typeof signUpSchema>

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
