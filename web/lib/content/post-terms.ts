/**
 * A post's own terms, resolved to links.
 *
 * Deliberately pure and synchronous — it never reads the term index. A post page shows which
 * terms it carries, not how many other posts share them, so nothing here needs the grouped
 * membership that `lib/content/terms.ts` builds. That keeps this callable from
 * `blog-posts.ts`, which runs on essentially every route via the footer's recent-posts block.
 *
 * The mapping itself is the one the author byline already does inline at
 * `blog-post.ts`: slugify for the URL, title-case for the label. It lives here because two
 * readers now need it, and a term whose pill text disagreed with the heading of the page it
 * opens would look like a broken link even though it resolves.
 */

import {
  slugifyTerm,
  taxonomyPermalink,
  titleCaseTerm,
  type Locale,
  type TaxonomyKind,
} from '@/lib/permalink'

export interface TermLink {
  /** The term as its page heads itself — `sonum fest` renders "Sonum Fest". */
  label: string
  href: string
  /** Its URL form, and the identity two spellings of one term collapse onto. */
  slug: string
}

/**
 * Resolve raw frontmatter terms into links, in the order the post lists them.
 *
 * Two filters, both mirroring `deriveTerms` in `site-index.ts` so a pill can never point at a
 * page that was not generated:
 *
 *   - A term that slugifies to nothing is skipped. `slugifyTerm` drops everything outside
 *     `\p{L}\p{N}_.-`, so a term of pure punctuation yields an empty string and no page.
 *   - Terms are deduped by slug, not by string. Slugging case-folds, so a post carrying both
 *     "Quebec" and "quebec" has one term page, and rendering two pills would give it two
 *     identical links. The first spelling wins, matching how `deriveTerms` picks the display
 *     term for the page itself.
 */
export function termLinks(
  taxonomy: TaxonomyKind,
  terms: readonly string[],
  locale: Locale,
): TermLink[] {
  const bySlug = new Map<string, TermLink>()

  for (const term of terms) {
    const slug = slugifyTerm(term)
    if (!slug || bySlug.has(slug)) continue

    bySlug.set(slug, {
      label: titleCaseTerm(term),
      href: taxonomyPermalink(taxonomy, slug, locale),
      slug,
    })
  }

  return [...bySlug.values()]
}
