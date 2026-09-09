import { FileText, Link as LinkIcon, Type } from 'lucide-react'

import type { ProjectAsset } from '@/lib/work/queries/assets'

/**
 * A small preview for one row of the brand/reference asset table — used by
 * both the client wizard's upload step and the admin review screen.
 *
 * An image renders as an actual thumbnail rather than another line of text,
 * because the table's one job is letting someone recognise a logo or
 * favicon without opening it — the review screen especially, where staff are
 * judging the file, not just confirming it exists. PDFs and fonts have
 * nothing to preview inline, so they keep a type icon instead; a
 * reference-website row (no file, only externalUrl) gets a link icon,
 * matching what its own row actually links to.
 *
 * No signed URL is minted here: the `<img>` src points at the existing
 * download route, which authorizes the read under the caller's session and
 * redirects to a short-lived signed URL (see that route's own comment). The
 * browser follows the redirect the same way it would for any other image.
 */
export function AssetThumbnail({
  asset,
}: {
  asset: Pick<ProjectAsset, 'id' | 'hasFile' | 'mimeType'>
}) {
  if (asset.hasFile && asset.mimeType?.startsWith('image/')) {
    // Points at our own signed-redirect route, not a static asset next/image can optimize.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/work/api/assets/${asset.id}/download`} alt="" className="asset-thumb" loading="lazy" />
    )
  }

  const Icon = !asset.hasFile ? LinkIcon : asset.mimeType?.startsWith('font/') ? Type : FileText

  return (
    <span className="asset-thumb asset-thumb-icon">
      <Icon size={16} />
    </span>
  )
}
