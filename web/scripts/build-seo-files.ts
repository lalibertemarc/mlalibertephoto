/**
 * Generate the sitemap and RSS feeds into `public/`.
 *
 * These five files cannot come from Next's own metadata conventions. `app/sitemap.ts`
 * returns a `<urlset>` and has no representation of a `<sitemapindex>`, which is what
 * `/sitemap.xml` must be for a multilingual Hugo site; `generateSitemaps()` emits
 * `/sitemap/[id].xml`, not the `/fr/sitemap.xml` + `/en/sitemap.xml` pair Google has
 * indexed; and RSS has no file convention at all. Since three of the five need hand-rolled
 * XML regardless, all five come from here — one enumeration pass, one date-formatting
 * module, one thing to test.
 *
 * Runs as `prebuild`, so `npm run build` picks it up with no CI change. Output is
 * gitignored: it is derived from content already in the repo and is cheap to regenerate,
 * unlike `lib/image-dimensions.json`, which is committed because producing it needs network.
 *
 * `robots.txt` is not generated. Its entire content is the literal line `User-agent: *`, so
 * it is committed as a static file in `public/`.
 *
 * Usage:
 *   npx tsx scripts/build-seo-files.ts
 */

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadSiteIndex, type SiteIndex } from '../lib/content/site-index'
import { newestDate } from '../lib/dates'
import { localeHref, taxonomyListPermalink, TAXONOMY_KINDS, type Locale } from '../lib/permalink'
import { SEO_DEFAULTS } from '../lib/seo/constants'
import { absoluteUrl } from '../lib/seo/format'
import { buildRssXml, type RssItem } from '../lib/seo/rss'
import { buildSitemapIndexXml, buildUrlsetXml, type SitemapEntry } from '../lib/seo/sitemap'
import { getSiteConfig } from '../lib/site-config'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = path.resolve(HERE, '..', 'public')

const LOCALES: readonly Locale[] = ['fr', 'en']

/** Both languages' paths for a route that exists in each, as the sitemap needs them. */
function pair(build: (locale: Locale) => string) {
  return { fr: build('fr'), en: build('en') }
}

function sitemapEntries(index: SiteIndex): SitemapEntry[] {
  const { posts, pages, terms } = index

  const postDates = posts.map((post) => post.date)
  const pageDates = pages.flatMap((page) => (page.date === undefined ? [] : [page.date]))
  const entries: SitemapEntry[] = []

  // Hugo's cascade is per branch: the home page takes the newest date among *all* its
  // descendants, so standalone pages count. Every post currently outdates every page, which
  // makes the distinction invisible — until a gallery page is refreshed.
  entries.push({
    path: '/',
    lastmod: newestDate([...postDates, ...pageDates]),
    alternates: pair((locale) => localeHref('/', locale)),
  })

  // /blog/ genuinely has only posts beneath it.
  entries.push({
    path: '/blog/',
    lastmod: newestDate(postDates),
    alternates: pair((locale) => localeHref('/blog/', locale)),
  })

  for (const post of posts) {
    entries.push({ path: post.permalink.fr, lastmod: post.date, alternates: post.permalink })
  }

  for (const page of pages) {
    // The one deliberate departure from Hugo's URL set. Hugo's sitemap template knows
    // nothing about the custom `noindex` param, so it advertises /smsprices/ while that
    // page's own head says noindex,nofollow — wasted crawl budget on a site already
    // struggling to get indexed. Excluding it makes each urlset 218 rather than 219; the
    // cutover diff should expect that.
    if (page.noindex) continue
    entries.push({ path: page.permalink.fr, lastmod: page.date, alternates: page.permalink })
  }

  for (const taxonomy of TAXONOMY_KINDS) {
    const inTaxonomy = terms.filter((term) => term.taxonomy === taxonomy)
    if (inTaxonomy.length === 0) continue

    entries.push({
      path: taxonomyListPermalink(taxonomy, 'fr'),
      lastmod: newestDate(inTaxonomy.flatMap((term) => term.memberDates)),
      alternates: pair((locale) => taxonomyListPermalink(taxonomy, locale)),
    })

    for (const term of inTaxonomy) {
      entries.push({
        path: term.permalink.fr,
        lastmod: newestDate(term.memberDates),
        alternates: term.permalink,
      })
    }
  }

  return entries
}

/** Rebase a French-tree entry onto the given locale. */
function forLocale(entry: SitemapEntry, locale: Locale): SitemapEntry {
  return { ...entry, path: entry.alternates[locale] }
}

function rssItems(index: SiteIndex, locale: Locale): RssItem[] {
  const fromPosts = index.posts.map(
    (post): RssItem => ({
      title: post.frontmatter[locale].title,
      link: absoluteUrl(post.permalink[locale]),
      date: post.date,
      description: post.summary[locale],
    }),
  )

  // Every page, including the seven with no date — the feed carries all 85 regular pages,
  // matching Hugo. Those seven simply omit `<pubDate>` rather than claiming Hugo's zero time.
  const fromPages = index.pages.map(
    (page): RssItem => ({
      title: page.frontmatter[locale].title,
      link: absoluteUrl(page.permalink[locale]),
      date: page.date,
      description: page.summary[locale],
    }),
  )

  return [...fromPosts, ...fromPages]
}

/**
 * Netlify rules for the `page/1/` alias URLs.
 *
 * Hugo emits a real file for every list's first page — `/blog/page/1/`, and one per term —
 * as a `noindex` meta-refresh stub pointing at the unsuffixed URL. 266 of them across the
 * blog and taxonomy families. They are indexed by crawl discovery, so they cannot simply
 * 404, but reproducing a meta-refresh stub in Next would mean generating 266 pages whose
 * only job is to bounce; a 301 is both cheaper and a stronger signal.
 *
 * Generated rather than hand-written. Netlify's placeholder syntax could express most of
 * these in a handful of rules, but not the one term whose slug contains a slash
 * (`lr/mogrify-2`) — a named placeholder matches a single segment. Since the term set is
 * known here anyway, emitting literal rules avoids depending on a matching grammar nobody
 * has verified against a deploy, and cannot drift as terms change.
 *
 * `netlify.toml` is evaluated ahead of `_redirects`, so the existing moved-term rules (for
 * example `/tags/bird/*` → `/categories/bird/`) still win over the generic stub rule here.
 */
function redirectLines(index: SiteIndex): string[] {
  const targets: string[] = []

  for (const locale of LOCALES) {
    targets.push(localeHref('/blog/', locale))

    for (const taxonomy of TAXONOMY_KINDS) {
      const inTaxonomy = index.terms.filter((term) => term.taxonomy === taxonomy)
      if (inTaxonomy.length === 0) continue

      targets.push(taxonomyListPermalink(taxonomy, locale))
      for (const term of inTaxonomy) targets.push(term.permalink[locale])
    }
  }

  return targets.map((target) => `${target}page/1/  ${target}  301`)
}

async function write(relativePath: string, contents: string): Promise<void> {
  const target = path.join(PUBLIC_DIR, relativePath)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, contents, 'utf8')
  console.log(`  wrote public/${relativePath.replace(/\\/g, '/')}`)
}

async function main(): Promise<void> {
  const index = await loadSiteIndex()
  const entries = sitemapEntries(index)

  console.log(
    `Indexed ${index.posts.length} posts, ${index.pages.length} pages, ${index.terms.length} terms.`,
  )

  // Same cascade as the home page: the index covers the whole site, so all content counts.
  const newest = newestDate([
    ...index.posts.map((post) => post.date),
    ...index.pages.flatMap((page) => (page.date === undefined ? [] : [page.date])),
  ])

  for (const locale of LOCALES) {
    const localized = entries.map((entry) => forLocale(entry, locale))
    const sitemapPath = `${locale}/sitemap.xml`
    await write(sitemapPath, buildUrlsetXml(localized))
    console.log(`    ${localized.length} urls`)

    const site = getSiteConfig(locale)
    const feedPath = locale === 'en' ? 'en/index.xml' : 'index.xml'
    const items = rssItems(index, locale)

    await write(
      feedPath,
      buildRssXml({
        title: site.title,
        link: absoluteUrl(localeHref('/', locale)),
        description: SEO_DEFAULTS[locale].description,
        language: locale,
        selfLink: absoluteUrl(`/${feedPath}`),
        items,
      }),
    )
    console.log(`    ${items.length} feed items`)
  }

  await write(
    'sitemap.xml',
    buildSitemapIndexXml(LOCALES.map((locale) => ({ path: `/${locale}/sitemap.xml`, lastmod: newest }))),
  )

  const redirects = redirectLines(index)
  await write(
    '_redirects',
    [
      '# Generated by scripts/build-seo-files.ts — do not edit.',
      "# Hugo's page/1 alias stubs, served as 301s. See that file for why these are literal.",
      ...redirects,
      '',
    ].join('\n'),
  )
  console.log(`    ${redirects.length} page/1 redirects`)
}

await main()
