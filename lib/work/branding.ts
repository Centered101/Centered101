/**
 * The workspace's name, in one place.
 *
 * It was written out in five files — the sidebar, the signed-out card, the
 * page-title template and default, and the legal documents — so renaming the
 * product meant finding all five and getting the typographic apostrophe right
 * each time. Missing one leaves a privacy policy naming a service the app no
 * longer calls itself.
 *
 * READ AS A STATIC `process.env.X` REFERENCE, not through a variable or an
 * index. Next.js inlines `NEXT_PUBLIC_*` into the browser bundle only where it
 * can see the literal lookup at build time; a dynamic read compiles to
 * `undefined` on the client and the sidebar would render the fallback while
 * the server rendered the configured name — a hydration mismatch.
 *
 * BUILD-TIME, NOT RUNTIME. The value is baked into the bundle, so changing it
 * needs a rebuild, not just a restart. That is the trade for having the same
 * string available in a Client Component.
 */
export const APP_NAME = process.env.NEXT_PUBLIC_WORK_APP_NAME || "Centered101's Work"

/** The tagline under the name, on the page title and in metadata. */
export const APP_TAGLINE =
  process.env.NEXT_PUBLIC_WORK_APP_TAGLINE || 'ระบบจัดการลูกค้าสำหรับเอเจนซี'
