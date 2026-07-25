/**
 * The MDX component map.
 *
 * The five capitalised names are the complete set of Hugo shortcodes used anywhere in the
 * corpus, and the migration emits them verbatim as JSX — see the REGISTRY in
 * web/scripts/lib/shortcodes.ts, which is the authority on both the names and their props.
 * Renaming anything here breaks all 170 migrated content files at once, not just new content.
 *
 * `FaIcon` is the sixth name and the only one that has no Hugo shortcode behind it. Content
 * writes bare Font Awesome `<i>` tags against a CDN stylesheet this app does not load, and
 * `scripts/lib/html-jsx.ts` rewrites them to this component during migration. It is a real
 * component rather than an `i` entry in this map because MDX routes only markdown-generated
 * elements through `components` — literal JSX compiles to a string tag the map cannot reach.
 */

import { BeforeAfter } from './BeforeAfter'
import { FaIcon } from './FaIcon'
import { FlexImages } from './FlexImages'
import { Gallery } from './Gallery'
import { ImageModal } from './ImageModal'
import { NavButton } from './NavButton'

export const mdxComponents = {
  BeforeAfter,
  FaIcon,
  FlexImages,
  Gallery,
  ImageModal,
  NavButton,
} as const

export { BeforeAfter, FaIcon, FlexImages, Gallery, ImageModal, NavButton }
export { findFirstImageModal, ImageModalJsonLd } from './ImageModalJsonLd'

export type { BeforeAfterProps } from './BeforeAfter'
export type { FlexImagesProps } from './FlexImages'
export type { ImageModalProps } from './ImageModal'
export type { NavButtonProps } from './NavButton'
