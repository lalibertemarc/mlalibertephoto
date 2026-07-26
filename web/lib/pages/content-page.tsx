/**
 * A standalone (non-blog) page, shared by both locale trees.
 *
 * The eight pages under `content/pages/` — contact, photos and its four galleries,
 * smsPrices, videos. Their route files are locale-and-path literals over this,
 * matching every other page in the app; see docs/routing-and-chrome.md on the shim pattern.
 *
 * There is no `generateStaticParams` here and no dynamic segment. Nine pages with fixed,
 * indexed URLs are nine files, and a literal route cannot disagree with `meta.json` about
 * where a page lives — whereas a catch-all would have to be trusted not to swallow `/blog/`,
 * `/tags/` and the other static segments it shares a level with.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeading } from '@/components/chrome/page-heading'
import { PageBody } from '@/components/pages/PageBody'
import { PageByline } from '@/components/pages/PageByline'
import { ImageModalJsonLd } from '@/components/mdx'
import { ExtraMeta } from '@/components/seo/ExtraMeta'
import { getContentPage } from '@/lib/content/page'
import type { Locale } from '@/lib/permalink'
import { buildMetadata, canonicalUrl } from '@/lib/seo/metadata'

/**
 * Every page path that has a route, as a union.
 *
 * Typed rather than a bare string so a shim cannot name a folder that does not exist — the
 * reader returns `null` for a missing folder and the page would 404 at build time with nothing
 * pointing at the typo. Mirrors `content/pages/`; `smsPrices` keeps its camelCase folder name
 * while its URL is `/smsprices/` (see `pagePermalink`, which lowercases).
 */
export type ContentPagePath =
  | 'contact'
  | 'photos'
  | 'photos/portraits'
  | 'photos/events'
  | 'photos/behind-the-scenes'
  | 'photos/wildlife'
  | 'smsPrices'
  | 'videos'

export async function contentPageMetadata(
  pagePath: ContentPagePath,
  locale: Locale,
): Promise<Metadata> {
  const page = await getContentPage(pagePath, locale)
  if (!page) return {}

  return buildMetadata({
    locale,
    permalinks: page.permalink,
    title: page.frontmatter.title,
    metaTitle: page.frontmatter.meta_title,
    description: page.frontmatter.description,
    keywords: page.frontmatter.keywords,
    // smsPrices is the only page that sets it. Hugo emits `noindex,nofollow` plus the four
    // googlebot flags; `buildMetadata` already owns both strings.
    noindex: page.noindex,
    // No `article` key: `$is_blog` is `and (eq .Type "blog") (eq .Kind "page")`, which no
    // standalone page satisfies. That single omission drops og:type to `website`, drops the
    // whole `article:*` block, and takes the Twitter card down to `summary`.
    updatedAt: page.date,
  })
}

export async function ContentPage({
  pagePath,
  locale,
}: {
  pagePath: ContentPagePath
  locale: Locale
}) {
  const page = await getContentPage(pagePath, locale)
  if (!page) notFound()

  const url = canonicalUrl({ locale, permalinks: page.permalink })

  return (
    <>
      {/* `og:updated_time` is `with .Lastmod`, and `.Lastmod` falls back to `.Date`. Eight of
          the nine pages carry no date at all, so `with` is falsy and Hugo emits no tag —
          `updatedAt` being undefined reproduces that. `/photos/` is the exception. */}
      <ExtraMeta updatedAt={page.date} />

      {/* Hugo emits the ImageObject for the first image-modal on the page, once, on any page
          kind — the Scratch guard in image-modal.html is not blog-specific. Three pages
          (contact, photos, videos) contain no ImageModal and get nothing. */}
      {page.firstImage && <ImageModalJsonLd image={page.firstImage} pageUrl={url} />}

      {/* Always dark, rather than `isDarkPageHeading('page', page.pageClass)`.
          That helper reproduces Hugo's condition faithfully and would hand contact, photos and
          smsPrices the light textured band — which is right in Hugo, where those pages are
          white, and wrong here, where the body underneath them is #1a1212. The one-skin
          decision in page.module.css covers the band too. */}
      <PageHeading title={page.frontmatter.title} dark />
      <main className="container py-12">
        {/* Only `/photos/` reaches this — see PageByline. */}
        {page.displayDate && <PageByline displayDate={page.displayDate} />}
        <PageBody>{page.body}</PageBody>
      </main>
    </>
  )
}
