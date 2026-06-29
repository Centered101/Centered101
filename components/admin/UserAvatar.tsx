type Props = {
  avatarUrl?: string | null
  name: string
  githubUsername?: string | null
  size?: 'sm' | 'md'
}

export function UserAvatar({ avatarUrl, name, githubUsername, size = 'md' }: Props) {
  const src = avatarUrl || (githubUsername ? `https://avatars.githubusercontent.com/${githubUsername}?s=64` : null)
  const dim = size === 'sm' ? 'size-7' : 'size-9'
  const text = size === 'sm' ? 'text-xs' : 'text-sm'
  const initial = (name || 'A')[0].toUpperCase()

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={`${dim} shrink-0 rounded-full object-cover`}
      />
    )
  }

  return (
    <div className={`grid ${dim} shrink-0 place-items-center rounded-full bg-[#409EFE]/10 ${text} font-bold text-[#409EFE]`}>
      {initial}
    </div>
  )
}
