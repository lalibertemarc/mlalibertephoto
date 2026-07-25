'use client'

import Image from 'next/image'
import { getDimensions } from '@/lib/image-dimensions'

/**
 * Every image rendered from content goes through here.
 *
 * `next/image` requires intrinsic dimensions, which come from the committed manifest
 * (lib/image-dimensions.ts). An image added to content since the last run of
 * `npm run images:dimensions` has no entry — an expected, recurring situation, not an edge
 * case — so this degrades to a plain `<img>`. That costs layout shift on one image, which is
 * not worth failing a build or, worse, rendering nothing.
 *
 * The degrade lives here rather than at each call site because the three call sites are easy
 * to get inconsistently right: a modal that renders no image at all looks like a broken
 * overlay, and a comparison slider missing one half looks like a broken slider.
 */
export type ContentImageProps = Omit<
  React.ComponentPropsWithoutRef<'img'>,
  'src' | 'alt' | 'width' | 'height'
> & {
  src: string
  alt: string
  sizes?: string
}

export function ContentImage({ src, alt, sizes, ...rest }: ContentImageProps) {
  const dimensions = getDimensions(src)

  if (!dimensions) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...rest} />
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={dimensions.w}
      height={dimensions.h}
      sizes={sizes}
      {...rest}
    />
  )
}
