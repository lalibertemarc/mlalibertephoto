'use client'

import { useTranslations } from 'next-intl'
import { internalHref, linkTargetProps } from '@/lib/links'
import { ContentImage } from './ContentImage'
import { useInGallery } from './gallery-context'
import { useIsModalHost } from './image-modal/use-modal-host'
import { ModalHost } from './image-modal/ModalHost'
import { modalStore, type ModalImage } from './image-modal/store'
import styles from './gallery.module.css'
import navButtonStyles from './nav-button.module.css'

/**
 * A click-to-enlarge image. Ports layouts/shortcodes/image-modal.html.
 *
 * Every prop is a string, because the migration emits JSX expressions carrying the Hugo
 * parameter values verbatim (`width={"500px"}`) — see web/scripts/lib/shortcodes.ts, which
 * is the authority on this contract. `width` and `height` are therefore CSS lengths, not
 * pixel counts, and never reach next/image as dimensions.
 */
export interface ImageModalProps {
  src: string
  alt: string
  /** Shown under the enlarged image, not in the page. */
  caption?: string
  /** A CSS length ("500px"). Sets the rendered width; inert inside a Gallery. */
  width?: string
  /** A CSS length. Used by exactly one post in the corpus. */
  height?: string
  /** Rendered as a figcaption — above the image standalone, as a hover overlay in a gallery. */
  title?: string
  buttonUrl?: string
  buttonText?: string
  /**
   * Accepted for compatibility with the Hugo parameter and unused: next/image derives a
   * srcset from the loader. No content in the corpus sets it.
   */
  srcSet?: string
  /** BEM modifier. The corpus only ever uses "wide". */
  variant?: string
}

/**
 * A gallery cell is one column of a 3/2/1-column grid, so it never needs a
 * viewport-width variant on desktop. Breakpoints match the grid's in gallery.module.css.
 */
const GALLERY_SIZES = '(max-width: 767px) 100vw, (max-width: 991px) 50vw, 33vw'

/** A `variant="wide"` cell spans every column. */
const WIDE_SIZES = '100vw'

/** Widest a standalone image can render when its CSS width is a percentage or absent. */
const FALLBACK_STANDALONE_WIDTH = '700px'

/**
 * Standalone images are capped by their declared CSS width, so above that width the browser
 * should stop requesting larger variants. Below it the image is viewport-constrained.
 */
function standaloneSizes(width: string | undefined): string {
  const cap = width && width.endsWith('px') ? width : FALLBACK_STANDALONE_WIDTH
  return `(max-width: ${cap}) 100vw, ${cap}`
}

export function ImageModal({
  src,
  alt,
  caption,
  width,
  height,
  title,
  buttonUrl,
  buttonText,
  variant,
}: ImageModalProps) {
  const t = useTranslations('ImageModal')
  const inGallery = useInGallery()
  const isHost = useIsModalHost()

  /**
   * Collect the images the modal may navigate between, and open at the clicked one.
   *
   * The list is read from the DOM rather than from React state because the DOM already
   * states document order — the same approach the Hugo modal took with
   * `clickedImg.closest('.photo-gallery')`. Outside a gallery the modal opens on a
   * single image with no navigation, matching the source.
   */
  function handleClick(event: React.MouseEvent<HTMLImageElement>) {
    const clicked = event.currentTarget
    const root = clicked.closest<HTMLElement>('[data-gallery-root]')

    if (!root) {
      modalStore.open([{ src, alt, caption }], 0)
      return
    }

    const triggers = Array.from(root.querySelectorAll<HTMLImageElement>('[data-modal-trigger]'))
    const images: ModalImage[] = triggers.map((trigger) => ({
      // The original URL, not `trigger.src` — that is the loader's rewritten, width-capped
      // variant, which would both miss the dimension manifest and pin the enlarged view to
      // a thumbnail-sized image.
      src: trigger.dataset.modalSrc ?? trigger.src,
      alt: trigger.alt,
      caption: trigger.dataset.caption || undefined,
    }))
    modalStore.open(images, Math.max(triggers.indexOf(clicked), 0))
  }

  const figureClass = [styles.figure, inGallery && variant === 'wide' ? styles.wide : null]
    .filter(Boolean)
    .join(' ')

  /**
   * Mirrors the source's conditional exactly (image-modal.html:13-15): a declared width sets
   * `width`, and its absence sets `max-width: 100%` *instead* — never both.
   *
   * Setting `width: 100%` as the fallback would distort every image that declares a `height`
   * without a `width`, since the two fixed lengths disagree and an <img> defaults to
   * `object-fit: fill`. Three images in the corpus do exactly that.
   *
   * Inside a gallery this is skipped entirely: the cell owns the box.
   */
  const standaloneStyle: React.CSSProperties = {
    ...(width ? { width } : { maxWidth: '100%' }),
    height: height ?? 'auto',
  }

  return (
    <figure className={figureClass} itemScope itemType="https://schema.org/ImageObject">
      {title && (
        <figcaption className={styles.title} itemProp="name">
          {title}
        </figcaption>
      )}

      <ContentImage
        className={styles.image}
        src={src}
        alt={alt}
        sizes={inGallery ? (variant === 'wide' ? WIDE_SIZES : GALLERY_SIZES) : standaloneSizes(width)}
        itemProp="contentUrl"
        loading="lazy"
        data-modal-trigger=""
        // The original URL, kept alongside the rendered one so the modal can reopen the image
        // at full size rather than reusing the width-capped variant the loader produced.
        data-modal-src={src}
        data-caption={caption ?? ''}
        style={inGallery ? undefined : standaloneStyle}
        onClick={handleClick}
      />

      {buttonUrl && (
        <div className={styles.buttonContainer}>
          <a
            href={internalHref(buttonUrl)}
            className={
              inGallery
                ? `${navButtonStyles.navButton} ${navButtonStyles.galleryOverlay}`
                : navButtonStyles.navButton
            }
            {...linkTargetProps(buttonUrl)}
          >
            {buttonText ?? t('moreFromShoot')}
          </a>
        </div>
      )}

      {isHost && <ModalHost />}
    </figure>
  )
}
