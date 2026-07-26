/**
 * A single blog post, shared by both locale trees.
 *
 * The route files are locale literals over this, matching every other page in the app — see
 * docs/routing-and-chrome.md on the shim pattern.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeading, isDarkPageHeading } from '@/components/chrome/page-heading'
import { PostBody } from '@/components/blog/PostBody'
import { PostByline } from '@/components/blog/PostByline'
import { PostNav } from '@/components/blog/PostNav'
import { PostTerms } from '@/components/blog/PostTerms'
import { ImageModalJsonLd } from '@/components/mdx'
import { BlogPostingJsonLd } from '@/components/seo/BlogPostingJsonLd'
import { ExtraMeta } from '@/components/seo/ExtraMeta'
import { getBlogPost } from '@/lib/content/blog-post'
import { getPostNeighbours } from '@/lib/content/blog-posts'
import { loadAllPostMeta } from '@/lib/content/post-meta'
import type { Locale, UrlDate } from '@/lib/permalink'
import { buildMetadata, canonicalUrl } from '@/lib/seo/metadata'

/** The dynamic segments of `/blog/:year/:month/:day/:slug/`. */
export interface BlogPostParams {
  year: string
  month: string
  day: string
  slug: string
}

/**
 * All 77 posts, for both locale trees.
 *
 * Locale-agnostic on purpose: the same post has the same Y/M/D and the same slug in both
 * languages — only its permalink prefix differs — so one function serves both shims. The
 * Y/M/D comes straight out of `meta.json`'s stored `urlDate`, never re-derived from the raw
 * date string, so there is no opportunity for a timezone round-trip to move a post to a URL
 * that has never existed.
 */
export async function generateBlogPostParams(): Promise<BlogPostParams[]> {
  const posts = await loadAllPostMeta()
  return posts
    .map(({ urlDate, slug }) => ({ ...urlDate, slug }))
    // Sorted so the enumeration is stable across builds.
    .sort((a, b) => a.slug.localeCompare(b.slug))
}

function toUrlDate(params: BlogPostParams): UrlDate {
  return { year: params.year, month: params.month, day: params.day }
}

export async function generateBlogPostMetadata(
  params: BlogPostParams,
  locale: Locale,
): Promise<Metadata> {
  const post = await getBlogPost(toUrlDate(params), params.slug, locale)
  if (!post) return {}

  return buildMetadata({
    locale,
    permalinks: post.permalink,
    title: post.frontmatter.title,
    metaTitle: post.frontmatter.meta_title,
    description: post.frontmatter.description,
    keywords: post.frontmatter.keywords,
    banner: post.banner,
    updatedAt: post.date,
    // Presence of `article` is Hugo's `$is_blog`, which drives og:type, the article:* block
    // and the large Twitter card.
    article: {
      tags: post.tags,
      categories: post.categories,
      publishedAt: post.date,
    },
  })
}

export async function BlogPostPage({
  params,
  locale,
}: {
  params: BlogPostParams
  locale: Locale
}) {
  const post = await getBlogPost(toUrlDate(params), params.slug, locale)
  if (!post) notFound()

  // Free: `listBlogPosts` underneath is cache()d on locale and the footer already called it
  // while rendering this same page.
  const neighbours = await getPostNeighbours(locale, post.slug)

  const url = canonicalUrl({ locale, permalinks: post.permalink })

  return (
    <>
      <ExtraMeta updatedAt={post.date} isArticle />
      <BlogPostingJsonLd
        locale={locale}
        url={post.permalink[locale]}
        title={post.frontmatter.title}
        description={post.frontmatter.description}
        publishedAt={post.date}
        banner={post.banner}
        authors={post.authors.map((author) => author.name)}
      />
      {/* Hugo emits the ImageObject for the first image-modal on the page, once. The walk
          happens during the build render, in the loader — see lib/content/mdx-runtime.ts. */}
      {post.firstImage && <ImageModalJsonLd image={post.firstImage} pageUrl={url} />}

      <PageHeading title={post.frontmatter.title} dark={isDarkPageHeading('blog')} />
      <main className="container py-12">
        <PostByline authors={post.authors} displayDate={post.displayDate} locale={locale} />
        <PostBody>{post.body}</PostBody>
        <PostTerms
          categories={post.categoryLinks}
          tags={post.tagLinks}
          locale={locale}
        />
        <PostNav newer={neighbours.newer} older={neighbours.older} locale={locale} />
      </main>
    </>
  )
}
