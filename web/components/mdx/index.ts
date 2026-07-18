/**
 * The MDX component map.
 *
 * These five names are the complete set of Hugo shortcodes used anywhere in the corpus, and
 * the migration emits them verbatim as JSX — see the REGISTRY in
 * web/scripts/lib/shortcodes.ts, which is the authority on both the names and their props.
 * Renaming anything here breaks all 170 migrated content files at once, not just new content.
 */

import { BeforeAfter } from './BeforeAfter'
import { FlexImages } from './FlexImages'
import { Gallery } from './Gallery'
import { ImageModal } from './ImageModal'
import { NavButton } from './NavButton'

export const mdxComponents = {
  BeforeAfter,
  FlexImages,
  Gallery,
  ImageModal,
  NavButton,
} as const

export { BeforeAfter, FlexImages, Gallery, ImageModal, NavButton }
export { findFirstImageModal, ImageModalJsonLd } from './ImageModalJsonLd'

export type { BeforeAfterProps } from './BeforeAfter'
export type { FlexImagesProps } from './FlexImages'
export type { ImageModalProps } from './ImageModal'
export type { NavButtonProps } from './NavButton'
