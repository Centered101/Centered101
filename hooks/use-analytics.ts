'use client'

import { useCallback, useEffect, useRef } from 'react'

export function useAnalytics() {
  const hasTrackedPageView = useRef(false)

  const trackEvent = useCallback(
    async (eventType: string, eventData?: Record<string, unknown>) => {
      try {
        await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventType,
            eventData,
            pagePath: window.location.pathname,
          }),
        })
      } catch (error) {
        console.error('Analytics tracking error:', error)
      }
    },
    []
  )

  const trackPageView = useCallback(() => {
    if (hasTrackedPageView.current) return
    hasTrackedPageView.current = true
    trackEvent('page_view', {
      url: window.location.href,
      title: document.title,
    })
  }, [trackEvent])

  const trackRepoClick = useCallback(
    (repoName: string, repoUrl: string) => {
      trackEvent('repo_click', { repoName, repoUrl })
    },
    [trackEvent]
  )

  const trackContactSubmit = useCallback(() => {
    trackEvent('contact_submit')
  }, [trackEvent])

  const trackResumeDownload = useCallback(async () => {
    trackEvent('resume_download')
    try {
      await fetch('/api/resume', { method: 'POST' })
    } catch (error) {
      console.error('Resume download tracking error:', error)
    }
  }, [trackEvent])

  useEffect(() => {
    trackPageView()
  }, [trackPageView])

  return {
    trackEvent,
    trackRepoClick,
    trackContactSubmit,
    trackResumeDownload,
  }
}
