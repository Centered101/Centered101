import { useEffect } from 'react'

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} — Centered101 Admin`
    return () => { document.title = 'Centered101 Admin' }
  }, [title])
}
