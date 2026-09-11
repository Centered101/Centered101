import { Code2 } from 'lucide-react'

import { idTone } from '@/lib/work/format'

/**
 * A project's mark.
 *
 * The client's OWN uploaded logo when they added one at intake (LOGO, then
 * ICON, then FAVICON — see logoByProject), so a project is recognisable at a
 * glance instead of every one wearing the same generic code icon. Falls back
 * to the id-toned icon, which is what every project had before.
 *
 * No signed URL is minted here: the <img> src points at the existing asset
 * download route, which authorizes under the caller's session and redirects to
 * a short-lived signed URL — the same approach AssetThumbnail already uses.
 *
 * `size="large"` matches `.project-icon.large` (45px), the portal dashboard
 * hero; the default is the 29px list footprint.
 */
export function ProjectIcon({
  projectId,
  logoAssetId,
  size,
}: {
  projectId: string
  logoAssetId: string | null
  size?: 'large'
}) {
  const large = size === 'large' ? ' large' : ''

  if (logoAssetId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/work/api/assets/${logoAssetId}/download`}
        alt=""
        className={`project-icon project-icon-logo${large}`}
        loading="lazy"
      />
    )
  }

  return (
    <div className={`project-icon ${idTone(projectId)}${large}`}>
      <Code2 size={size === 'large' ? 22 : 16} />
    </div>
  )
}
