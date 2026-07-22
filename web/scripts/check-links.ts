/**
 * Every internal reference in the exported site, checked against what was actually written.
 *
 * Runs as `postbuild`, against `out/`. This is the mechanical answer to the site's own
 * history: `netlify.toml` carries ~90 redirect rules that exist because an internal URL broke
 * and nobody noticed until Google reported the 404 months later. Everything in that file is a
 * bug this check would have caught at build time.
 *
 * Three things are asserted:
 *
 * 1. Every internal `href`, `src` and `srcset` in every exported page resolves to something
 *    the export wrote.
 * 2. Every URL advertised in the sitemaps and the RSS feeds resolves to a generated page.
 * 3. Every generated page appears in a sitemap, unless it is deliberately excluded.
 *
 * ## Normalisation
 *
 * References are resolved with `new URL(raw, pageUrl)` rather than string-matched. That gets
 * absolute, root-relative and document-relative forms right in one step, and drops `mailto:`,
 * `tel:`, `javascript:`, `data:` and cross-origin links for free — they simply do not end up
 * on this origin. A bare `#anchor` resolves to the page it sits on and therefore passes;
 * fragments are not verified.
 *
 * Percent-encoding then has to be undone, because the export is not consistent about it: one
 * term page carries both `href="/authors/marc-laliberté/page/2/"` and
 * `href="/en/authors/marc-lalibert%C3%A9/"`. Both are the same file on disk. Paths are also
 * NFC-normalised, since a decomposed `é` compares unequal to a composed one while naming the
 * same directory.
 *
 * ## Trailing slashes
 *
 * `next.config.ts` sets `trailingSlash: true`, so every page is `<path>/index.html` and every
 * generated link ends in a slash. A link to the unslashed form still *works* — Netlify
 * redirects it — but it costs a hop, which this site already pays elsewhere (see the byline
 * note in `lib/content/blog-post.ts`). So it resolves, and warns.
 *
 * Usage:
 *   npx tsx scripts/check-links.ts
 */

import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { displayPath, parseContentFile } from '../lib/content/parse'
import { PageMetaSchema } from '../lib/schema'
import { SITE_ORIGIN } from '../lib/seo/constants'
import { MigrationReport } from './lib/report'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(HERE, '..', 'out')
const CONTENT_DIR = path.resolve(HERE, '..', 'content')

/** How many referencing pages to name before collapsing the rest into a count. */
const SAMPLE_PAGES = 3

// ─── The exported tree ────────────────────────────────────────────────────────────────────

interface OutputIndex {
  /** Paths served as a page, always slash-terminated: `out/blog/index.html` → `/blog/`. */
  pages: Set<string>
  /** Every written file by its URL path, pages included: `/sitemap.xml`, `/img/logo.png`. */
  files: Set<string>
}

function normalizePath(value: string): string {
  return value.normalize('NFC')
}

async function walk(dir: string, base = dir): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const found: string[] = []

  for (const entry of entries) {
    const child = path.join(dir, entry.name)
    if (entry.isDirectory()) found.push(...(await walk(child, base)))
    else found.push(path.relative(base, child).replace(/\\/g, '/'))
  }

  return found
}

async function indexOutput(): Promise<OutputIndex> {
  const index: OutputIndex = { pages: new Set(), files: new Set() }

  for (const rel of await walk(OUT_DIR)) {
    const urlPath = normalizePath(`/${rel}`)
    index.files.add(urlPath)

    if (rel === 'index.html') index.pages.add('/')
    else if (rel.endsWith('/index.html')) {
      index.pages.add(normalizePath(`/${rel.slice(0, -'index.html'.length)}`))
    }
  }

  return index
}

type Resolution = 'ok' | 'redirect' | 'missing'

function resolveTarget(index: OutputIndex, urlPath: string): Resolution {
  if (index.files.has(urlPath) || index.pages.has(urlPath)) return 'ok'
  // Netlify redirects the unslashed form to the real page. It works; it costs a hop.
  if (!urlPath.endsWith('/') && index.pages.has(`${urlPath}/`)) return 'redirect'
  return 'missing'
}

// ─── Reference extraction ─────────────────────────────────────────────────────────────────

type AttributeKind = 'href' | 'src'

interface Reference {
  kind: AttributeKind
  /** Decoded, NFC-normalised path on this origin. */
  target: string
  /** URL path of the page the reference was found on. */
  from: string
}

/**
 * Next emits double-quoted attributes throughout, so single quotes are not matched.
 *
 * `srcset` precedes `src` in the alternation so it wins outright rather than by backtracking
 * out of a partial `src` match.
 */
const ATTRIBUTE = /\s(href|srcset|src)="([^"]*)"/g

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>',
}

function decodeEntities(value: string): string {
  return value.replace(/&(?:amp|quot|#39|lt|gt);/g, (entity) => HTML_ENTITIES[entity] ?? entity)
}

/**
 * The URLs in a `srcset`, split on comma-then-whitespace.
 *
 * A Cloudinary transform segment is full of commas (`w_640,c_fill`), so splitting on a bare
 * comma would shred every URL in the list. The separator between entries is always followed
 * by whitespace here — both the loader and the spec's own examples write `url 640w, url 750w`
 * — and a transform comma never is.
 */
function srcsetUrls(value: string): string[] {
  return value
    .split(/,\s+/)
    .map((entry) => entry.trim().split(/\s+/)[0])
    .filter((url): url is string => Boolean(url))
}

/**
 * Every reference on this origin, with off-site and non-HTTP ones already dropped.
 *
 * `report` receives only genuinely unparseable values — malformed enough that no browser
 * would resolve them either.
 */
function referencesIn(html: string, pageUrlPath: string, report: MigrationReport): Reference[] {
  const pageUrl = new URL(pageUrlPath, SITE_ORIGIN)
  const found: Reference[] = []

  for (const match of html.matchAll(ATTRIBUTE)) {
    const [, attribute, rawValue] = match
    if (attribute === undefined || rawValue === undefined) continue

    const kind: AttributeKind = attribute === 'href' ? 'href' : 'src'
    const values = attribute === 'srcset' ? srcsetUrls(rawValue) : [rawValue]

    for (const value of values) {
      const raw = decodeEntities(value).trim()
      if (raw === '') continue

      let url: URL
      try {
        url = new URL(raw, pageUrl)
      } catch {
        report.error('unparseable-url', `${attribute}="${raw}"`, pageUrlPath)
        continue
      }

      if (url.origin !== SITE_ORIGIN) continue

      let decoded: string
      try {
        decoded = decodeURIComponent(url.pathname)
      } catch {
        report.error('unparseable-url', `${attribute}="${raw}" (bad percent-encoding)`, pageUrlPath)
        continue
      }

      found.push({ kind, target: normalizePath(decoded), from: pageUrlPath })
    }
  }

  return found
}

// ─── Sitemap and feed coverage ────────────────────────────────────────────────────────────

const LOC = /<loc>([^<]*)<\/loc>/g
const ALTERNATE = /<xhtml:link\b[^>]*\bhref="([^"]*)"/g
const RSS_LINK = /<link>([^<]*)<\/link>/g

/** Site-relative, decoded paths from every absolute URL a generated XML file advertises. */
function xmlPaths(xml: string, pattern: RegExp): string[] {
  const paths: string[] = []

  for (const match of xml.matchAll(pattern)) {
    const value = decodeEntities(match[1] ?? '').trim()
    if (value === '') continue
    try {
      const url = new URL(value)
      if (url.origin === SITE_ORIGIN) paths.push(normalizePath(decodeURIComponent(url.pathname)))
    } catch {
      // Not a URL at all. The generators build these with `absoluteUrl()`, so this cannot
      // happen without a bug in them; the sitemap check below fails loudly either way.
    }
  }

  return paths
}

const PAGINATION = /\/page\/\d+\/$/

/**
 * Pages that are generated but deliberately absent from the sitemap.
 *
 * Hugo never listed paginated URLs and neither does `lib/seo/sitemap.ts`; the error pages are
 * not addressable content; `/tokens/` is the migration's design-token reference page, which
 * its own header says gets deleted at cutover. The `noindex` set is *derived* from the content
 * rather than named here — `build-seo-files.ts` skips those entries by reading the same flag,
 * so restating the list would let the two drift.
 */
async function sitemapExclusions(): Promise<(urlPath: string) => boolean> {
  const noindex = new Set<string>()

  const collect = async (dir: string): Promise<void> => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const child = path.join(dir, entry.name)
      const names = await readdir(child)

      if (names.includes('meta.json')) {
        const file = path.join(child, 'meta.json')
        const raw: unknown = JSON.parse(await readFile(file, 'utf8'))
        const meta = parseContentFile(PageMetaSchema, raw, file)
        if (meta.noindex) {
          noindex.add(normalizePath(meta.permalink.fr))
          noindex.add(normalizePath(meta.permalink.en))
        }
      }

      await collect(child)
    }
  }

  await collect(path.join(CONTENT_DIR, 'pages'))

  const literal = new Set(['/404/', '/_not-found/', '/tokens/'])

  return (urlPath) => literal.has(urlPath) || noindex.has(urlPath) || PAGINATION.test(urlPath)
}

// ─── The run ──────────────────────────────────────────────────────────────────────────────

/** One finding per broken target, naming the pages that reference it. */
function reportBroken(
  report: MigrationReport,
  code: string,
  severity: 'error' | 'warning',
  byTarget: Map<string, string[]>,
  suffix = '',
): void {
  for (const [target, pages] of [...byTarget].sort((a, b) => a[0].localeCompare(b[0]))) {
    const sample = pages.slice(0, SAMPLE_PAGES).join(', ')
    const rest = pages.length > SAMPLE_PAGES ? ` and ${pages.length - SAMPLE_PAGES} more` : ''
    const message = `→ ${target}${suffix} — from ${sample}${rest}`
    if (severity === 'error') report.error(code, message)
    else report.warn(code, message)
  }
}

function bucket(map: Map<string, string[]>, key: string, page: string): void {
  const pages = map.get(key)
  if (pages) {
    if (!pages.includes(page)) pages.push(page)
  } else map.set(key, [page])
}

async function main(): Promise<void> {
  const report = new MigrationReport()

  if (!existsSync(OUT_DIR)) {
    console.error(`No export at ${displayPath(OUT_DIR)}. Run \`npm run build\` first.`)
    process.exit(1)
  }

  const index = await indexOutput()
  const htmlPages = [...index.pages].sort()

  const brokenLinks = new Map<string, string[]>()
  const brokenAssets = new Map<string, string[]>()
  const redirectHops = new Map<string, string[]>()

  let referenceCount = 0

  for (const pageUrlPath of htmlPages) {
    const file = path.join(OUT_DIR, pageUrlPath === '/' ? 'index.html' : `${pageUrlPath}index.html`)
    const html = await readFile(file, 'utf8')

    for (const reference of referencesIn(html, pageUrlPath, report)) {
      referenceCount += 1

      switch (resolveTarget(index, reference.target)) {
        case 'ok':
          break
        case 'redirect':
          bucket(redirectHops, reference.target, reference.from)
          break
        case 'missing':
          if (reference.kind === 'href') bucket(brokenLinks, reference.target, reference.from)
          else bucket(brokenAssets, reference.target, reference.from)
          break
      }
    }
  }

  reportBroken(report, 'broken-link', 'error', brokenLinks)
  reportBroken(report, 'broken-asset', 'error', brokenAssets)
  reportBroken(report, 'redirect-hop', 'warning', redirectHops, ' (no trailing slash)')

  console.log(
    `Checked ${referenceCount} references across ${htmlPages.length} pages — ` +
      `${index.files.size} files written.`,
  )

  // ── Sitemaps ──
  const advertised = new Set<string>()
  const indexXml = await readFile(path.join(OUT_DIR, 'sitemap.xml'), 'utf8')
  const children = xmlPaths(indexXml, LOC)

  for (const child of children) {
    if (resolveTarget(index, child) !== 'ok') {
      report.error('sitemap-dead-url', `sitemapindex points at ${child}, which was not written`)
      continue
    }

    const xml = await readFile(path.join(OUT_DIR, child), 'utf8')
    const locs = xmlPaths(xml, LOC)
    for (const loc of locs) advertised.add(loc)

    for (const url of [...locs, ...xmlPaths(xml, ALTERNATE)]) {
      if (resolveTarget(index, url) !== 'ok') {
        report.error('sitemap-dead-url', `→ ${url}`, child)
      }
    }
  }

  const excluded = await sitemapExclusions()
  for (const page of htmlPages) {
    if (!advertised.has(page) && !excluded(page)) {
      report.error('page-not-in-sitemap', `${page} is generated but no sitemap lists it`)
    }
  }

  console.log(`Sitemaps: ${children.length} children, ${advertised.size} urls advertised.`)

  // ── Feeds ──
  for (const feed of ['/index.xml', '/en/index.xml']) {
    if (!index.files.has(feed)) {
      report.error('missing-feed', `${feed} was not written`)
      continue
    }
    const xml = await readFile(path.join(OUT_DIR, feed), 'utf8')
    for (const url of xmlPaths(xml, RSS_LINK)) {
      if (resolveTarget(index, url) !== 'ok') report.error('feed-dead-url', `→ ${url}`, feed)
    }
  }

  if (report.count('warning') > 0 || report.hasErrors) console.log(report.summarize())

  if (report.hasErrors) {
    console.error(`\n${report.count('error')} broken reference(s). Build stopped.`)
    process.exit(1)
  }
}

await main()
