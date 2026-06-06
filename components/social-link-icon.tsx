import { BadgeCheck, Github, Globe, Instagram, Mail, MessageCircle, Twitter } from 'lucide-react'
import type { ElementType } from 'react'
import type { SocialLinkIcon } from '@/lib/social-links/types'

const icons = {
  github: Github,
  twitter: Twitter,
  instagram: Instagram,
  website: Globe,
  email: Mail,
  orcid: BadgeCheck,
  line: MessageCircle,
  globe: Globe,
} satisfies Record<SocialLinkIcon, ElementType>

export function getSocialLinkIcon(icon: SocialLinkIcon) {
  return icons[icon] || Globe
}
