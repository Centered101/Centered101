import { cookies } from 'next/headers'

export const THEME_COOKIE = 'work-theme'

/**
 * Reads the persisted theme on the server so the first paint is already
 * correct. Fixes the flash-of-wrong-theme in the prototype (audit D10).
 */
export async function getInitialDark(): Promise<boolean> {
  const store = await cookies()
  return store.get(THEME_COOKIE)?.value === 'dark'
}
