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
} from '@/lib/schema'
import { splitMdxFrontmatter } from './mdx'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const LOCALES: readonly Locale[] = ['fr', 'en']

/** A value that differs per language. */
export type Localized<T> = Record<Locale, T>

export interface BlogEntry {
  kind: 'blog'
  slug: string
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

export interface TermEntry {
  kind: 'term'
  taxonomy: TaxonomyKind
  /** Original casing, as written in frontmatter. */
  term: string
  slug: string
  permalink: PermalinkPair
  /** Raw dates of every post carrying this term, for the list page's lastmod. */
  memberDates: string[]
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
    frontmatter: MdxFrontmatterSchema.parse(parseYaml(parts.frontmatter)),
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

async function readJson<T>(file: string, parse: (value: unknown) => T): Promise<T> {
  return parse(JSON.parse(await readFile(file, 'utf8')))
}

async function loadPosts(): Promise<BlogEntry[]> {
  const dir = path.join(CONTENT_DIR, 'blog')
  const entries = await readdir(dir, { withFileTypes: true })

  return Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry): Promise<BlogEntry> => {
        const postDir = path.join(dir, entry.name)
        const meta: BlogMeta = await readJson(path.join(postDir, 'meta.json'), (v) =>
          BlogMetaSchema.parse(v),
        )
        const localized = await readLocalized(postDir)

        return {
          kind: 'blog',
          slug: meta.slug,
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
      const meta: PageMeta = await readJson(path.join(pageDir, 'meta.json'), (v) =>
        PageMetaSchema.parse(v),
      )
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
 * Term pages, grouped from post membership.
 *
 * Terms differing only in case collapse into one page, matching Hugo — the corpus contains
 * both "Quebec"/"quebec" and "Sonum Fest"/"sonum fest". The first spelling encountered wins
 * as the display term, which only affects `article:section` casing on a page nothing links.
 */
function deriveTerms(posts: readonly BlogEntry[]): TermEntry[] {
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

        if (existing) {
          existing.memberDates.push(post.date)
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
        })
      }
    }
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
