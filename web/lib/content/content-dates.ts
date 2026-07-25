/**
 * The `lastmod` cascade — what date a list page reports.
 *
 * Hugo gives a branch page the greatest date among its descendants, so the answer depends on
 * which branch is asking. `/blog/` cascades from blog posts only; `/` cascades from
 * everything, standalone pages included. Getting that scope wrong is invisible today (every
 * post is newer than every page) and would stay invisible right up until someone refreshes a
 * gallery page, at which point the homepage would quietly under-report its freshness to
 * crawlers.
 *
 * Reads only `meta.json`, never the MDX bodies, so this stays far cheaper than the full site
 * index the sitemap needs.
 */

import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import type { z } from 'zod'
import { newestDate } from '@/lib/dates'
import { BlogMetaSchema, PageMetaSchema } from '@/lib/schema'
import { parseContentFile } from './parse'

const CONTENT_DIR = path.join(process.cwd(), 'content')

/**
 * Parsed through the full schema rather than plucking `date` off an untyped object.
 *
 * A meta.json this module cannot read is a build failure, not a post silently missing from
 * the cascade — an omitted date would under-report a branch's `lastmod` to crawlers with
 * nothing on screen to show for it.
 */
async function readDate<S extends z.ZodType<{ date?: string }>>(
  metaFile: string,
  schema: S,
): Promise<string | undefined> {
  const raw: unknown = JSON.parse(await readFile(metaFile, 'utf8'))
  return parseContentFile(schema, raw, metaFile).date
}

async function blogDates(): Promise<string[]> {
  const dir = path.join(CONTENT_DIR, 'blog')
  const entries = await readdir(dir, { withFileTypes: true })

  const dates = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => readDate(path.join(dir, entry.name, 'meta.json'), BlogMetaSchema)),
  )

  return dates.filter((date): date is string => date !== undefined)
}

/** `content/pages` nests (`photos/portraits`), so recurse to any depth. */
async function pageDates(dir = path.join(CONTENT_DIR, 'pages')): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const dates: string[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const child = path.join(dir, entry.name)
    const names = await readdir(child)

    if (names.includes('meta.json')) {
      const date = await readDate(path.join(child, 'meta.json'), PageMetaSchema)
      if (date !== undefined) dates.push(date)
    }

    dates.push(...(await pageDates(child)))
  }

  return dates
}

/** Newest blog post date — what `/blog/` reports. */
export async function newestPostDate(): Promise<string | undefined> {
  return newestDate(await blogDates())
}

/** Newest date across posts and standalone pages — what `/` reports. */
export async function newestContentDate(): Promise<string | undefined> {
  const [posts, pages] = await Promise.all([blogDates(), pageDates()])
  return newestDate([...posts, ...pages])
}
