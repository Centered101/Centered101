export type SocialLinkIcon =
  | 'github'
  | 'twitter'
  | 'instagram'
  | 'website'
  | 'email'
  | 'orcid'
  | 'line'
  | 'globe'

export interface SocialLink {
  id: string
  name: string
  label: string | null
  href: string
  /** Raw thesvg.org slug (optionally with a ":variant" suffix). */
  icon: string
  sortOrder: number
}
