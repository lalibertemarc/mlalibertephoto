/**
 * Every post's `meta.json`, and nothing else.
 *
 * Two callers: the taxonomy routes need post membership to group terms, and the blog-post
 * route needs every post's Y/M/D and slug to enumerate its static params. Both are exactly
 * what `meta.json` carries. `loadSiteIndex()` would answer the same question, but it reads
 * both locales' MDX and summarises every body on the way — necessary for RSS, pure waste for
 * enumerating params or listing posts that show no summary.
 *
 * Memoized at module scope rather than with React's `cache()`. `cache()` is render-scoped,
 * and these run inside `generateStaticParams` and `generateMetadata` across hundreds of
 * independent page generations during one `next build`; a module-level promise is guaranteed
 * to persist for the life of that process, which is the reuse this actually wants.
 */

import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { BlogMetaSchema } from '@/lib/schema'
import type { PostMetaLike } from './site-index'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

let cached: Promise<PostMetaLike[]> | null = null

async function read(): Promise<PostMetaLike[]> {
  const entries = await readdir(BLOG_DIR, { withFileTypes: true })

  return Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry): Promise<PostMetaLike> => {
        const raw: unknown = JSON.parse(
          await readFile(path.join(BLOG_DIR, entry.name, 'meta.json'), 'utf8'),
        )
        const meta = BlogMetaSchema.parse(raw)
        return {
          slug: meta.slug,
          urlDate: meta.urlDate,
          date: meta.date,
          permalink: meta.permalink,
          tags: meta.tags,
          categories: meta.categories,
          authors: meta.authors,
        }
      }),
  )
}

export function loadAllPostMeta(): Promise<PostMetaLike[]> {
  cached ??= read()
  return cached
}
