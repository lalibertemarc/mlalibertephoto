/**
 * Where the same page lives in the other language.
 *
 * The migrated corpus is fully symmetric: every one of the 85 content paths exists as both
 * `fr.mdx` and `en.mdx`, and `scripts/migrate-content.ts` hard-errors on any English file
 * without a French twin. Slugs never diverge either — `slugFromFilename` is
 * `basename.toLowerCase()` and the filenames are identical across languages. So for
 * content, swapping the locale prefix is not an approximation; it is exactly what Hugo's
 * `.Translations` resolves to.
 *
 * Taxonomy is where that stops being true, which is why this returns `null` rather than a
 * best guess. Hugo generates `/tags/<term>/` from the term *string*, and the terms are
 * translated with the posts: `/tags/paruline-flamboyante/` and
 * `/en/tags/american-redstart/` are the same tag on the same post. A prefix swap there
 * produces a URL that has never existed. netlify.toml:227 carries a redirect for exactly
 * that pair, so this is observed behaviour, not a hypothetical.
 *
 * Mapping those terms needs a FR↔EN table derived from post membership, which the content
 * migration never produced — taxonomy is not represented under `web/content/` at all.
 * Until that exists, taxonomy paths report "unknown" and the caller decides what to do.
 * Returning the target homepage from here instead would erase the distinction between
 * "this page has no counterpart" and "its counterpart is the homepage".
 */

import { localePrefix, type Locale } from './permalink'

/**
 * Hugo's `[taxonomies]` in hugo.toml, plus their list pages. Term slugs are per-language
 * vocabulary, so no structural mapping between locales exists for anything beneath these.
 */
const UNMAPPED_SECTIONS = ['/tags/', '/categories/', '/authors/']

/** Strip the locale prefix, yielding a path that is the same in both trees. */
function toNeutralPath(pathname: string): string {
  if (pathname === '/en' || pathname === '/en/') return '/'
  if (pathname.startsWith('/en/')) return pathname.slice('/en'.length)
  return pathname
}

/**
 * The `target`-locale URL for the page at `pathname`, or `null` when no counterpart can be
 * derived. `pathname` may belong to either locale.
 */
export function resolveCounterpart(pathname: string, target: Locale): string | null {
  const neutral = toNeutralPath(pathname)

  if (UNMAPPED_SECTIONS.some((section) => neutral.startsWith(section))) {
    return null
  }

  return `${localePrefix(target)}${neutral}`
}
