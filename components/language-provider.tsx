'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import { Locale, translations } from '@/lib/i18n'

type TranslationCopy = (typeof translations)[Locale]

type LanguageContextValue = {
  locale: Locale
  copy: TranslationCopy
  toggleLocale: () => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en')

  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    copy: translations[locale],
    toggleLocale: () => setLocale((current) => (current === 'en' ? 'th' : 'en')),
  }), [locale])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider')
  }

  return context
}
