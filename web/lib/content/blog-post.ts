/**
 * One blog post, fully loaded — metadata, this locale's frontmatter, and the compiled body.
 *
 * The fourth content reader, and the narrowest in a different direction from the other three:
 * `blog-posts.ts` is all-posts/one-locale/no-body (chrome), `site-index.ts` is
 * all-posts/both-locales/body-as-plain-text (feeds), `content-dates.ts` is dates only. This is
 * one-post/one-locale/body-as-JSX.
 *
 * It is a separate module rather than an extension of either neighbour, because the costs do
 * not compose. `listBlogPosts` runs on essentially every route — the footer's recent-posts
 * block calls it — so compiling bodies there would fire up to 77 `evaluate()` calls per page
 * rendered. And `site-index.ts` exists precisely to *avoid* compiling MDX (see the long note
 * on `summarize()`), since its two consumers serialise XML and never render an element.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { cache } from 'react'
import type { ReactNode } from 'react'
import { parse as parseYaml } from 'yaml'
import type { ImageModalProps } from '@/components/mdx'
import { formatPostDate } from '@/lib/dates'
import {
  blogFolderName,
  slugifyTerm,
  taxonomyPermalink,
  type Locale,
  type UrlDate,
} from '@/lib/permalink'
import {
  BlogMetaSchema,
  MdxFrontmatterSchema,
  type Banner,
  type MdxFrontmatter,
  type PermalinkPair,
} from '@/lib/schema'
import { splitMdxFrontmatter } from './mdx'
import { compileMdxBody } from './mdx-runtime'
import { parseContentFile } from './parse'
import { termLinks, type TermLink } from './post-terms'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

export interface BylineAuthor {
  name: string
  href: string
}

export interface BlogPost {
  slug: string
  urlDate: UrlDate
  permalink: PermalinkPair
  /** Raw frontmatter datetime, offset intact — for the SEO layer and the JSON-LD. */
  date: string
  /** Display-ready and localised, e.g. "29 octobre, 2025". */
  displayDate: string
  /** Raw, as written in frontmatter. The SEO layer's `article:tag` wants these, not labels. */
  tags: string[]
  /** Raw, as written in frontmatter — `article:section`. */
  categories: string[]
  /** The same two arrays resolved for display. Kept alongside rather than replacing the raw
   *  strings, because the head and the body want different forms of the same value. */
  tagLinks: TermLink[]
  categoryLinks: TermLink[]
  authors: BylineAuthor[]
  banner?: Banner
  /** This locale only. `meta.json` holds everything the two languages share. */
  frontmatter: MdxFrontmatter
  body: ReactNode
  firstImage: ImageModalProps | null
}

/**
 * Cached on the two primitive strings that identify a post, never on the `UrlDate` object.
 *
 * React's `cache()` compares arguments by identity for non-primitives, so passing `urlDate`
 * through would miss every time: `generateMetadata` and the page component each destructure
 * their own params and would build two structurally-identical but distinct objects. Resolving
 * to the folder name first makes the key a string, matching how `blog-posts.ts` keys on a bare
 * `locale`.
 */
const loadPost = cache(async (folder: string, locale: Locale): Promise<BlogPost | null> => {
  const dir = path.join(BLOG_DIR, folder)
  const metaFile = path.join(dir, 'meta.json')

  let rawMeta: string
  try {
    rawMeta = await readFile(metaFile, 'utf8')
  } catch {
    // The folder does not exist. A genuine 404 — the only `null` this module returns.
    return null
  }

  const meta = parseContentFile(BlogMetaSchema, JSON.parse(rawMeta) as unknown, metaFile)

  const mdxFile = path.join(dir, `${locale}.mdx`)
  const source = await readFile(mdxFile, 'utf8')
  const parts = splitMdxFrontmatter(source)
  if (!parts) throw new Error(`No frontmatter in ${folder}/${locale}.mdx`)

  const frontmatter = parseContentFile(
    MdxFrontmatterSchema,
    parseYaml(parts.frontmatter),
    mdxFile,
  )

  // An MDX failure names the file. The compile gate in the migration only proves a body
  // *parses*; it never executes one, so "Expected component X to be defined" can only ever
  // surface here — and a bare MDX stack trace does not say which of 154 files threw.
  let compiled
  try {
    compiled = await compileMdxBody(parts.body)
  } catch (cause) {
    throw new Error(`Failed to render ${folder}/${locale}.mdx`, { cause })
  }

  return {
    slug: meta.slug,
    urlDate: meta.urlDate,
    permalink: meta.permalink,
    date: meta.date,
    displayDate: formatPostDate(meta.date, locale),
    tags: meta.tags,
    categories: meta.categories,
    tagLinks: termLinks('tags', meta.tags, locale),
    categoryLinks: termLinks('categories', meta.categories, locale),
    authors: meta.authors.map((name) => ({
      name,
      // Hugo writes this href without a trailing slash (`/authors/marc-lalibert%C3%A9`) while
      // the page it points at has one, so every byline link currently takes a redirect hop.
      // Routing through `taxonomyPermalink` fixes that and keeps one function responsible for
      // the shape of a term URL.
      href: taxonomyPermalink('authors', slugifyTerm(name), locale),
    })),
    banner: meta.banner,
    frontmatter,
    body: compiled.tree,
    firstImage: compiled.firstImage,
  }
})

/** `null` only when no such post folder exists. A malformed post throws. */
export function getBlogPost(
  urlDate: UrlDate,
  slug: string,
  locale: Locale,
): Promise<BlogPost | null> {
  return loadPost(blogFolderName(urlDate, slug), locale)
}
