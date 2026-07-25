/**
 * The sitemapindex and the two per-language urlsets.
 *
 * Hugo's internal template produces a sitemapindex whenever more than one language is
 * configured, independent of `defaultContentLanguageInSubdir` — which is why the French
 * sub-sitemap lives at `/fr/sitemap.xml` even though French pages carry no `/fr/` prefix.
 * That shape is reproduced exactly, because the live sitemap is what Google has indexed.
 *
 * Two things Hugo emits are deliberately absent because Hugo does not emit them either:
 * `<changefreq>` and `<priority>`. Paginated URLs are absent for the same reason.
 *
 * `<lastmod>` here keeps the colon in its offset (`-04:00`) — the raw frontmatter string,
 * verbatim. That differs from `og:updated_time` and the `article:*` timestamps, which use
 * Go's colon-less `Z0700` layout. Two formats, two call sites; see `lib/seo/format.ts`.
 */

import type { PermalinkPair } from '@/lib/schema'
import { absoluteUrl, escapeXml } from './format'

const XML_DECLARATION = '<?xml version="1.0" encoding="utf-8" standalone="yes"?>'

export interface SitemapEntry {
  /** Site-relative path for the language this urlset belongs to. */
  path: string
  /** Raw frontmatter datetime, or undefined to omit `<lastmod>`. */
  lastmod?: string
  /** Both languages' paths, emitted as `xhtml:link` alternates. */
  alternates: PermalinkPair
}

function renderUrl(entry: SitemapEntry): string {
  const lastmod = entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : ''

  // Hugo orders alternates by hreflang; matching that keeps a diff against the live file
  // free of noise.
  const alternates = (['en', 'fr'] as const)
    .map(
      (hreflang) =>
        `\n    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeXml(
          absoluteUrl(entry.alternates[hreflang]),
        )}" />`,
    )
    .join('')

  return `  <url>\n    <loc>${escapeXml(absoluteUrl(entry.path))}</loc>${lastmod}${alternates}\n  </url>`
}

export function buildUrlsetXml(entries: readonly SitemapEntry[]): string {
  const urls = [...entries]
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map(renderUrl)
    .join('\n')

  return `${XML_DECLARATION}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`
}

export interface SitemapIndexEntry {
  path: string
  lastmod?: string
}

export function buildSitemapIndexXml(entries: readonly SitemapIndexEntry[]): string {
  const sitemaps = entries
    .map((entry) => {
      const lastmod = entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : ''
      return `  <sitemap>\n    <loc>${escapeXml(absoluteUrl(entry.path))}</loc>${lastmod}\n  </sitemap>`
    })
    .join('\n')

  return `${XML_DECLARATION}
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>
`
}
