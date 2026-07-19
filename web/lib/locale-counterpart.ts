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
 * Taxonomy pairs the same way, which this module previously assumed it did not. The concern
 * was that terms are translated with their posts, so `/tags/paruline-flamboyante/` and
 * `/en/tags/american-redstart/` would name one tag under two slugs that no string transform
 * relates. That was true once — netlify.toml:227 still redirects that exact pair — but it is
 * not true of the corpus as it stands: `tags` and `categories` live in each post's shared
 * `meta.json`, one array serving both languages, and `migrate-content.ts` hard-errors if the
 * two source trees disagree. Verified directly: `redstart.md` reads
 * `tags = ["american redstart"]` in *both* trees, and every term directory in a real build
 * appears identically under `/tags/` and `/en/tags/`. So the redirect is a historical
 * artifact of a vocabulary that has since been unified, not evidence of a live gap.
 *
 * `null` remains reachable and is kept deliberately: it distinguishes "this page has no
 * counterpart" from "its counterpart is the homepage", which a fallback would erase. It just
 * no longer applies to taxonomy.
 */

import { localePrefix, type Locale } from './permalink'

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
  if (!pathname.startsWith('/')) return null

  return `${localePrefix(target)}${toNeutralPath(pathname)}`
}
