export type AdminSwitcherItemBase = {
  href: string
}

const RECENT_ADMIN_KEY = 'centered101_recent_admin_workspaces'

export function rememberAdminWorkspace(href: string) {
  if (typeof window === 'undefined') return

  try {
    const current = JSON.parse(localStorage.getItem(RECENT_ADMIN_KEY) || '[]') as string[]
    const next = [href, ...current.filter((item) => item !== href)].slice(0, 8)
    localStorage.setItem(RECENT_ADMIN_KEY, JSON.stringify(next))
  } catch {
    localStorage.setItem(RECENT_ADMIN_KEY, JSON.stringify([href]))
  }
}

export function sortAdminWorkspaces<T extends AdminSwitcherItemBase>(items: T[]) {
  if (typeof window === 'undefined') return items

  try {
    const recent = JSON.parse(localStorage.getItem(RECENT_ADMIN_KEY) || '[]') as string[]
    const rank = new Map(recent.map((href, index) => [href, index]))

    return [...items].sort((a, b) => {
      const aRank = rank.get(a.href)
      const bRank = rank.get(b.href)
      if (aRank == null && bRank == null) return 0
      if (aRank == null) return 1
      if (bRank == null) return -1
      return aRank - bRank
    })
  } catch {
    return items
  }
}
