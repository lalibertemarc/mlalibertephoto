/**
 * One standalone page, fully loaded — metadata, this locale's frontmatter, and the compiled
 * body.
 *
 * The fifth content reader, and the sibling of `blog-post.ts`: one-page/one-locale/body-as-JSX.
 * It is a separate module for the same reason that one is, restated for pages — `site-index.ts`
 * already reads all eight pages in both locales, but it exists precisely to *avoid* compiling
 * MDX (its consumers serialise XML), and it reads the blog corpus alongside. Routing a single
 * page render through it would compile nothing it needs and read 77 posts it does not.
 *
 * Deliberately not merged with `blog-post.ts` either. The two share four lines of file I/O and
 * disagree on everything else: a post is addressed by date-and-slug and carries tags,
 * categories, authors and a banner; a page is addressed by its path and carries a page class
 * and a noindex flag. Unifying them would mean a return type where half the fields are absent
 * depending on which caller asked.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { cache } from 'react'
import type { ReactNode } from 'react'
import { parse as parseYaml } from 'yaml'
import type { ImageModalProps } from '@/components/mdx'
import { formatPostDate } from '@/lib/dates'
import type { Locale } from '@/lib/permalink'
import {
  PageMetaSchema,
  MdxFrontmatterSchema,
  type MdxFrontmatter,
  type PermalinkPair,
} from '@/lib/schema'
import { splitMdxFrontmatter } from './mdx'
import { compileMdxBody } from './mdx-runtime'
import { parseContentFile } from './parse'

const PAGES_DIR = path.join(process.cwd(), 'content', 'pages')

export interface ContentPage {
  /** Source-relative path without extension, e.g. "photos/portraits". Mirrors the URL. */
  path: string
  permalink: PermalinkPair
  /**
   * Hugo's `page_class` front matter. Five of the eight pages set `dark-gallery`; it drives
   * the heading skin through `isDarkPageHeading`.
   */
  pageClass?: string
  noindex: boolean
  /**
   * Raw frontmatter datetime, offset intact. Only `/photos/` carries one, and it exists only
   * because `single.html:44` gates its byline block on `.Params.date` — see `displayDate`.
   */
  date?: string
  /** Display-ready and localised, e.g. "4 avril, 2025". Present exactly when `date` is. */
  displayDate?: string
  /** This locale only. `meta.json` holds everything the two languages share. */
  frontmatter: MdxFrontmatter
  body: ReactNode
  firstImage: ImageModalProps | null
}

/**
 * Cached on the two primitive strings that identify a page.
 *
 * Same reasoning as `blog-post.ts`: React's `cache()` compares arguments by identity for
 * non-primitives, and `generateMetadata` and the page component are separate calls. Here both
 * arguments are already strings, so there is nothing to flatten first — but the constraint is
 * why the signature takes a path rather than the `PageMeta` object it will go on to read.
 */
const loadPage = cache(async (pagePath: string, locale: Locale): Promise<ContentPage | null> => {
  const dir = path.join(PAGES_DIR, pagePath)
  const metaFile = path.join(dir, 'meta.json')

  let rawMeta: string
  try {
    rawMeta = await readFile(metaFile, 'utf8')
  } catch {
    // The folder does not exist. A genuine 404 — the only `null` this module returns.
    return null
  }

  const meta = parseContentFile(PageMetaSchema, JSON.parse(rawMeta) as unknown, metaFile)

  const mdxFile = path.join(dir, `${locale}.mdx`)
  const source = await readFile(mdxFile, 'utf8')
  const parts = splitMdxFrontmatter(source)
  if (!parts) throw new Error(`No frontmatter in pages/${pagePath}/${locale}.mdx`)

  const frontmatter = parseContentFile(
    MdxFrontmatterSchema,
    parseYaml(parts.frontmatter),
    mdxFile,
  )

  // An MDX failure names the file, exactly as `blog-post.ts` does. The migration's compile
  // gate only proves a body *parses*; it never executes one, so "Expected component X to be
  // defined" can surface for the first time here, and a bare MDX stack trace does not say
  // which file threw.
  let compiled
  try {
    compiled = await compileMdxBody(parts.body)
  } catch (cause) {
    throw new Error(`Failed to render pages/${pagePath}/${locale}.mdx`, { cause })
  }

  return {
    path: meta.path,
    permalink: meta.permalink,
    pageClass: meta.pageClass,
    noindex: meta.noindex ?? false,
    date: meta.date,
    displayDate: meta.date ? formatPostDate(meta.date, locale) : undefined,
    frontmatter,
    body: compiled.tree,
    firstImage: compiled.firstImage,
  }
})

/** `null` only when no such page folder exists. A malformed page throws. */
export function getContentPage(pagePath: string, locale: Locale): Promise<ContentPage | null> {
  return loadPage(pagePath, locale)
}
