/**
 * Every head tag Hugo emits, as a Next `Metadata` object.
 *
 * One function serves all page kinds. That mirrors the template it ports: `headers.html`
 * branches on exactly one condition, `$is_blog`, and only three things depend on it —
 * `og:type`, the `article:*` block, and whether the Twitter card is large. Everything else
 * is identical for posts, pages, taxonomy archives and list pages. So `article` being
 * present *is* `$is_blog`, and no discriminated union is needed to say it twice.
 *
 * Two tags cannot be expressed here and are rendered as JSX instead — see
 * `components/seo/ExtraMeta.tsx`. Callers need both halves.
 *
 * The full contract, including the bugs this deliberately does not reproduce, is in
 * `docs/seo-contract.md`.
 */

import type { Metadata } from 'next'
import type { Locale } from '@/lib/permalink'
import type { Banner, PermalinkPair } from '@/lib/schema'
import { getSiteConfig } from '@/lib/site-config'
import { SEO_DEFAULTS, SITE_AUTHOR } from './constants'
import { absoluteUrl, formatMetaDatetime, toPlainText, truncateChars } from './format'
import { resolveShareImage } from './share-image'

/** Hugo's `truncate` limits for the Twitter card (headers.html:131,135). */
const TWITTER_TITLE_CHARS = 70
const TWITTER_DESCRIPTION_CHARS = 200

export interface SeoInput {
  locale: Locale
  /**
   * Where this page lives in both languages. Required rather than optional because the
   * corpus is fully symmetric — all 85 content paths exist in both trees, and taxonomy
   * terms are the same strings in both, so every page has a counterpart. Taking the pair
   * rather than one path plus a lookup means canonical and hreflang cannot disagree.
   */
  permalinks: PermalinkPair
  title: string
  metaTitle?: string
  description?: string
  keywords?: string[]
  noindex?: boolean
  banner?: Banner
  /**
   * Drives `og:updated_time`. Independent of `article` because Hugo's `.Lastmod` block sits
   * outside the `$is_blog` branch (headers.html:116). No content sets `lastmod`, so callers
   * pass the post's `date`.
   */
  updatedAt?: string
  /** Presence marks this as a blog post — Hugo's `$is_blog`. */
  article?: {
    tags: string[]
    categories: string[]
    publishedAt: string
  }
}

export function buildMetadata(input: SeoInput): Metadata {
  const { locale, permalinks, article, noindex } = input
  const site = getSiteConfig(locale)
  const defaults = SEO_DEFAULTS[locale]

  const title = toPlainText(input.metaTitle ?? input.title)
  const description = toPlainText(input.description || defaults.description)
  const image = resolveShareImage(input.banner)

  const canonical = permalinks[locale]
  const rssPath = locale === 'en' ? '/en/index.xml' : '/index.xml'

  return {
    // Hugo's <title> is the bare page title — it never appends the site name, for any page
    // kind. `absolute` opts out of the root layout's template, which would otherwise make
    // every page read "Title | Site".
    title: { absolute: title },
    description,
    authors: [{ name: SITE_AUTHOR }],

    alternates: {
      canonical,
      // The single largest gap this port closes: Hugo emits hreflang in the sitemap but has
      // never emitted it in the head, leaving Google to treat the FR and EN pages as
      // unrelated near-duplicates. x-default points at French, the default content language.
      languages: {
        fr: permalinks.fr,
        en: permalinks.en,
        'x-default': permalinks.fr,
      },
      types: {
        // Hugo links `/index.xml` from both languages (headers.html:84) because `absURL` on
        // a literal adds no language prefix — so English pages advertise the French feed.
        // Fixed here.
        'application/rss+xml': [{ url: rssPath, title: site.title }],
      },
    },

    openGraph: {
      type: article ? 'article' : 'website',
      locale,
      siteName: site.title,
      title: { absolute: title },
      description,
      url: canonical,
      images: [
        { url: image.url, width: image.width, height: image.height, alt: image.alt, type: image.type },
      ],
      ...(article
        ? {
            // Formatted, not passed through: Next emits these verbatim, and the stored
            // frontmatter string carries a colon in its offset (`-04:00`) where Go's
            // `Z0700` layout does not (`-0400`).
            publishedTime: formatMetaDatetime(article.publishedAt),
            // No content carries `lastmod`, so Hugo's `.Lastmod` falls back to `.Date` and
            // modified always equals published. Reproduced rather than omitted.
            modifiedTime: formatMetaDatetime(input.updatedAt ?? article.publishedAt),
            section: article.categories[0],
            tags: article.tags,
          }
        : {}),
    },

    twitter: {
      // Never left to Next to infer: it defaults to summary_large_image whenever any image
      // resolves, and one always does here. Hugo requires the page to be a post carrying its
      // own banner (headers.html:129) — the fallback logo does not qualify.
      card: article && image.isOwn ? 'summary_large_image' : 'summary',
      title: { absolute: truncateChars(title, TWITTER_TITLE_CHARS) },
      description: truncateChars(description, TWITTER_DESCRIPTION_CHARS),
      images: [image.url],
    },

    icons: {
      icon: [{ url: '/img/favicon.ico', type: 'image/x-icon' }],
      apple: '/img/apple-touch-icon.png',
    },

    other: {
      // These three go through `other` rather than the typed fields because Next reformats
      // those and Hugo's exact strings matter. `resolveRobotsValue` joins flags with a
      // comma *and a space* and has no "all" token, so the typed `robots` field cannot
      // produce `all,follow`. Keywords likewise: Next joins an array with a bare comma,
      // while Hugo's `delimit` uses ", " — passing one pre-joined string sidesteps the join
      // entirely, since Array#join never inserts a separator for a single element.
      robots: noindex ? 'noindex,nofollow' : 'all,follow',
      googlebot: noindex
        ? 'noindex,nofollow,nosnippet,noarchive'
        : 'index,follow,snippet,archive',
      keywords: [...new Set(input.keywords ?? defaults.keywords)].join(', '),
    },
  }
}

/**
 * Absolute canonical URL for a page, for the JSON-LD blocks that need one.
 *
 * `Metadata.alternates.canonical` takes a relative path and Next absolutises it against
 * `metadataBase`; JSON-LD is hand-serialised and has no such step.
 */
export function canonicalUrl(input: Pick<SeoInput, 'locale' | 'permalinks'>): string {
  return absoluteUrl(input.permalinks[input.locale])
}
