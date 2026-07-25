/**
 * Per-post BlogPosting schema.
 *
 * Net new — Hugo emits no article-level structured data at all, so there is no output to
 * match and nothing to regress. Kept to the fields schema.org actually wants for a
 * BlogPosting: anything richer (`wordCount`, `articleBody`) would be invented rather than
 * ported, and wrong structured data is worse than absent structured data.
 *
 * `dateModified` equals `datePublished` because no content in the corpus carries `lastmod`
 * and Hugo's `.Lastmod` falls back to `.Date`. If a real modification date ever exists, it
 * belongs here.
 *
 * Intended for the blog-post route that lands with the content-rendering work; it takes the
 * post's own `meta.json` shape so that route can pass what it already has.
 */

import type { Locale } from '@/lib/permalink'
import { SITE_AUTHOR } from '@/lib/seo/constants'
import { absoluteUrl, formatMetaDatetime } from '@/lib/seo/format'
import { resolveShareImage } from '@/lib/seo/share-image'
import type { Banner } from '@/lib/schema'
import { getSiteConfig } from '@/lib/site-config'
import { JsonLd } from './JsonLd'

export interface BlogPostingJsonLdProps {
  locale: Locale
  /** Absolute canonical URL — `canonicalUrl()` from `lib/seo/metadata.ts`. */
  url: string
  title: string
  description: string
  /** Raw frontmatter datetime. */
  publishedAt: string
  banner?: Banner
  authors: string[]
}

export function BlogPostingJsonLd({
  locale,
  url,
  title,
  description,
  publishedAt,
  banner,
  authors,
}: BlogPostingJsonLdProps) {
  const site = getSiteConfig(locale)
  const image = resolveShareImage(banner)
  const published = formatMetaDatetime(publishedAt)

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: title,
        description,
        image: image.url,
        datePublished: published,
        dateModified: published,
        author: (authors.length > 0 ? authors : [SITE_AUTHOR]).map((name) => ({
          '@type': 'Person',
          name,
        })),
        publisher: {
          '@type': 'Organization',
          name: site.title,
          logo: { '@type': 'ImageObject', url: site.logoSrc },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        url: absoluteUrl(url),
      }}
    />
  )
}
