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
import { parse as parseYaml } from 'yaml'
import type { Locale } from '@/lib/permalink'
import { splitMdxFrontmatter } from './mdx'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

/** Hugo's footer falls back to this when a post has no banner (footer.html:28). */
const PLACEHOLDER_IMAGE = '/img/placeholder.png'

export interface BlogPostSummary {
  href: string
  title: string
  imageSrc: string
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
  date?: unknown
  permalink?: { fr?: unknown; en?: unknown }
  banner?: { src?: unknown }
}

/** All posts, newest first. `limit` trims the result; omit it for the whole list. */
export async function listBlogPosts(locale: Locale, limit?: number): Promise<BlogPostSummary[]> {
  const entries = await readdir(BLOG_DIR, { withFileTypes: true })

  const posts = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const dir = path.join(BLOG_DIR, entry.name)
        const meta = JSON.parse(await readFile(path.join(dir, 'meta.json'), 'utf8')) as BlogMetaShape

        const href = meta.permalink?.[locale]
        const rawDate = meta.date
        if (typeof href !== 'string' || typeof rawDate !== 'string') return null

        const title = await readTitle(dir, locale)
        if (title === null) return null

        const bannerSrc = meta.banner?.src
        return {
          href,
          title,
          imageSrc: typeof bannerSrc === 'string' ? bannerSrc : PLACEHOLDER_IMAGE,
          // Ordering only. Parsing to an instant is right here and would be a bug in
          // lib/permalink.ts: frontmatter dates carry -04:00 / -05:00 offsets, so a lexical
          // sort misorders posts either side of a DST change, while a Date round-trip can
          // shift the calendar day a URL is built from. Ordering wants the instant; URLs
          // want the literal prefix. Different questions.
          sortKey: Date.parse(rawDate),
        }
      }),
  )

  const sorted = posts
    .filter((post): post is NonNullable<typeof post> => post !== null)
    .sort((a, b) => b.sortKey - a.sortKey)
    .map(({ href, title, imageSrc }) => ({ href, title, imageSrc }))

  return limit === undefined ? sorted : sorted.slice(0, limit)
}
