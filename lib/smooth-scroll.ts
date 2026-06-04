const DEFAULT_DURATION = 850

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function smoothScrollTo(target: number | string, duration = DEFAULT_DURATION) {
  if (typeof window === 'undefined') {
    return
  }

  const startY = window.scrollY
  const targetY =
    typeof target === 'number'
      ? target
      : document.getElementById(target)?.getBoundingClientRect().top ?? 0
  const destination = typeof target === 'number' ? target : Math.max(startY + targetY - 84, 0)
  const distance = destination - startY
  const startTime = performance.now()

  const tick = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = easeInOutCubic(progress)

    window.scrollTo(0, startY + distance * eased)

    if (progress < 1) {
      requestAnimationFrame(tick)
    }
  }

  requestAnimationFrame(tick)
}
