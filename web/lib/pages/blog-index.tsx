/**
 * The blog index, shared by both locale trees, at `/blog/` and `/blog/page/N/`.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Pager } from '@/components/blog/Pager'
import { PostList } from '@/components/blog/PostList'
import { PageHeading, isDarkPageHeading } from '@/components/chrome/page-heading'
import { ExtraMeta } from '@/components/seo/ExtraMeta'
import { listBlogPosts } from '@/lib/content/blog-posts'
import { newestPostDate } from '@/lib/content/content-dates'
import { PAGER_SIZE, pageHref, pagerLinks, paginate, totalPages } from '@/lib/pagination'
import { localeHref, type Locale } from '@/lib/permalink'
import { buildMetadata } from '@/lib/seo/metadata'

/**
 * "Blog" is the section title in both languages — it is the menu label in each
 * `[[*.menu.main]]` block and Hugo derives the list heading from the section name.
 */
const BLOG_TITLE = 'Blog'

const BASE: Record<Locale, string> = {
  fr: localeHref('/blog/', 'fr'),
  en: localeHref('/blog/', 'en'),
}

/** Pages 2..N. Page 1 is `/blog/`, served by its own route. */
export async function generateBlogIndexParams(): Promise<{ page: string }[]> {
  const posts = await listBlogPosts('fr')
  const pages = totalPages(posts.length, PAGER_SIZE)

  return Array.from({ length: Math.max(0, pages - 1) }, (_, index) => ({
    page: String(index + 2),
  }))
}

/**
 * Canonical points at *this* page, not at page 1.
 *
 * Hugo collapses every paginated page's canonical onto the section URL — `/blog/page/2/`
 * emits `canonical=/blog/`. That tells Google two pages listing entirely different posts are
 * duplicates of one another. A deliberate deviation; see docs/seo-contract.md.
 */
export function blogIndexMetadata(locale: Locale, page: string | number = 1): Metadata {
  const current = Number(page)
  return buildMetadata({
    locale,
    permalinks: {
      fr: pageHref(BASE.fr, current),
      en: pageHref(BASE.en, current),
    },
    title: BLOG_TITLE,
  })
}

export async function BlogIndexPage({
  locale,
  page = 1,
}: {
  locale: Locale
  /** A route param arrives as a string; page 1's route passes nothing. */
  page?: string | number
}) {
  const current = Number(page)
  const [posts, updatedAt] = await Promise.all([listBlogPosts(locale), newestPostDate()])

  const pages = totalPages(posts.length, PAGER_SIZE)
  if (!Number.isInteger(current) || current < 1 || current > pages) notFound()

  const slice = paginate(posts, current, PAGER_SIZE)

  return (
    <>
      <ExtraMeta updatedAt={updatedAt} />
      <PageHeading title={BLOG_TITLE} dark={isDarkPageHeading('blog')} />
      <main className="container py-12">
        <PostList posts={slice.items} locale={locale} />
        <Pager links={pagerLinks(BASE[locale], slice.page, slice.totalPages)} locale={locale} />
      </main>
    </>
  )
}
