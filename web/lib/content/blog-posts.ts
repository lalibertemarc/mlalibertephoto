/**
 * Blog posts as a list, newest first.
 *
 * Deliberately narrow: this reads the three fields the chrome and the index need — title,
 * href, banner. Summaries, tags, pagination and the post body are item #7's content layer.
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
import { splitMdxFrontmatter } from './mdx'

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
async function readTitle(dir: string, locale: Locale): Promise<string | null> {
  const source = await readFile(path.join(dir, `${locale}.mdx`), 'utf8')
  const parts = splitMdxFrontmatter(source)
  if (!parts) return null
  const data: unknown = parseYaml(parts.frontmatter)
  if (typeof data !== 'object' || data === null) return null
  const { title } = data as { title?: unknown }
  return typeof title === 'string' ? title : null
}

interface BlogMetaShape {
  slug?: unknown
  date?: unknown
  permalink?: { fr?: unknown; en?: unknown }
  banner?: { src?: unknown }
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
        const meta = JSON.parse(await readFile(path.join(dir, 'meta.json'), 'utf8')) as BlogMetaShape

        const href = meta.permalink?.[locale]
        const rawDate = meta.date
        const slug = meta.slug
        if (typeof href !== 'string' || typeof rawDate !== 'string' || typeof slug !== 'string') {
          return null
        }

        const title = await readTitle(dir, locale)
        if (title === null) return null

        const bannerSrc = meta.banner?.src
        return {
          slug,
          href,
          title,
          imageSrc: typeof bannerSrc === 'string' ? bannerSrc : PLACEHOLDER_IMAGE,
          date: formatPostDate(rawDate, locale),
          // Ordering only. Parsing to an instant is right here and would be a bug in
          // lib/permalink.ts: frontmatter dates carry -04:00 / -05:00 offsets, so a lexical
          // sort misorders posts either side of a DST change, while a Date round-trip can
          // shift the calendar day a URL is built from. Ordering wants the instant; URLs
          // want the literal prefix. Different questions.
          sortKey: Date.parse(rawDate),
        }
      }),
  )

  return posts
    .filter((post): post is NonNullable<typeof post> => post !== null)
    .sort((a, b) => b.sortKey - a.sortKey)
    .map(({ slug, href, title, imageSrc, date }) => ({ slug, href, title, imageSrc, date }))
})

/** All posts, newest first. `limit` trims the result; omit it for the whole list. */
export async function listBlogPosts(locale: Locale, limit?: number): Promise<BlogPostSummary[]> {
  const all = await readAllPosts(locale)
  return limit === undefined ? all : all.slice(0, limit)
}
