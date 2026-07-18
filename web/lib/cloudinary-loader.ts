/**
 * next/image loader.
 *
 * `output: 'export'` removes the built-in optimizer, so without a custom loader every
 * image is served exactly as authored. That is what the Hugo site does today: all 272
 * distinct Cloudinary URLs in the corpus are bare `/upload/v<version>/<name>.jpg` with no
 * transformation segment at all, meaning a phone downloads the same full-size JPEG a
 * desktop does, with no srcset to choose from.
 *
 * Cloudinary reads transformations out of the URL path, so the fix is purely a rewrite —
 * nothing needs uploading or re-processing. Injecting `f_auto,q_auto,w_<width>,c_limit`
 * after `/upload/` yields a format-negotiated (AVIF/WebP where supported), width-
 * appropriate variant, and next/image calls this loader once per entry in `deviceSizes`
 * to build a real srcset.
 *
 * Content stores the bare URL. The transform is a rendering concern and is never written
 * back into MDX — see docs/content-migration.md on the URL contract.
 */

/**
 * `c_limit` scales down to fit the requested width but never scales up, so requesting a
 * width larger than the original returns the original rather than an upscaled blur.
 * Cropping would change the composition, which is the photographer's, not the layout's.
 */
const TRANSFORM_MODE = 'c_limit'

/** Cloudinary's own automatic quality selection. Overridden by next/image's `quality`. */
const DEFAULT_QUALITY = 'auto'

const CLOUDINARY_UPLOAD = '/image/upload/'

export interface ImageLoaderArgs {
  src: string
  width: number
  quality?: number
}

/**
 * Non-Cloudinary sources pass through untouched.
 *
 * Two kinds occur: the 36 local files under `/img/*`, which are already sized and served
 * off the same origin, and three third-party editorial images (slate.com, redd.it,
 * denofgeek.com) embedded in one blog post. Neither can accept Cloudinary transform
 * segments, and rewriting a foreign host's path would produce a 404.
 */
function isCloudinary(src: string): boolean {
  return src.startsWith('https://res.cloudinary.com/') && src.includes(CLOUDINARY_UPLOAD)
}

export default function cloudinaryLoader({ src, width, quality }: ImageLoaderArgs): string {
  if (!isCloudinary(src)) return src

  const q = quality ?? DEFAULT_QUALITY
  const transform = `f_auto,q_${q},w_${width},${TRANSFORM_MODE}`

  // Split on the first `/image/upload/` only. A delivery path may legitimately repeat the
  // segment inside a public ID, and splitting on every occurrence would corrupt the tail.
  const at = src.indexOf(CLOUDINARY_UPLOAD)
  const head = src.slice(0, at + CLOUDINARY_UPLOAD.length)
  const tail = src.slice(at + CLOUDINARY_UPLOAD.length)

  return `${head}${transform}/${tail}`
}
