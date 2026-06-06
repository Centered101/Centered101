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
  icon: SocialLinkIcon
  sortOrder: number
}
