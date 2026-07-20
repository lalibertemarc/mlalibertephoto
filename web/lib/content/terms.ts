/**
 * Taxonomy terms, for the routes that serve them.
 *
 * The single place `generateStaticParams`, `generateMetadata` and the term page itself read
 * terms from, so all three necessarily agree about which terms exist and what each is called.
 *
 * Terms are derived from post membership rather than stored. Nothing under `web/content/`
 * represents a tag: they live only as arrays on each post's shared `meta.json`, one array
 * serving both languages. Deriving them cannot drift from the posts; a generated file could.
 */

import type { TaxonomyKind } from '@/lib/permalink'
import { loadAllPostMeta } from './post-meta'
import { deriveTerms, type TermEntry } from './site-index'

let cached: Promise<TermEntry[]> | null = null

function loadTerms(): Promise<TermEntry[]> {
  cached ??= loadAllPostMeta().then((posts) => {
    const terms = deriveTerms(posts)
    assertNoPaginationCollision(terms)
    return terms
  })
  return cached
}

/**
 * A term slug must never end in `page/<n>`.
 *
 * The taxonomy routes are a single `[...slug]` catch-all that reads a trailing `page/N` off
 * the end of the segment array to decide which page it is on. A term whose own slug ended
 * that way would be silently misparsed as a paginated view of a shorter term.
 *
 * No such term exists — a slug only gains a `/` from a slash in the source string, and
 * `LR/Mogrify 2` is the only one in the corpus. This is here so that if a second ever
 * appears, the build says so instead of quietly serving the wrong page.
 */
function assertNoPaginationCollision(terms: readonly TermEntry[]): void {
  for (const term of terms) {
    const segments = term.slug.split('/')
    const [maybePage, maybeNumber] = segments.slice(-2)
    if (maybePage === 'page' && maybeNumber !== undefined && /^\d+$/.test(maybeNumber)) {
      throw new Error(
        `Term "${term.term}" slugifies to "${term.slug}", which collides with the ` +
          `pagination suffix the taxonomy routes parse. Rename the term.`,
      )
    }
  }
}

export async function getTermsByTaxonomy(taxonomy: TaxonomyKind): Promise<TermEntry[]> {
  const terms = await loadTerms()
  return terms
    .filter((term) => term.taxonomy === taxonomy)
    .sort((a, b) => a.slug.localeCompare(b.slug))
}

export async function getTerm(
  taxonomy: TaxonomyKind,
  slug: string,
): Promise<TermEntry | undefined> {
  const terms = await loadTerms()
  return terms.find((term) => term.taxonomy === taxonomy && term.slug === slug)
}
