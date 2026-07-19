/**
 * The image a page shares to Facebook and Twitter.
 *
 * Hugo's chain (headers.html:88-91) is `banner` → `default_sharing_image` → a third
 * fallback that does not exist on disk and is unreachable because the second is always
 * configured.
 *
 * Hugo also gated the entire OG image block behind `$is_valid_image`, which checked
 * `fileExists` for local banners and trusted external ones unconditionally. That gate has
 * no equivalent here: `BannerSchema` guarantees width and height whenever a banner exists,
 * the migration already dropped the four banners whose files were missing, and the fallback
 * is a constant. So a share image is always resolvable, and the tags are never omitted.
 */

import type { Banner } from '@/lib/schema'
import { DEFAULT_SHARING_IMAGE } from './constants'
import { absoluteUrl } from './format'

export interface ShareImage {
  url: string
  width: number
  height: number
  alt?: string
  /** Undefined when the URL carries no usable extension — the tag is then omitted. */
  type?: string
  /** Whether this is the page's own banner rather than the site-wide fallback. */
  isOwn: boolean
}

/**
 * `image/<subtype>` from the file extension, matching headers.html:102, or undefined when
 * the URL has no extension to read.
 *
 * Hugo reads the extension off the path string rather than inspecting bytes, and special-
 * cases `.jpg` to `jpeg` because the generic branch would otherwise emit the invalid
 * `image/jpg`. Comparison is case-sensitive there and here; no content uses an uppercase
 * extension.
 *
 * The undefined case is a deviation. Hugo's `trim (path.Ext "") "."` yields an empty string,
 * so an extensionless banner makes it emit the malformed `image/`. Cloudinary URLs relying on
 * format-auto delivery have no extension, and `resolveBanner` in the migration only requires
 * an external banner to be an http(s) URL with declared dimensions — so this is reachable by
 * the next banner anyone adds. `og:image:type` is optional; omitting it beats shipping a
 * meaningless value, and crawlers sniff the type anyway.
 */
function imageMimeType(src: string): string | undefined {
  // Cloudinary URLs carry transformation segments and may carry a query string, so take the
  // extension from the path only.
  const withoutQuery = src.split(/[?#]/)[0] ?? src
  const lastSegment = withoutQuery.slice(withoutQuery.lastIndexOf('/') + 1)
  const lastDot = lastSegment.lastIndexOf('.')

  // A dot at position 0 is a leading-dot filename, not an extension.
  if (lastDot <= 0) return undefined
  const ext = lastSegment.slice(lastDot)

  if (ext === '.svg') return 'image/svg+xml'
  if (ext === '.jpg') return 'image/jpeg'
  return `image/${ext.slice(1)}`
}

export function resolveShareImage(banner?: Banner): ShareImage {
  if (banner) {
    return {
      url: absoluteUrl(banner.src),
      width: banner.width,
      height: banner.height,
      alt: banner.alt,
      type: imageMimeType(banner.src),
      isOwn: true,
    }
  }

  return {
    url: absoluteUrl(DEFAULT_SHARING_IMAGE.src),
    width: DEFAULT_SHARING_IMAGE.width,
    height: DEFAULT_SHARING_IMAGE.height,
    type: imageMimeType(DEFAULT_SHARING_IMAGE.src),
    isOwn: false,
  }
}
