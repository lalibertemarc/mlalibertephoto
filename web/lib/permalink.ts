/**
 * URL derivation for migrated content.
 *
 * This module is the single implementation of the site's URL contract. It lives in
 * `lib/` rather than alongside the migration script specifically so the routing work
 * imports the same functions instead of reimplementing them — if the migration and the
 * app derive URLs separately, they can drift, and a drifted URL is a dead indexed page.
 *
 * Hugo's contract, from config/_default/permalinks.toml:
 *
 *     blog = "/blog/:year/:month/:day/:filename/"
 *
 * Non-blog pages have no permalink override and mirror their source path.
 */

export type Locale = 'fr' | 'en'

/** Y/M/D as literal strings. Deliberately not a Date — see `urlDateFromRawDate`. */
export interface UrlDate {
  year: string
  month: string
  day: string
}

const RAW_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/

/**
 * Take the Y/M/D that Hugo puts in the URL out of a raw frontmatter date string.
 *
 * This reads the literal `YYYY-MM-DD` prefix and never constructs a Date. That is
 * load-bearing, not stylistic. Frontmatter dates carry offsets (-04:00 / -05:00), and
 * Hugo's :year/:month/:day tokens use the date *as written in that offset*, not its UTC
 * equivalent. `motherRockersValentinesDayPart2` is 2026-03-02T…-05:00, whose UTC date is
 * 2026-03-03, but whose live URL is /blog/2026/03/02/. Any round-trip through a Date
 * object — `new Date(raw).toISOString().slice(0, 10)` being the obvious one — silently
 * moves that post to a URL that has never existed.
 */
export function urlDateFromRawDate(raw: string): UrlDate {
  const m = RAW_DATE_PREFIX.exec(raw)
  if (!m || m[1] === undefined || m[2] === undefined || m[3] === undefined) {
    throw new Error(`Date does not start with YYYY-MM-DD: ${JSON.stringify(raw)}`)
  }
  return { year: m[1], month: m[2], day: m[3] }
}

/**
 * Hugo's `:filename` token lowercases the source basename and does nothing else.
 *
 * Verified against all 154 blog files: 41 of the 77 names are camelCase, and none contain
 * spaces, accents or punctuation, so lowercasing alone reproduces every live slug. If a
 * future filename does contain such characters this will silently disagree with Hugo, so
 * the migration also cross-checks every derived URL against `hugo list all`.
 */
export function slugFromFilename(basenameNoExt: string): string {
  return basenameNoExt.toLowerCase()
}

export function localePrefix(locale: Locale): string {
  // French is the default language and has no prefix.
  return locale === 'en' ? '/en' : ''
}

/**
 * Prefix an already locale-relative path that carries leading and trailing slashes.
 *
 * Chrome links — the nav, the home link, the language switcher — need the locale prefix
 * too, but are not derived from migrated content, so they cannot go through
 * `pagePermalink`. Routing them here keeps this module the only place that knows the
 * prefix is the string `/en`, which is what stops a nav link and a content link from
 * ever disagreeing about where a page lives.
 *
 * `localeHref('/', 'en')` is `/en/`, so the home case needs no special branch.
 */
export function localeHref(path: string, locale: Locale): string {
  if (!path.startsWith('/') || !path.endsWith('/')) {
    throw new Error(`localeHref needs a leading and trailing slash: ${JSON.stringify(path)}`)
  }
  return `${localePrefix(locale)}${path}`
}

export function blogPermalink(date: UrlDate, slug: string, locale: Locale): string {
  return localeHref(`/blog/${date.year}/${date.month}/${date.day}/${slug}/`, locale)
}

/** `relPath` is the source path without extension, e.g. "contact" or "photos/portraits". */
export function pagePermalink(relPath: string, locale: Locale): string {
  return localeHref(`/${relPath.toLowerCase()}/`, locale)
}

/** Output directory name for a post: `YYYY-MM-DD-slug`. */
export function blogFolderName(date: UrlDate, slug: string): string {
  return `${date.year}-${date.month}-${date.day}-${slug}`
}

/** Hugo's `[taxonomies]` in hugo.toml, singular key to plural URL segment. */
export type TaxonomyKind = 'tags' | 'categories' | 'authors'

export const TAXONOMY_KINDS: readonly TaxonomyKind[] = ['tags', 'categories', 'authors']

/**
 * Hugo's URL form of a taxonomy term.
 *
 * Verified by diffing this against every term directory in a real build rather than derived
 * from Hugo's `urlize` source, which is why the rules look arbitrary — they are:
 *
 *   "Prohibition5"              -> prohibition5
 *   "LR/Mogrify 2"              -> lr/mogrify-2      (a slash makes a two-segment path)
 *   "Marc Laliberté"            -> marc-laliberté    (accented letters kept)
 *   "Île d'Orléans"             -> île-dorléans      (apostrophe deleted, not hyphenated)
 *   "Sigma 24-70mm F2.8 DG"     -> sigma-24-70mm-f2.8-dg   (hyphens and dots kept)
 *   "E 70–350mm F4.5–6.3 G OSS" -> e-70350mm-f4.56.3-g-oss
 *
 * That last one is the trap. A plain hyphen is preserved, but an en-dash (U+2013) is
 * stripped with no replacement, merging the digits either side of it. The corpus also
 * contains a non-breaking hyphen (U+2011), which strips the same way. Neither is visually
 * distinguishable from a hyphen in an editor.
 *
 * Case-folding means terms differing only in case collapse together — "Quebec"/"quebec" and
 * "Sonum Fest"/"sonum fest" each produce one page, exactly as they do in Hugo.
 */
export function slugifyTerm(term: string): string {
  return term
    .toLowerCase()
    .split('/')
    .map((segment) =>
      segment
        .normalize('NFC')
        .replace(/['’]/g, '')
        .replace(/\s+/g, '-')
        // Keeps letters (including accented), digits, underscore, dot and hyphen. Everything
        // else — en-dashes, non-breaking hyphens, punctuation — is dropped outright.
        .replace(/[^\p{L}\p{N}_.\-]/gu, '')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, ''),
    )
    .filter(Boolean)
    .join('/')
}

/**
 * A term as Hugo titles its page.
 *
 * Hugo does not display the frontmatter spelling: `wildlife` heads its page as "Wildlife" and
 * `sonum fest` as "Sonum Fest". 99 of the 129 terms differ from their raw string, so using the
 * raw value would change nearly every taxonomy heading and `<title>` on the site.
 *
 * Every letter following a non-alphanumeric character is capitalised, apostrophes and hyphens
 * included — `Île d'Orléans` becomes `Île D'Orléans`, `black-bird` becomes `Black-Bird`. Those
 * two look like defects and are what Hugo actually renders.
 *
 * Hugo's default `titleCaseStyle` is AP, which lowercases a list of short English words in
 * medial position. That rule cannot be distinguished from this one on the current corpus:
 * both reproduce all 129 headings exactly, because no term contains an English stop word
 * anywhere but the first position. The simpler rule is used, and a term like "birds of prey"
 * is the case that would tell them apart — it would render "Birds Of Prey" here and "Birds of
 * Prey" in Hugo.
 */
export function titleCaseTerm(term: string): string {
  return term.replace(/(^|[^\p{L}\p{N}'’]|['’])(\p{L})/gu, (_, boundary: string, letter: string) =>
    boundary + letter.toLocaleUpperCase(),
  )
}

export function taxonomyPermalink(kind: TaxonomyKind, slug: string, locale: Locale): string {
  return localeHref(`/${kind}/${slug}/`, locale)
}

export function taxonomyListPermalink(kind: TaxonomyKind, locale: Locale): string {
  return localeHref(`/${kind}/`, locale)
}
