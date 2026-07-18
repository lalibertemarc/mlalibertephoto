/**
 * Build the intrinsic-dimension manifest that lets images reserve their space.
 *
 * The problem this solves: `next/image` needs `width` and `height` (or `fill`) to reserve
 * a box before the bytes arrive, and the migrated content cannot supply them. Of the ~230
 * `<ImageModal>` calls, the `width` prop is a CSS string ("500px") on about 150 and absent
 * on the rest, `height` appears exactly 6 times, and gallery images declare neither. A CSS
 * width alone does not give an aspect ratio, so the browser cannot know the height and the
 * page reflows on every image load.
 *
 * So the real pixel dimensions are fetched once, here, and committed as JSON. Builds then
 * stay entirely offline — this script is run by hand when content adds new images, not as
 * part of `next build`.
 *
 * Usage:
 *   npx tsx scripts/fetch-image-dimensions.ts          # only fetch URLs missing from the manifest
 *   npx tsx scripts/fetch-image-dimensions.ts --all    # re-fetch everything
 */

import { readFile, readdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import imageSize from 'image-size'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = path.resolve(HERE, '..')
const CONTENT_DIR = path.join(WEB_ROOT, 'content')
const STATIC_IMG_DIR = path.resolve(WEB_ROOT, '..', 'static', 'img')
const MANIFEST = path.join(WEB_ROOT, 'lib', 'image-dimensions.json')

/** How many images to resolve at once. Cloudinary is fine with this; be polite anyway. */
const CONCURRENCY = 8

export interface Dimensions {
  w: number
  h: number
}

export type DimensionManifest = Record<string, Dimensions>

/**
 * Every prop across the five MDX components whose value is an image URL.
 * `src` covers ImageModal, `before`/`after` cover BeforeAfter.
 */
const IMAGE_PROPS = ['src', 'before', 'after']

const CLOUDINARY_UPLOAD = '/image/upload/'

async function collectMdxFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const out: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await collectMdxFiles(full)))
    else if (entry.name.endsWith('.mdx')) out.push(full)
  }
  return out
}

async function collectUrls(): Promise<string[]> {
  const files = await collectMdxFiles(CONTENT_DIR)
  const pattern = new RegExp(`\\b(?:${IMAGE_PROPS.join('|')})=\\{"([^"]+)"\\}`, 'g')
  const urls = new Set<string>()

  for (const file of files) {
    const body = await readFile(file, 'utf8')
    for (const match of body.matchAll(pattern)) {
      if (match[1]) urls.add(match[1])
    }
  }
  return [...urls].sort()
}

/**
 * Cloudinary answers `fl_getinfo` with the source image's metadata as JSON, which avoids
 * downloading the image itself — a few hundred bytes instead of a few hundred kilobytes
 * per URL. `input` is the original asset; `output` would describe the transformed variant,
 * which is not what we want since the transform is chosen per-request by the loader.
 */
async function cloudinaryDimensions(url: string): Promise<Dimensions> {
  const at = url.indexOf(CLOUDINARY_UPLOAD)
  const probe = `${url.slice(0, at + CLOUDINARY_UPLOAD.length)}fl_getinfo/${url.slice(at + CLOUDINARY_UPLOAD.length)}`

  const response = await fetch(probe)
  if (!response.ok) throw new Error(`fl_getinfo returned ${response.status}`)

  const info = (await response.json()) as { input?: { width?: number; height?: number } }
  const w = info.input?.width
  const h = info.input?.height
  if (typeof w !== 'number' || typeof h !== 'number') {
    throw new Error(`fl_getinfo gave no input dimensions: ${JSON.stringify(info)}`)
  }
  return { w, h }
}

/**
 * Everything else — the three third-party editorial images and any local `/img/*` file —
 * is measured with `image-size`, which reads dimensions out of the file header and so only
 * needs the leading bytes rather than the whole image.
 */
async function remoteDimensions(url: string): Promise<Dimensions> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`GET returned ${response.status}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  const { width, height } = imageSize(bytes)
  if (!width || !height) throw new Error('image-size could not read dimensions')
  return { w: width, h: height }
}

async function localDimensions(url: string): Promise<Dimensions> {
  // `/img/foo.jpg` is served from the Hugo site's static/img until the assets move.
  const file = path.join(STATIC_IMG_DIR, url.replace(/^\/img\//, ''))
  if (!existsSync(file)) throw new Error(`local file not found: ${file}`)
  const { width, height } = imageSize(await readFile(file))
  if (!width || !height) throw new Error('image-size could not read dimensions')
  return { w: width, h: height }
}

function resolve(url: string): Promise<Dimensions> {
  if (url.startsWith('https://res.cloudinary.com/') && url.includes(CLOUDINARY_UPLOAD)) {
    return cloudinaryDimensions(url)
  }
  if (url.startsWith('/img/')) return localDimensions(url)
  return remoteDimensions(url)
}

async function main(): Promise<void> {
  const refetchAll = process.argv.includes('--all')

  const existing: DimensionManifest =
    !refetchAll && existsSync(MANIFEST)
      ? (JSON.parse(await readFile(MANIFEST, 'utf8')) as DimensionManifest)
      : {}

  const urls = await collectUrls()
  const todo = urls.filter((url) => existing[url] === undefined)

  console.log(`${urls.length} image URLs in content, ${todo.length} to resolve`)

  const result: DimensionManifest = { ...existing }
  const failures: { url: string; reason: string }[] = []
  let done = 0

  // A fixed pool of workers pulling from one shared cursor: simpler than batching, and it
  // keeps all lanes busy instead of stalling each batch on its slowest request.
  let cursor = 0
  async function worker(): Promise<void> {
    while (cursor < todo.length) {
      const url = todo[cursor++]
      if (url === undefined) return
      try {
        result[url] = await resolve(url)
      } catch (error) {
        failures.push({ url, reason: error instanceof Error ? error.message : String(error) })
      }
      done += 1
      if (done % 25 === 0) console.log(`  ${done}/${todo.length}`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  // Sorted keys so the committed file produces a readable diff when content adds images,
  // rather than reordering on every run.
  const sorted: DimensionManifest = {}
  for (const url of Object.keys(result).sort()) {
    const dims = result[url]
    if (dims) sorted[url] = dims
  }

  await writeFile(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8')
  console.log(`wrote ${Object.keys(sorted).length} entries to ${path.relative(WEB_ROOT, MANIFEST)}`)

  if (failures.length > 0) {
    console.error(`\n${failures.length} failed:`)
    for (const failure of failures) console.error(`  ${failure.url}\n    ${failure.reason}`)
    process.exitCode = 1
  }
}

await main()
