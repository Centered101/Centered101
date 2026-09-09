import * as React from 'react'

const MOBILE_BREAKPOINT = 768

function getIsMobile() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

/**
 * `useSyncExternalStore`, not `useEffect` + `setState`: the viewport width is
 * external state React does not own, and this is the API built for reading
 * it — a snapshot function plus a subscription, no synchronous `setState`
 * inside an effect body for React to warn about.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getIsMobile, () => false)
}
