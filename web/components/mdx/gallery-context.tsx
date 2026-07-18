'use client'

import { createContext, useContext } from 'react'

/**
 * Tells an ImageModal whether it is rendering inside a Gallery.
 *
 * This is needed at render time, not click time. A gallery cell is a fixed-ratio box the
 * image fills, so it needs `sizes` describing a grid column; a standalone image is laid out
 * at its declared CSS width and needs `sizes` describing that. Getting this wrong means
 * every gallery thumbnail downloads a viewport-width variant.
 *
 * It cannot be inferred from the props: the obvious tell would be the `width` prop, but 221
 * of the 295 in-gallery images declare one (it is simply inert there, overridden by the
 * cell), so presence of `width` says nothing about context.
 *
 * Click-time concerns — which images are siblings, and in what order — deliberately do NOT
 * use this. Those are read from the DOM, which states document order directly instead of
 * having to reconstruct it from mount order.
 */
const InGalleryContext = createContext(false)

export function GalleryScope({ children }: { children: React.ReactNode }) {
  return <InGalleryContext value={true}>{children}</InGalleryContext>
}

export function useInGallery(): boolean {
  return useContext(InGalleryContext)
}
