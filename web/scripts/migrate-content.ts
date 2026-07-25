import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { compile } from '@mdx-js/mdx'
import { imageSize } from 'image-size'
import { parse as parseYaml } from 'yaml'

import {
  BlogMetaSchema,
  CarouselSlideSchema,
  FeatureSchema,
  MdxFrontmatterSchema,
  PageMetaSchema,
  TestimonialSchema,
  type Banner,
  type BlogMeta,
  type Locale,
  type MdxFrontmatter,
  type PageMeta,
} from '../lib/schema.ts'
import {
  blogFolderName,
  blogPermalink,
  pagePermalink,
  slugFromFilename,
  urlDateFromRawDate,
} from '../lib/permalink.ts'
import { htmlToJsx } from './lib/html-jsx.ts'
import {
  expectString,
  expectStringArray,
  optionalBoolean,
  optionalNumber,
  optionalString,
  optionalStringArray,
  parseFrontmatter,
  type TomlValue,
} from './lib/frontmatter.ts'
import { resolveRefLinks, transformShortcodes } from './lib/shortcodes.ts'
import {
  LocaleDivergenceError,
  MigrationError,
  MigrationReport,
  MissingBannerError,
  PermalinkMismatchError,
  SourcePairingError,
  UnknownFrontmatterKeyError,
} from './lib/report.ts'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..')
const CONTENT_SRC = join(REPO_ROOT, 'content')
const DATA_SRC = join(REPO_ROOT, 'data')
const STATIC_SRC = join(REPO_ROOT, 'static')
const OUT_ROOT = join(REPO_ROOT, 'web', 'content')
const FIXTURE = join(SCRIPT_DIR, 'fixtures', 'hugo-urls.csv')

/** Frontmatter keys this pipeline understands. Anything else stops the run. */
const BLOG_KEYS = new Set([
  'title', 'date', 'draft', 'description', 'tags', 'categories', 'banner', 'authors',
  'external_banner', 'banner_alt', 'banner_width', 'banner_height', 'meta_title', 'keywords',
])
const PAGE_KEYS = new Set([
  'title', 'date', 'draft', 'description', 'meta_title', 'keywords',
  'page_class', 'noindex', 'id',
])

/**
 * Local banner files that are already missing from static/ in production. These posts render
 * a broken banner on the live site today; the migration emits no banner for them rather than
 * inventing dimensions. Listing them explicitly means a *new* missing banner is an error
 * rather than quietly joining the accepted set.
 */
const KNOWN_MISSING_BANNERS = new Set([
  'img/_DSC7374-001-Edit-Edit - insta.jpg',
  'img/_DSC7107 - insta.jpg',
  'img/_DSC6905 - insta.jpg',
  'img/_DSC7025 - insta.jpg',
])

const report = new MigrationReport()

interface OutputFile {
  path: string
  content: string
}

const outputs: OutputFile[] = []
const derivedPermalinks = new Map<string, string>()

/**
 * Every output file is normalised to LF here, regardless of the source's line endings.
 *
 * This is load-bearing for idempotency across machines. `core.autocrlf` is true in this
 * repo, so 159 of the 170 source files arrive with CRLF on Windows and LF on Linux. Copying
 * a body verbatim therefore makes the output's line endings a property of the checkout
 * rather than of the content, and `--check` would report a large fraction of files as
 * changed simply for having been generated on a different platform.
 */
function queue(path: string, content: string): void {
  outputs.push({ path, content: content.replace(/\r\n/g, '\n') })
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

function checkKeys(data: Record<string, TomlValue>, allowed: Set<string>, file: string): void {
  for (const key of Object.keys(data)) {
    if (!allowed.has(key)) {
      throw new UnknownFrontmatterKeyError(
        `Unrecognised frontmatter key "${key}" — migrating it would need an explicit decision`,
        file,
      )
    }
  }
}

/** YAML frontmatter for an .mdx file, with deterministic formatting. */
function mdxFile(frontmatter: MdxFrontmatter, body: string): string {
  const lines = ['---']
  lines.push(`title: ${JSON.stringify(frontmatter.title)}`)
  lines.push(`description: ${JSON.stringify(frontmatter.description)}`)
  if (frontmatter.meta_title !== undefined) {
    lines.push(`meta_title: ${JSON.stringify(frontmatter.meta_title)}`)
  }
  if (frontmatter.keywords !== undefined) {
    lines.push(`keywords: ${JSON.stringify(frontmatter.keywords)}`)
  }
  lines.push('---', '')
  return `${lines.join('\n')}\n${body.trim()}\n`
}

function normalizeLocalBannerPath(raw: string): string {
  return raw.replace(/^\/+/, '')
}

function resolveBanner(
  data: Record<string, TomlValue>,
  file: string,
): Banner | undefined {
  const src = optionalString(data, 'banner', file)
  if (src === undefined || src === '') return undefined

  const alt = optionalString(data, 'banner_alt', file)

  if (/^https?:\/\//.test(src)) {
    const width = optionalNumber(data, 'banner_width', file)
    const height = optionalNumber(data, 'banner_height', file)
    if (width === undefined || height === undefined) {
      throw new MigrationErrorShim(`Remote banner is missing declared dimensions`, file)
    }
    return { src, alt, width, height }
  }

  const relPath = normalizeLocalBannerPath(src)
  const absolute = join(STATIC_SRC, relPath)

  if (!existsSync(absolute)) {
    if (KNOWN_MISSING_BANNERS.has(relPath)) {
      report.warn(
        'missing-banner',
        `Local banner "${relPath}" does not exist; emitting no banner (already broken in production)`,
        file,
      )
      return undefined
    }
    throw new MissingBannerError(`Local banner "${relPath}" does not exist under static/`, file)
  }

  const { width, height } = imageSize(readFileSync(absolute))
  // Local banner paths are written both with and without a leading slash; normalise to one.
  return { src: `/${relPath}`, alt, width, height }
}

/** Small concrete error for the handful of cases without a dedicated class. */
class MigrationErrorShim extends MigrationError {
  readonly code = 'content'
}

function readSource(path: string): { data: Record<string, TomlValue>; body: string } {
  return parseFrontmatter(readFileSync(path, 'utf8'), relative(REPO_ROOT, path))
}

function transformBody(
  body: string,
  file: string,
  refResolver: (target: string) => string | undefined,
): string {
  const withRefs = resolveRefLinks(body, refResolver, file)
  const withComponents = transformShortcodes(withRefs, { file })
  return htmlToJsx(withComponents)
}

function frontmatterFor(data: Record<string, TomlValue>, file: string): MdxFrontmatter {
  return MdxFrontmatterSchema.parse({
    title: expectString(data, 'title', file),
    description: optionalString(data, 'description', file) ?? '',
    meta_title: optionalString(data, 'meta_title', file),
    keywords: optionalStringArray(data, 'keywords', file),
  })
}

function sameArray(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function listMarkdown(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort()
}

function walkPages(localeRoot: string, prefix = ''): string[] {
  const found: string[] = []
  for (const entry of readdirSync(localeRoot).sort()) {
    const absolute = join(localeRoot, entry)
    if (statSync(absolute).isDirectory()) {
      if (entry === 'blog') continue
      found.push(...walkPages(absolute, prefix === '' ? entry : `${prefix}/${entry}`))
      continue
    }
    if (!entry.endsWith('.md')) continue
    const base = entry.slice(0, -3)
    found.push(prefix === '' ? base : `${prefix}/${base}`)
  }
  return found
}

// ---------------------------------------------------------------------------------------
// Reference resolution for {{< ref "…" >}}
// ---------------------------------------------------------------------------------------

function buildRefResolver(locale: Locale): (target: string) => string | undefined {
  return (target) => {
    const clean = target.replace(/^\.?\//, '').replace(/\.md$/, '')
    return pagePermalink(clean, locale)
  }
}

// ---------------------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------------------

function processBlog(): void {
  const frFiles = listMarkdown(join(CONTENT_SRC, 'fr', 'blog'))
  const enFiles = new Set(listMarkdown(join(CONTENT_SRC, 'en', 'blog')))

  for (const name of frFiles) {
    const frPath = join(CONTENT_SRC, 'fr', 'blog', name)
    const enPath = join(CONTENT_SRC, 'en', 'blog', name)
    const label = `content/fr/blog/${name}`

    try {
      if (!enFiles.has(name)) {
        throw new SourcePairingError(`No English twin for ${name}`, label)
      }
      enFiles.delete(name)

      const fr = readSource(frPath)
      const en = readSource(enPath)
      checkKeys(fr.data, BLOG_KEYS, label)
      checkKeys(en.data, BLOG_KEYS, `content/en/blog/${name}`)

      if (optionalBoolean(fr.data, 'draft', label) === true) {
        report.info('draft', `Skipping draft post`, label)
        continue
      }

      const frDate = expectString(fr.data, 'date', label)
      const enDate = expectString(en.data, 'date', `content/en/blog/${name}`)
      const urlDate = urlDateFromRawDate(frDate)
      const enUrlDate = urlDateFromRawDate(enDate)

      if (
        urlDate.year !== enUrlDate.year ||
        urlDate.month !== enUrlDate.month ||
        urlDate.day !== enUrlDate.day
      ) {
        throw new LocaleDivergenceError(
          `FR and EN resolve to different URL dates (${frDate} vs ${enDate})`,
          label,
        )
      }
      if (frDate !== enDate) {
        // Differs only below the day, so the URL is unaffected; FR is canonical.
        report.warn('date-divergence', `FR ${frDate} vs EN ${enDate}; using FR`, label)
      }

      const frTags = expectStringArray(fr.data, 'tags', label)
      const enTags = expectStringArray(en.data, 'tags', `content/en/blog/${name}`)
      const frCategories = expectStringArray(fr.data, 'categories', label)
      const enCategories = expectStringArray(en.data, 'categories', `content/en/blog/${name}`)
      const frAuthors = expectStringArray(fr.data, 'authors', label)

      if (!sameArray(frTags, enTags)) {
        throw new LocaleDivergenceError(
          `tags differ: [${frTags.join(', ')}] vs [${enTags.join(', ')}]`,
          label,
        )
      }
      if (!sameArray(frCategories, enCategories)) {
        throw new LocaleDivergenceError(
          `categories differ: [${frCategories.join(', ')}] vs [${enCategories.join(', ')}]`,
          label,
        )
      }

      const banner = resolveBanner(fr.data, label)
      const slug = slugFromFilename(name.slice(0, -3))

      const meta: BlogMeta = BlogMetaSchema.parse({
        slug,
        date: frDate,
        urlDate,
        permalink: {
          fr: blogPermalink(urlDate, slug, 'fr'),
          en: blogPermalink(urlDate, slug, 'en'),
        },
        tags: frTags,
        categories: frCategories,
        authors: frAuthors,
        banner,
      })

      derivedPermalinks.set(`content/fr/blog/${name}`, meta.permalink.fr)
      derivedPermalinks.set(`content/en/blog/${name}`, meta.permalink.en)

      const dir = join(OUT_ROOT, 'blog', blogFolderName(urlDate, slug))
      queue(join(dir, 'meta.json'), json(meta))
      queue(
        join(dir, 'fr.mdx'),
        mdxFile(frontmatterFor(fr.data, label), transformBody(fr.body, label, buildRefResolver('fr'))),
      )
      queue(
        join(dir, 'en.mdx'),
        mdxFile(
          frontmatterFor(en.data, `content/en/blog/${name}`),
          transformBody(en.body, `content/en/blog/${name}`, buildRefResolver('en')),
        ),
      )
    } catch (error) {
      if (error instanceof MigrationError) report.fail(error)
      else throw error
    }
  }

  for (const orphan of enFiles) {
    report.error('source-pairing', `No French twin for ${orphan}`, `content/en/blog/${orphan}`)
  }
}

// ---------------------------------------------------------------------------------------
// Non-blog pages
// ---------------------------------------------------------------------------------------

function processPages(): void {
  const frPages = walkPages(join(CONTENT_SRC, 'fr'))
  const enPages = new Set(walkPages(join(CONTENT_SRC, 'en')))

  for (const relPath of frPages) {
    const label = `content/fr/${relPath}.md`
    try {
      if (!enPages.has(relPath)) {
        throw new SourcePairingError(`No English twin for ${relPath}.md`, label)
      }
      enPages.delete(relPath)

      const fr = readSource(join(CONTENT_SRC, 'fr', `${relPath}.md`))
      const en = readSource(join(CONTENT_SRC, 'en', `${relPath}.md`))
      checkKeys(fr.data, PAGE_KEYS, label)
      checkKeys(en.data, PAGE_KEYS, `content/en/${relPath}.md`)

      const frPageClass = optionalString(fr.data, 'page_class', label)
      const frId = optionalString(fr.data, 'id', label)
      const enId = optionalString(en.data, 'id', `content/en/${relPath}.md`)
      if (frId !== enId) {
        report.warn(
          'locale-divergence',
          `id present in only one language (fr=${frId ?? '-'}, en=${enId ?? '-'}); using FR`,
          label,
        )
      }

      const meta: PageMeta = PageMetaSchema.parse({
        path: relPath,
        permalink: {
          fr: pagePermalink(relPath, 'fr'),
          en: pagePermalink(relPath, 'en'),
        },
        pageClass: frPageClass,
        noindex: optionalBoolean(fr.data, 'noindex', label),
        id: frId,
        date: optionalString(fr.data, 'date', label),
      })

      derivedPermalinks.set(`content/fr/${relPath}.md`, meta.permalink.fr)
      derivedPermalinks.set(`content/en/${relPath}.md`, meta.permalink.en)

      const dir = join(OUT_ROOT, 'pages', ...relPath.split('/'))
      queue(join(dir, 'meta.json'), json(meta))
      queue(
        join(dir, 'fr.mdx'),
        mdxFile(frontmatterFor(fr.data, label), transformBody(fr.body, label, buildRefResolver('fr'))),
      )
      queue(
        join(dir, 'en.mdx'),
        mdxFile(
          frontmatterFor(en.data, `content/en/${relPath}.md`),
          transformBody(en.body, `content/en/${relPath}.md`, buildRefResolver('en')),
        ),
      )
    } catch (error) {
      if (error instanceof MigrationError) report.fail(error)
      else throw error
    }
  }

  for (const orphan of enPages) {
    report.error('source-pairing', `No French twin for ${orphan}.md`, `content/en/${orphan}.md`)
  }
}

// ---------------------------------------------------------------------------------------
// data/*.yaml
// ---------------------------------------------------------------------------------------

function processData(): void {
  const collections = [
    { dir: 'carousel', schema: CarouselSlideSchema },
    { dir: 'features', schema: FeatureSchema },
    { dir: 'testimonials', schema: TestimonialSchema },
  ] as const

  for (const { dir, schema } of collections) {
    const source = join(DATA_SRC, dir)
    if (!existsSync(source)) {
      report.error('missing-data', `data/${dir} does not exist`)
      continue
    }
    const items: unknown[] = []
    for (const name of readdirSync(source).filter((f) => /\.ya?ml$/.test(f)).sort()) {
      const label = `data/${dir}/${name}`
      try {
        const parsed: unknown = parseYaml(readFileSync(join(source, name), 'utf8'))
        items.push(schema.parse(parsed))
      } catch (error) {
        report.error('data', error instanceof Error ? error.message : String(error), label)
      }
    }
    queue(join(OUT_ROOT, 'data', `${dir}.json`), json(items))
  }
}

// ---------------------------------------------------------------------------------------
// URL contract verification
// ---------------------------------------------------------------------------------------

/**
 * Quote-aware CSV split. `hugo list all` quotes any title containing a comma, so splitting
 * on every comma would shift the later columns and silently mis-read the permalink.
 */
function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
      continue
    }
    if (char === '"') inQuotes = true
    else if (char === ',') {
      cells.push(current)
      current = ''
    } else current += char
  }
  cells.push(current)
  return cells
}

function loadLivePermalinks(): Map<string, string> | undefined {
  let csv: string | undefined

  // Passed as one command string rather than an args array: Node deprecates args + shell,
  // and shell is what lets this resolve hugo.exe on Windows.
  const hugo = spawnSync('hugo list all', {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    shell: true,
  })
  if (hugo.status === 0 && hugo.stdout.includes('permalink')) {
    csv = hugo.stdout
  } else if (existsSync(FIXTURE)) {
    report.warn('fixture', 'hugo not runnable; falling back to the checked-in permalink fixture')
    csv = readFileSync(FIXTURE, 'utf8')
  }
  if (csv === undefined) {
    report.error('fixture', 'Cannot verify URLs: hugo unavailable and no fixture present')
    return undefined
  }

  const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== '')
  const header = (lines.shift() ?? '').split(',')
  const pathIndex = header.indexOf('path')
  const permalinkIndex = header.indexOf('permalink')
  if (pathIndex === -1 || permalinkIndex === -1) {
    report.error('fixture', 'Permalink source is missing a path or permalink column')
    return undefined
  }

  const live = new Map<string, string>()
  for (const line of lines) {
    const cells = splitCsvLine(line)
    const path = cells[pathIndex]
    const permalink = cells[permalinkIndex]
    if (path === undefined || permalink === undefined || path === '') continue
    live.set(path, permalink.replace(/^https?:\/\/[^/]+/, ''))
  }
  return live
}

function verifyPermalinks(): void {
  const live = loadLivePermalinks()
  if (!live) return

  for (const [path, expected] of live) {
    const derived = derivedPermalinks.get(path)
    if (derived === undefined) {
      // Drafts and failed items are legitimately absent; both are already reported.
      continue
    }
    if (derived !== expected) {
      report.fail(
        new PermalinkMismatchError(`derived ${derived} but the live site serves ${expected}`, path),
      )
    }
  }

  for (const path of derivedPermalinks.keys()) {
    if (!live.has(path)) {
      report.warn('permalink', `No live URL found to check against`, path)
    }
  }
  report.info('permalink', `Checked ${derivedPermalinks.size} derived URLs against ${live.size} live URLs`)
}

// ---------------------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------------------

function write(): { written: number; unchanged: number } {
  let written = 0
  let unchanged = 0
  for (const file of outputs) {
    const existing = existsSync(file.path) ? readFileSync(file.path, 'utf8') : undefined
    if (existing === file.content) {
      unchanged++
      continue
    }
    mkdirSync(dirname(file.path), { recursive: true })
    writeFileSync(file.path, file.content)
    written++
  }
  return { written, unchanged }
}

function findOrphans(): string[] {
  if (!existsSync(OUT_ROOT)) return []
  const expected = new Set(outputs.map((o) => resolve(o.path)))
  const orphans: string[] = []
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const absolute = join(dir, entry)
      if (statSync(absolute).isDirectory()) walk(absolute)
      else if (!expected.has(resolve(absolute))) orphans.push(relative(REPO_ROOT, absolute))
    }
  }
  walk(OUT_ROOT)
  return orphans
}

// ---------------------------------------------------------------------------------------

/**
 * Compile every generated .mdx before anything is written.
 *
 * Absence of `{{<` proves the shortcodes were consumed, but says nothing about whether the
 * result is valid MDX. Real defects live in that gap: an unclosed `<p>` that HTML tolerates
 * and MDX rejects, or an HTML comment, which MDX treats as a syntax error rather than a
 * no-op. Compiling here turns "the site still builds" into a property of the migration
 * instead of something discovered much later by a failing Next build.
 */
async function verifyMdxCompiles(): Promise<void> {
  for (const file of outputs) {
    if (!file.path.endsWith('.mdx')) continue
    try {
      await compile(file.content, { jsx: true })
    } catch (error) {
      const message = error instanceof Error ? error.message.split('\n')[0] : String(error)
      report.error('invalid-mdx', message ?? 'MDX failed to compile', relative(REPO_ROOT, file.path))
    }
  }
}

async function main(): Promise<void> {
  const check = process.argv.includes('--check')

  processBlog()
  processPages()
  processData()
  verifyPermalinks()

  const residual = outputs.filter((o) => o.path.endsWith('.mdx') && o.content.includes('{{<'))
  for (const file of residual) {
    report.error('residual-shortcode', 'Output still contains {{<', relative(REPO_ROOT, file.path))
  }

  await verifyMdxCompiles()

  console.log(report.summarize())

  if (report.hasErrors) {
    console.error(`\nMigration failed: ${report.count('error')} error(s). Nothing written.`)
    process.exit(1)
  }

  const orphans = findOrphans()
  for (const orphan of orphans) {
    console.log(`orphaned output (not removed): ${orphan}`)
  }

  if (check) {
    const stale = outputs.filter((file) => {
      const existing = existsSync(file.path) ? readFileSync(file.path, 'utf8') : undefined
      return existing !== file.content
    })
    if (stale.length > 0) {
      console.error(`\n--check failed: ${stale.length} file(s) differ from what is on disk:`)
      for (const file of stale.slice(0, 20)) console.error(`  ${relative(REPO_ROOT, file.path)}`)
      process.exit(1)
    }
    console.log(`\n--check passed: all ${outputs.length} outputs match what is on disk.`)
    return
  }

  const { written, unchanged } = write()
  console.log(
    `\nWrote ${written} file(s), ${unchanged} unchanged, ${outputs.length} total under ${relative(REPO_ROOT, OUT_ROOT)}${sep}`,
  )
}

// Not top-level await: package.json has no "type": "module", so tsx compiles this as CJS.
main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
