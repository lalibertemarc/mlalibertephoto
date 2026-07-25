/**
 * Every content file, parsed through its schema, with all failures reported at once.
 *
 * Runs as part of `prebuild`, so a malformed `meta.json` or frontmatter fails `npm run build`
 * before Next starts rather than rendering a blank page or a wrong one. That gate matters
 * most for content authored through Claude rather than by hand: a machine-checkable contract
 * beats a convention nobody re-reads.
 *
 * `strictObject` throughout means an unrecognised key is an error, not something to drop —
 * a key this pipeline does not understand is new information that would otherwise be lost in
 * silence. See `lib/schema.ts`.
 *
 * ## Why this is a separate pass
 *
 * `scripts/build-seo-files.ts` already reads the whole corpus through the same schemas, so a
 * bad post fails the build with or without this file. Two things it does not do:
 *
 * - It stops at the first failure. `Promise.all` rejects on one rejection, so a run that
 *   broke six posts reports one, and fixing it reveals the next. This collects all six.
 * - It never reads `content/data/*.json`, which reaches a schema only when the homepage
 *   renders — deep inside `next build`, where the failure arrives as a React error.
 *
 * The cost is re-reading ~250 small files, tens of milliseconds against a `next build`
 * measured in tens of seconds. The alternative — a `collectAll` flag on `loadSiteIndex()` —
 * saves that but makes "is the content valid" a side effect of "emit the sitemap".
 *
 * MDX *bodies* are not compiled here. `migrate-content.ts` already gates on compilation, and
 * `next build` executes every body immediately afterwards; doing it a third time would be the
 * slowest check in the chain and the least likely to find anything.
 *
 * Usage:
 *   npx tsx scripts/validate-content.ts
 */

import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseYaml } from 'yaml'
import type { z } from 'zod'
import { splitMdxFrontmatter } from '../lib/content/mdx'
import { ContentValidationError, displayPath, parseContentFile } from '../lib/content/parse'
import type { Locale } from '../lib/permalink'
import {
  BlogMetaSchema,
  CarouselSlideSchema,
  FeatureSchema,
  MdxFrontmatterSchema,
  PageMetaSchema,
  TestimonialSchema,
} from '../lib/schema'
import { MigrationReport } from './lib/report'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = path.resolve(HERE, '..', 'content')

const LOCALES: readonly Locale[] = ['fr', 'en']

/**
 * Run one check, turning a schema failure into a finding instead of a crash.
 *
 * Only `ContentValidationError` is caught. A missing file or malformed JSON is a different
 * class of problem — the corpus is generated, so either means the migration did not finish —
 * and is left to crash with its stack intact, exactly as `migrate-content.ts` treats anything
 * that is not a `MigrationError`.
 */
async function check(report: MigrationReport, run: () => Promise<void>): Promise<void> {
  try {
    await run()
  } catch (error) {
    if (!(error instanceof ContentValidationError)) throw error
    for (const issue of error.issues) report.error('schema', issue, error.file)
  }
}

/** Each of these returns the number of files it read, so the summary counts rather than assumes. */
async function checkJson<S extends z.ZodType>(
  report: MigrationReport,
  file: string,
  schema: S,
): Promise<number> {
  await check(report, async () => {
    parseContentFile(schema, JSON.parse(await readFile(file, 'utf8')) as unknown, file)
  })
  return 1
}

/** Both locales' frontmatter for one content folder. */
async function checkMdx(report: MigrationReport, dir: string): Promise<number> {
  for (const locale of LOCALES) {
    const file = path.join(dir, `${locale}.mdx`)
    await check(report, async () => {
      const parts = splitMdxFrontmatter(await readFile(file, 'utf8'))
      if (!parts) {
        throw new ContentValidationError(displayPath(file), ['no frontmatter block'])
      }
      parseContentFile(MdxFrontmatterSchema, parseYaml(parts.frontmatter), file)
    })
  }
  return LOCALES.length
}

async function blogDirs(): Promise<string[]> {
  const dir = path.join(CONTENT_DIR, 'blog')
  const entries = await readdir(dir, { withFileTypes: true })
  return entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(dir, entry.name))
}

/** `content/pages` nests (`photos/portraits`), so recurse to any depth. */
async function pageDirs(dir = path.join(CONTENT_DIR, 'pages')): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const found: string[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const child = path.join(dir, entry.name)
    if ((await readdir(child)).includes('meta.json')) found.push(child)
    found.push(...(await pageDirs(child)))
  }

  return found
}

async function main(): Promise<void> {
  const report = new MigrationReport()
  const [posts, pages] = await Promise.all([blogDirs(), pageDirs()])
  let files = 0

  for (const dir of posts) {
    files += await checkJson(report, path.join(dir, 'meta.json'), BlogMetaSchema)
    files += await checkMdx(report, dir)
  }

  for (const dir of pages) {
    files += await checkJson(report, path.join(dir, 'meta.json'), PageMetaSchema)
    files += await checkMdx(report, dir)
  }

  const dataDir = path.join(CONTENT_DIR, 'data')
  const data = {
    'carousel.json': CarouselSlideSchema.array(),
    'features.json': FeatureSchema.array(),
    'testimonials.json': TestimonialSchema.array(),
  }
  for (const [name, schema] of Object.entries(data)) {
    files += await checkJson(report, path.join(dataDir, name), schema)
  }

  console.log(
    `Validated ${posts.length} posts, ${pages.length} pages, ` +
      `${Object.keys(data).length} data sets — ${files} files.`,
  )

  if (report.hasErrors) {
    console.error(report.summarize())
    console.error(`\n${report.count('error')} content error(s). Build stopped.`)
    process.exit(1)
  }

  if (report.count('warning') > 0) console.warn(report.summarize())
}

await main()
