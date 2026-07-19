'use client'

import { useSyncExternalStore } from 'react'

/**
 * Whether the visitor has asked for reduced motion.
 *
 * CSS handles the decorative half of that request on its own (see carousel.module.css), but
 * autoplay is not a CSS property — a media query cannot stop a timer — so the preference has to
 * reach JavaScript too.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`: `matchMedia` is an external store,
 * and this is what React provides for reading one. It also gives the static export a defined
 * answer through `getServerSnapshot` instead of rendering one value and immediately setting
 * another, which is both a cascading render and a hydration mismatch waiting to happen.
 *
 * The server snapshot is `false` — assume motion is fine. `matchMedia` does not exist during the
 * build, so the pre-rendered HTML has to commit to one answer, and this way a reduced-motion
 * visitor sees autoplay stop on hydration rather than a motion-tolerant visitor getting a
 * carousel that never starts. The CSS half applies either way, before any of this runs.
 */
const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onStoreChange: () => void): () => void {
  const query = window.matchMedia(QUERY)
  query.addEventListener('change', onStoreChange)
  return () => query.removeEventListener('change', onStoreChange)
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches
}

function getServerSnapshot(): boolean {
  return false
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
