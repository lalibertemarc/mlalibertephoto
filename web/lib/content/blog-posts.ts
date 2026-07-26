/**
 * Blog posts as a list, newest first.
 *
 * Deliberately narrow: this reads what the chrome and the index need — title, href, banner,
 * date, and the post's categories. Summaries, full tag lists and the post body stay out.
 *
 * Runs at build time only. `output: 'export'` has no runtime server, so these `fs` reads
 * happen during `next build` and their results are baked into the exported HTML.
 */

import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { cache } from 'react'
import { parse as parseYaml } from 'yaml'
import { formatPostDate } from '@/lib/dates'
import type { Locale } from '@/lib/permalink'
import { BlogMetaSchema, MdxFrontmatterSchema } from '@/lib/schema'
import { splitMdxFrontmatter } from './mdx'
import { displayPath, parseContentFile } from './parse'
import { termLinks, type TermLink } from './post-terms'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

/** Hugo's footer falls back to this when a post has no banner (footer.html:28). */
const PLACEHOLDER_IMAGE = '/img/placeholder.png'

export interface BlogPostSummary {
  /** Joins against `TermEntry.members` so a term page can list its posts. */
  slug: string
  href: string
  title: string
  imageSrc: string
  /**
   * Display-ready, already localised — see `lib/dates.ts#formatPostDate`. Formatted here,
   * once, from the same literal Y/M/D that `permalink.ts` builds the URL from, so a card's
   * date and its link can never disagree about which day the post is.
   */
  date: string
  /**
   * The post's categories, resolved to links. Tags are deliberately absent: a card carries one
   * line of metadata, and 3–6 tag pills per row across ten rows reads as noise. The full set is
   * on the post page.
   *
   * Resolved here rather than in `PostList` because this module already knows the locale and
   * already builds `href` from it; threading a locale prop through the component instead would
   * give the card two independent notions of which language it is in.
   */
  categoryLinks: TermLink[]
  /**
   * Hugo's `.Summary`. Ported as a field but never populated: `hide_summary` is `true` in
   * both `fr.params.recent_posts` and `en.params.recent_posts`, so nothing has rendered it
   * in production. Building an MDX-body summariser for a value no page displays would be
   * speculative — the field exists so that reviving it is a one-line change here rather than
   * a reshaping of this type. See `HIDE_SUMMARY` in components/home/recent-posts-section.tsx.
   */
  summary?: string
}

/**
 * The post title lives in the MDX frontmatter rather than meta.json, because it differs per
 * language while meta.json is shared across both. See docs/content-migration.md.
 */
async function readTitle(dir: string, locale: Locale): Promise<string> {
  const file = path.join(dir, `${locale}.mdx`)
  const source = await readFile(file, 'utf8')
  const parts = splitMdxFrontmatter(source)
  if (!parts) throw new Error(`No frontmatter in ${displayPath(file)}`)

  return parseContentFile(MdxFrontmatterSchema, parseYaml(parts.frontmatter), file).title
}

/**
 * Every post for a locale, newest first.
 *
 * Cached on `locale` alone, deliberately excluding any limit: three call sites want different
 * counts of the same list in a single render — the footer's three, the homepage's four, and
 * the blog index's all — and without this each one sweeps all 77 post directories again.
 * Slicing happens in `listBlogPosts`, outside the cache, so the three share one read.
 */
const readAllPosts = cache(async (locale: Locale): Promise<BlogPostSummary[]> => {
  const entries = await readdir(BLOG_DIR, { withFileTypes: true })

  const posts = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const dir = path.join(BLOG_DIR, entry.name)
        const metaFile = path.join(dir, 'meta.json')
        const meta = parseContentFile(
          BlogMetaSchema,
          JSON.parse(await readFile(metaFile, 'utf8')) as unknown,
          metaFile,
        )

        return {
          slug: meta.slug,
          href: meta.permalink[locale],
          title: await readTitle(dir, locale),
          imageSrc: meta.banner?.src ?? PLACEHOLDER_IMAGE,
          date: formatPostDate(meta.date, locale),
          categoryLinks: termLinks('categories', meta.categories, locale),
          // Ordering only. Parsing to an instant is right here and would be a bug in
          // lib/permalink.ts: frontmatter dates carry -04:00 / -05:00 offsets, so a lexical
          // sort misorders posts either side of a DST change, while a Date round-trip can
          // shift the calendar day a URL is built from. Ordering wants the instant; URLs
          // want the literal prefix. Different questions.
          sortKey: Date.parse(meta.date),
        }
      }),
  )

  return posts
    .sort((a, b) => b.sortKey - a.sortKey)
    .map(({ slug, href, title, imageSrc, date, categoryLinks }) => ({
      slug,
      href,
      title,
      imageSrc,
      date,
      categoryLinks,
    }))
})

/** A post's chronological neighbours. Either side is absent at the ends of the archive. */
export interface PostNeighbours {
  /** The post published after this one. Absent on the newest post. */
  newer: BlogPostSummary | undefined
  /** The post published before this one. Absent on the oldest post. */
  older: BlogPostSummary | undefined
}

/**
 * The posts either side of `slug` in publication order.
 *
 * An index lookup, not a read. `readAllPosts` is `cache()`d on `locale` and the footer's
 * recent-posts block already calls it on every route, so by the time a post page asks for its
 * neighbours the list is in memory and this costs a `findIndex`.
 *
 * The order is `readAllPosts`' own, deliberately not recomputed here. That sort runs on
 * `Date.parse(meta.date)` — the parsed instant — because frontmatter dates carry -04:00/-05:00
 * offsets and a lexical sort on the raw string misorders posts either side of a DST change.
 * Re-deriving the order at the call site is exactly how the two would drift.
 *
 * Newest-first, so the *newer* neighbour is the preceding index.
 */
export async function getPostNeighbours(
  locale: Locale,
  slug: string,
): Promise<PostNeighbours> {
  const all = await readAllPosts(locale)
  const index = all.findIndex((post) => post.slug === slug)

  // Only reachable if a post page renders a slug no meta.json carries, which the route's own
  // `generateStaticParams` rules out. Degrade to no navigation rather than throwing.
  if (index === -1) return { newer: undefined, older: undefined }

  return { newer: all[index - 1], older: all[index + 1] }
}

/** All posts, newest first. `limit` trims the result; omit it for the whole list. */
export async function listBlogPosts(locale: Locale, limit?: number): Promise<BlogPostSummary[]> {
  const all = await readAllPosts(locale)
  return limit === undefined ? all : all.slice(0, limit)
}
