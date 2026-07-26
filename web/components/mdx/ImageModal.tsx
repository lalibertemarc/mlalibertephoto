'use client'

import { useTranslations } from 'next-intl'
import { internalHref, linkTargetProps } from '@/lib/links'
import { getDimensions } from '@/lib/image-dimensions'
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
const GALLERY_WIDTHS = ['(max-width: 767px) 100vw', '(max-width: 991px) 50vw', '33vw']

/** A `variant="wide"` cell spans every column. */
const WIDE_WIDTHS = ['100vw']

/** Cell aspect ratios, from `--aspect-portrait` / `--aspect-wide` in globals.css. */
const CELL_ASPECT = 4 / 5
const WIDE_CELL_ASPECT = 16 / 9

/**
 * How much wider than its cell `object-fit: cover` paints an image.
 *
 * A gallery cell is a fixed 4/5 (or 16/9 when wide) box and the image fills it by covering,
 * so anything wider than the cell is scaled up until its *height* fits and then cropped left
 * and right. The painted width is therefore the cell width times the ratio mismatch, not the
 * cell width — a 2.7:1 panorama in a 4/5 cell paints 3.4× wider than the box it sits in.
 *
 * `sizes` describes the box, so without this correction the browser picks a candidate three
 * stops too small and the crop is a visible upscale: measured at 2.0× on the widest images in
 * the corpus. The wider the image, the blurrier the thumbnail — the reported symptom exactly.
 *
 * Returns 1 for an image the manifest does not know, and for anything the cell crops
 * vertically instead (a portrait in a portrait cell), where the cell width is already right.
 */
function coverFactor(src: string, cellAspect: number): number {
  const dimensions = getDimensions(src)
  if (!dimensions) return 1
  return Math.max(1, dimensions.w / dimensions.h / cellAspect)
}

/** Applies the cover correction to each entry of a `sizes` list. */
function scaleSizes(widths: string[], factor: number): string {
  if (factor <= 1) return widths.join(', ')
  const scale = factor.toFixed(2)
  return widths
    .map((entry) => {
      const at = entry.lastIndexOf(' ')
      // Entries are either "<media> <length>" or a bare "<length>".
      return at === -1
        ? `calc(${entry} * ${scale})`
        : `${entry.slice(0, at)} calc(${entry.slice(at + 1)} * ${scale})`
    })
    .join(', ')
}

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

  const isWideCell = variant === 'wide'

  const figureClass = [styles.figure, inGallery && isWideCell ? styles.wide : null]
    .filter(Boolean)
    .join(' ')

  const gallerySizes = scaleSizes(
    isWideCell ? WIDE_WIDTHS : GALLERY_WIDTHS,
    coverFactor(src, isWideCell ? WIDE_CELL_ASPECT : CELL_ASPECT),
  )

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
        sizes={inGallery ? gallerySizes : standaloneSizes(width)}
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
