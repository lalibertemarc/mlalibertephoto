/**
 * A taxonomy term page — `/tags/bnw/`, `/categories/wildlife/`, `/authors/marc-laliberté/`
 * and their paginated continuations, in both locales.
 *
 * Hugo serves all three taxonomies, both list and term kinds, through the same
 * `_default/list.html` it uses for the blog index, so a term page really is a filtered blog
 * index. That is reproduced here: same rows, same pager, same heading band.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Pager } from '@/components/blog/Pager'
import { PostList } from '@/components/blog/PostList'
import { PageHeading, isDarkPageHeading } from '@/components/chrome/page-heading'
import { ExtraMeta } from '@/components/seo/ExtraMeta'
import { listBlogPosts, type BlogPostSummary } from '@/lib/content/blog-posts'
import { getTerm, getTermsByTaxonomy } from '@/lib/content/terms'
import { newestDate } from '@/lib/dates'
import { PAGER_SIZE, pageHref, pagerLinks, paginate, totalPages } from '@/lib/pagination'
import { taxonomyPermalink, titleCaseTerm, type Locale, type TaxonomyKind } from '@/lib/permalink'
import { buildMetadata } from '@/lib/seo/metadata'

/**
 * One catch-all segment carries both the term and its page number.
 *
 * A term slug can itself contain a slash — `LR/Mogrify 2` serves from `/tags/lr/mogrify-2/` —
 * so the segment count is variable and a fixed `[slug]` cannot express it. Folding pagination
 * into the same catch-all rather than nesting a literal `page/[page]` folder underneath keeps
 * one leaf route per taxonomy, which is also the only shape whose `generateStaticParams` can
 * enumerate every URL without two routes having to agree on who owns what.
 *
 * `lib/content/terms.ts` asserts at build time that no term slug ends in `page/<n>`, which is
 * the one input that would make this parse ambiguous.
 */
export interface TermParams {
  slug: string[]
}

interface ParsedTerm {
  termSlug: string
  page: number
}

/**
 * Segments arrive percent-encoded and must be decoded before matching a term.
 *
 * `generateStaticParams` returns the decoded slug (`marc-laliberté`) and the export writes a
 * directory with those literal bytes, but the params handed back to the page carry the
 * encoded form (`marc-lalibert%C3%A9`). Without decoding, every accented term — the author,
 * `île-dorléans`, `marc-laliberté` — silently misses its lookup and renders a 404 into a
 * file at the correct URL, which is close to the worst possible failure shape: the build
 * succeeds, the page exists, and only its contents are wrong.
 *
 * The slug is re-normalised to NFC to match `slugifyTerm`, since a decode can yield either
 * composition and the two are indistinguishable by eye.
 */
function parseTermParam(slug: string[]): ParsedTerm {
  const decoded = slug.map((segment) => decodeURIComponent(segment).normalize('NFC'))

  const tail = decoded.slice(-2)
  if (tail.length === 2 && tail[0] === 'page' && /^\d+$/.test(tail[1] ?? '')) {
    return { termSlug: decoded.slice(0, -2).join('/'), page: Number(tail[1]) }
  }
  return { termSlug: decoded.join('/'), page: 1 }
}

/** Every term, plus a params entry per extra page. Locale-agnostic — terms are shared. */
export async function generateTermParams(taxonomy: TaxonomyKind): Promise<TermParams[]> {
  const terms = await getTermsByTaxonomy(taxonomy)
  const params: TermParams[] = []

  for (const term of terms) {
    const segments = term.slug.split('/')
    params.push({ slug: segments })

    const pages = totalPages(term.members.length, PAGER_SIZE)
    for (let page = 2; page <= pages; page += 1) {
      params.push({ slug: [...segments, 'page', String(page)] })
    }
  }

  return params
}

export async function generateTermMetadata(
  taxonomy: TaxonomyKind,
  params: TermParams,
  locale: Locale,
): Promise<Metadata> {
  const { termSlug, page } = parseTermParam(params.slug)
  const term = await getTerm(taxonomy, termSlug)
  if (!term) return {}

  return buildMetadata({
    locale,
    // Self-referencing on paginated pages, unlike Hugo. See blog-index.tsx and
    // docs/seo-contract.md.
    permalinks: {
      fr: pageHref(taxonomyPermalink(taxonomy, term.slug, 'fr'), page),
      en: pageHref(taxonomyPermalink(taxonomy, term.slug, 'en'), page),
    },
    title: titleCaseTerm(term.term),
  })
}

export async function TermPage({
  taxonomy,
  params,
  locale,
}: {
  taxonomy: TaxonomyKind
  params: TermParams
  locale: Locale
}) {
  const { termSlug, page } = parseTermParam(params.slug)
  const term = await getTerm(taxonomy, termSlug)
  if (!term) notFound()

  const all = await listBlogPosts(locale)
  const bySlug = new Map<string, BlogPostSummary>(all.map((post) => [post.slug, post]))

  // Mapped over `term.members`, not filtered out of `all`. Both are newest-first, but
  // `members` is the authoritative order (sorted once in deriveTerms, from the parsed
  // instant); deriving it a second way invites the two to disagree.
  const posts = term.members
    .map((member) => bySlug.get(member.slug))
    .filter((post): post is BlogPostSummary => post !== undefined)

  const pages = totalPages(posts.length, PAGER_SIZE)
  if (page < 1 || page > pages) notFound()

  const slice = paginate(posts, page, PAGER_SIZE)
  const base = taxonomyPermalink(taxonomy, term.slug, locale)

  return (
    <>
      <ExtraMeta updatedAt={newestDate(term.memberDates)} />
      {/* Hugo title-cases the term for its heading — "wildlife" heads its page as
          "Wildlife". See titleCaseTerm. */}
      <PageHeading title={titleCaseTerm(term.term)} dark={isDarkPageHeading('blog')} />
      <main className="container py-12">
        <PostList posts={slice.items} />
        <Pager links={pagerLinks(base, slice.page, slice.totalPages)} locale={locale} />
      </main>
    </>
  )
}
