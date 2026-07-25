/**
 * Every URL the site publishes, with the per-language text the feeds need.
 *
 * The sitemap and the RSS feeds both need the whole corpus at once — posts, standalone
 * pages, and the taxonomy terms derived from post membership — which is a different shape
 * from what any single page renders. `lib/content/blog-posts.ts` stays deliberately narrow
 * (title, href, banner, for the chrome); this is the wide read, and it runs once per build
 * inside `scripts/build-seo-files.ts`.
 *
 * Taxonomy is derived rather than stored. Nothing under `web/content/` represents a tag or
 * a category — they exist only as arrays on each post's `meta.json`, one array shared by
 * both languages. Grouping posts by term reconstructs exactly the set of term pages Hugo
 * generates.
 */

import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'
import type { z } from 'zod'
import {
  blogPermalink,
  pagePermalink,
  slugifyTerm,
  taxonomyPermalink,
  TAXONOMY_KINDS,
  urlDateFromRawDate,
  type Locale,
  type TaxonomyKind,
} from '@/lib/permalink'
import {
  BlogMetaSchema,
  MdxFrontmatterSchema,
  PageMetaSchema,
  type Banner,
  type BlogMeta,
  type MdxFrontmatter,
  type PageMeta,
  type PermalinkPair,
  type UrlDate,
} from '@/lib/schema'
import { splitMdxFrontmatter } from './mdx'
import { parseContentFile } from './parse'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const LOCALES: readonly Locale[] = ['fr', 'en']

/** A value that differs per language. */
export type Localized<T> = Record<Locale, T>

export interface BlogEntry {
  kind: 'blog'
  slug: string
  urlDate: UrlDate
  permalink: PermalinkPair
  date: string
  tags: string[]
  categories: string[]
  authors: string[]
  banner?: Banner
  frontmatter: Localized<MdxFrontmatter>
  summary: Localized<string>
}

export interface PageEntry {
  kind: 'page'
  path: string
  permalink: PermalinkPair
  noindex: boolean
  date?: string
  frontmatter: Localized<MdxFrontmatter>
  summary: Localized<string>
}

/** One post's membership in a term, for the term page's listing. */
export interface TermMember {
  /** Joins against `BlogPostSummary.slug` in `blog-posts.ts`. */
  slug: string
  permalink: PermalinkPair
  /** Raw frontmatter date, literal — never reconstructed as a Date. */
  date: string
}

export interface TermEntry {
  kind: 'term'
  taxonomy: TaxonomyKind
  /** Original casing, as written in frontmatter. */
  term: string
  slug: string
  permalink: PermalinkPair
  /** Raw dates of every post carrying this term, for the list page's lastmod. */
  memberDates: string[]
  /** The posts themselves, newest first — what a term page lists. */
  members: TermMember[]
}

export interface SiteIndex {
  posts: BlogEntry[]
  pages: PageEntry[]
  terms: TermEntry[]
}

interface MdxFile {
  frontmatter: MdxFrontmatter
  body: string
}

async function readMdx(dir: string, locale: Locale): Promise<MdxFile> {
  const file = path.join(dir, `${locale}.mdx`)
  const source = await readFile(file, 'utf8')

  const parts = splitMdxFrontmatter(source)
  if (!parts) throw new Error(`No frontmatter in ${file}`)

  return {
    frontmatter: parseContentFile(MdxFrontmatterSchema, parseYaml(parts.frontmatter), file),
    body: parts.body,
  }
}

/** Hugo's `summaryLength`, in words (hugo.toml:17). */
const SUMMARY_WORDS = 70

const JSX_EXPRESSION = /\{[^{}]*\}/g
const JSX_OR_HTML_TAG = /<[^>]*>/g
const MARKDOWN_LINK = /\[([^\]]*)\]\([^)]*\)/g
const MARKDOWN_SYNTAX = /(^\s{0,3}#{1,6}\s+|^\s{0,3}[-*+]\s+|^\s{0,3}>\s?|\*\*|__|\*|_|`{1,3}|^---+$)/gm

/**
 * A plain-text summary of an MDX body, at Hugo's word limit.
 *
 * A deliberate, visible deviation. Hugo's `.Summary` is *rendered HTML* — the real feed
 * carries `<p>`, `<a href>`, `<pre><code>` and smartypants-substituted quotes. Reproducing
 * that would mean compiling each MDX body through the full pipeline, custom components and
 * all, to serialise output nobody indexes: feed descriptions are not a ranking input. So the
 * structural contract is kept (one item per page, summary rather than full content, at the
 * same word count) and the markup is not. Recorded in docs/seo-contract.md.
 */
function summarize(body: string): string {
  const plain = body
    .replace(MARKDOWN_LINK, '$1')
    .replace(JSX_EXPRESSION, ' ')
    .replace(JSX_OR_HTML_TAG, ' ')
    .replace(MARKDOWN_SYNTAX, '')
    .replace(/\s+/g, ' ')
    .trim()

  const words = plain.split(' ').filter(Boolean)
  return words.length <= SUMMARY_WORDS
    ? words.join(' ')
    : `${words.slice(0, SUMMARY_WORDS).join(' ')} …`
}

async function readLocalized(
  dir: string,
): Promise<{ frontmatter: Localized<MdxFrontmatter>; summary: Localized<string> }> {
  const [fr, en] = await Promise.all(LOCALES.map((locale) => readMdx(dir, locale)))
  if (!fr || !en) throw new Error(`Missing localized MDX in ${dir}`)

  return {
    frontmatter: { fr: fr.frontmatter, en: en.frontmatter },
    summary: { fr: summarize(fr.body), en: summarize(en.body) },
  }
}

async function readJson<S extends z.ZodType>(file: string, schema: S): Promise<z.infer<S>> {
  return parseContentFile(schema, JSON.parse(await readFile(file, 'utf8')) as unknown, file)
}

async function loadPosts(): Promise<BlogEntry[]> {
  const dir = path.join(CONTENT_DIR, 'blog')
  const entries = await readdir(dir, { withFileTypes: true })

  return Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry): Promise<BlogEntry> => {
        const postDir = path.join(dir, entry.name)
        const meta: BlogMeta = await readJson(path.join(postDir, 'meta.json'), BlogMetaSchema)
        const localized = await readLocalized(postDir)

        return {
          kind: 'blog',
          slug: meta.slug,
          urlDate: meta.urlDate,
          permalink: meta.permalink,
          date: meta.date,
          tags: meta.tags,
          categories: meta.categories,
          authors: meta.authors,
          banner: meta.banner,
          ...localized,
        }
      }),
  )
}

/** `content/pages` nests (`photos/portraits`), so recurse to any depth. */
async function findPageDirs(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const found: string[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const child = path.join(dir, entry.name)
    const names = await readdir(child)
    if (names.includes('meta.json')) found.push(child)
    found.push(...(await findPageDirs(child)))
  }

  return found
}

async function loadPages(): Promise<PageEntry[]> {
  const dir = path.join(CONTENT_DIR, 'pages')
  const dirs = await findPageDirs(dir)

  return Promise.all(
    dirs.map(async (pageDir): Promise<PageEntry> => {
      const meta: PageMeta = await readJson(path.join(pageDir, 'meta.json'), PageMetaSchema)
      const localized = await readLocalized(pageDir)

      return {
        kind: 'page',
        path: meta.path,
        permalink: meta.permalink,
        noindex: meta.noindex ?? false,
        date: meta.date,
        ...localized,
      }
    }),
  )
}

/**
 * Everything `deriveTerms` needs from a post.
 *
 * Structural rather than `BlogEntry` so the routing layer can group terms from a cheap
 * `meta.json`-only read (`content/post-meta.ts`) instead of paying for both locales'
 * frontmatter and a summarised body, which only the feeds want. `BlogEntry` satisfies it
 * already, so the call below is unchanged.
 */
export type PostMetaLike = Pick<
  BlogEntry,
  'slug' | 'urlDate' | 'date' | 'permalink' | 'tags' | 'categories' | 'authors'
>

/**
 * Term pages, grouped from post membership.
 *
 * Terms differing only in case collapse into one page, matching Hugo — the corpus contains
 * both "Quebec"/"quebec" and "Sonum Fest"/"sonum fest". The first spelling encountered wins
 * as the display term, which only affects `article:section` casing on a page nothing links.
 *
 * Members come back newest first, ordered here rather than in the routes. Ordering needs the
 * parsed instant — frontmatter dates carry -04:00/-05:00 offsets, so a lexical sort misplaces
 * posts either side of a DST change — while every URL and every displayed date needs the
 * literal string. Doing it once, where the dates already are, keeps that distinction in one
 * place instead of restating it in three taxonomy routes across two locales.
 */
export function deriveTerms(posts: readonly PostMetaLike[]): TermEntry[] {
  const bySlug = new Map<string, TermEntry>()

  for (const post of posts) {
    const membership: Record<TaxonomyKind, string[]> = {
      tags: post.tags,
      categories: post.categories,
      authors: post.authors,
    }

    for (const taxonomy of TAXONOMY_KINDS) {
      for (const term of membership[taxonomy]) {
        const slug = slugifyTerm(term)
        if (!slug) continue

        const key = `${taxonomy}/${slug}`
        const existing = bySlug.get(key)

        const member: TermMember = {
          slug: post.slug,
          permalink: post.permalink,
          date: post.date,
        }

        if (existing) {
          existing.memberDates.push(post.date)
          existing.members.push(member)
          continue
        }

        bySlug.set(key, {
          kind: 'term',
          taxonomy,
          term,
          slug,
          permalink: {
            fr: taxonomyPermalink(taxonomy, slug, 'fr'),
            en: taxonomyPermalink(taxonomy, slug, 'en'),
          },
          memberDates: [post.date],
          members: [member],
        })
      }
    }
  }

  for (const entry of bySlug.values()) {
    entry.members.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  }

  return [...bySlug.values()]
}

export async function loadSiteIndex(): Promise<SiteIndex> {
  const [posts, pages] = await Promise.all([loadPosts(), loadPages()])

  // Cross-check the derived URLs against the stored ones. The permalinks in meta.json were
  // written by the migration from Hugo's own output; recomputing them here and comparing is
  // a cheap guard against this module and the URL contract drifting apart.
  for (const post of posts) {
    const derived = blogPermalink(urlDateFromRawDate(post.date), post.slug, 'fr')
    if (derived !== post.permalink.fr) {
      throw new Error(`Permalink drift for ${post.slug}: ${derived} vs ${post.permalink.fr}`)
    }
  }
  for (const page of pages) {
    const derived = pagePermalink(page.path, 'fr')
    if (derived !== page.permalink.fr) {
      throw new Error(`Permalink drift for ${page.path}: ${derived} vs ${page.permalink.fr}`)
    }
  }

  return { posts, pages, terms: deriveTerms(posts) }
}
