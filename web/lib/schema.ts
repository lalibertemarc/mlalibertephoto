import { z } from 'zod'

/**
 * Runtime contract for all migrated content.
 *
 * `scripts/migrate-content.ts` validates every object against these before writing, and
 * the build-time validation work item imports them rather than redeclaring. Anything that
 * parses here is safe for the app to consume.
 *
 * Every schema is strict: an unrecognised key is an error, not something to drop quietly.
 * The source content is hand-authored and still changing on master, so a key this pipeline
 * does not understand means new information that would otherwise be lost in silence.
 */

/**
 * Dates are strings end to end, and no schema here uses `z.date()` or `z.coerce.date()`.
 *
 * The URL's Y/M/D must be the date as written in its own offset, not its UTC equivalent
 * (see `lib/permalink.ts`). Never producing a Date means no downstream consumer has a value
 * they could accidentally normalise.
 */
export const RawDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:\d{2}|Z)$/)

export const UrlDateSchema = z.strictObject({
  year: z.string().regex(/^\d{4}$/),
  month: z.string().regex(/^\d{2}$/),
  day: z.string().regex(/^\d{2}$/),
})

export const PermalinkPairSchema = z.strictObject({
  fr: z.string().startsWith('/').endsWith('/'),
  en: z.string().startsWith('/').endsWith('/'),
})

/**
 * One banner shape for both source conventions.
 *
 * Hugo had two: 46 posts declared a Cloudinary URL with explicit dimensions, 31 pointed at
 * a local file and let Hugo's imageConfig measure it. Both collapse here, so nothing
 * downstream needs to know there was ever a difference.
 *
 * Optional on the post because four posts reference local files that no longer exist. Those
 * banners are already broken in production; the migration reports them and emits no banner
 * rather than inventing dimensions.
 *
 * `alt` is optional because only the Cloudinary convention carried `banner_alt`.
 */
export const BannerSchema = z.strictObject({
  src: z.string().min(1),
  alt: z.string().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})

/** `meta.json` for a blog post — everything both languages share. */
export const BlogMetaSchema = z.strictObject({
  slug: z.string().min(1),
  date: RawDateSchema,
  urlDate: UrlDateSchema,
  permalink: PermalinkPairSchema,
  tags: z.array(z.string()),
  categories: z.array(z.string()),
  authors: z.array(z.string()).min(1),
  banner: BannerSchema.optional(),
})

/** `meta.json` for a non-blog page. */
export const PageMetaSchema = z.strictObject({
  /** Source-relative path without extension, e.g. "photos/portraits". Mirrors the URL. */
  path: z.string().min(1),
  permalink: PermalinkPairSchema,
  pageClass: z.string().optional(),
  noindex: z.boolean().optional(),
  id: z.string().optional(),
  date: RawDateSchema.optional(),
})

/**
 * Frontmatter of `fr.mdx` / `en.mdx` — only what genuinely differs per language.
 * Everything shared lives in meta.json exactly once.
 */
export const MdxFrontmatterSchema = z.strictObject({
  title: z.string().min(1),
  description: z.string(),
  meta_title: z.string().optional(),
  keywords: z.array(z.string()).optional(),
})

/** Localised string pair, matching the `key: {fr, en}` convention in data/*.yaml. */
export const LangPairSchema = z.strictObject({
  fr: z.string(),
  en: z.string(),
})

export const CarouselSlideSchema = z.strictObject({
  weight: z.number(),
  title: LangPairSchema,
  contactText: LangPairSchema,
  /** Raw HTML (a `<ul>` list), rendered through Hugo's safeHTML — not markdown. */
  description: LangPairSchema,
  image: z.string(),
  alt: LangPairSchema,
  href: z.string(),
})

export const FeatureSchema = z.strictObject({
  weight: z.number(),
  name: LangPairSchema,
  icon: z.string(),
  /** Always empty in the source, but the template reads it via `with`, so it is a real optional. */
  url: z.string(),
  /** Markdown — the template runs it through markdownify, unlike the carousel's raw HTML. */
  description: LangPairSchema,
})

export const TestimonialSchema = z.strictObject({
  text: LangPairSchema,
  /** Not localised — the same string serves both languages. */
  name: z.string(),
  position: LangPairSchema,
  avatar: z.string(),
})

export type Locale = 'fr' | 'en'
export type UrlDate = z.infer<typeof UrlDateSchema>
export type PermalinkPair = z.infer<typeof PermalinkPairSchema>
export type Banner = z.infer<typeof BannerSchema>
export type BlogMeta = z.infer<typeof BlogMetaSchema>
export type PageMeta = z.infer<typeof PageMetaSchema>
export type MdxFrontmatter = z.infer<typeof MdxFrontmatterSchema>
export type CarouselSlide = z.infer<typeof CarouselSlideSchema>
export type Feature = z.infer<typeof FeatureSchema>
export type Testimonial = z.infer<typeof TestimonialSchema>
