import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { ImageModal, type ImageModalProps } from './ImageModal'

/**
 * The first ImageModal in a rendered MDX body, or null if it contains none.
 *
 * Hugo emitted the ImageObject block from the first image-modal call on a page, gated by a
 * Scratch flag. Reproducing that with a client-side "first to mount wins" flag would put the
 * script in the DOM only after hydration, where a crawler is unlikely to see it — the whole
 * point of the markup. Walking the element tree during the server render instead keeps it in
 * the exported HTML, and is deterministic rather than dependent on effect ordering.
 */
export function findFirstImageModal(node: ReactNode): ImageModalProps | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findFirstImageModal(child)
      if (found) return found
    }
    return null
  }

  if (!isValidElement(node)) return null

  const element = node as ReactElement<{ children?: ReactNode }>
  if (element.type === ImageModal) return element.props as unknown as ImageModalProps

  return findFirstImageModal(element.props.children ?? null)
}

export interface ImageModalJsonLdProps {
  image: ImageModalProps
  /** Absolute canonical URL of the page the image appears on. */
  pageUrl: string
}

/**
 * Schema.org ImageObject for the page's first image. Ports the block at
 * layouts/shortcodes/image-modal.html:39-52, field for field.
 */
export function ImageModalJsonLd({ image, pageUrl }: ImageModalJsonLdProps) {
  const payload = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    contentUrl: image.src,
    name: image.title ?? '',
    description: image.alt,
    caption: image.caption ?? '',
    associatedArticle: {
      '@type': 'Article',
      url: pageUrl,
    },
  }

  return (
    <script
      type="application/ld+json"
      // Escaped so a `<` inside a caption cannot close the script element early.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload).replace(/</g, '\\u003c') }}
    />
  )
}
