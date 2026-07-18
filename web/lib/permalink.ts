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

function localePrefix(locale: Locale): string {
  // French is the default language and has no prefix.
  return locale === 'en' ? '/en' : ''
}

export function blogPermalink(date: UrlDate, slug: string, locale: Locale): string {
  return `${localePrefix(locale)}/blog/${date.year}/${date.month}/${date.day}/${slug}/`
}

/** `relPath` is the source path without extension, e.g. "contact" or "photos/portraits". */
export function pagePermalink(relPath: string, locale: Locale): string {
  return `${localePrefix(locale)}/${relPath.toLowerCase()}/`
}

/** Output directory name for a post: `YYYY-MM-DD-slug`. */
export function blogFolderName(date: UrlDate, slug: string): string {
  return `${date.year}-${date.month}-${date.day}-${slug}`
}
