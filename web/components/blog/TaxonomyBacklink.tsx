/**
 * The link from a term page back to its taxonomy hub.
 *
 * New work — there is no Hugo template behind it. The theme's sidebar carried the tag and
 * category widgets on every list and single page, and they were the only site-wide link path
 * to the 129 term pages; the port drops the sidebar (docs/blog-port.md). `PostTerms` restored
 * the post → term half of that path. This is the other half: without it a term page offers a
 * heading, a list and a pager, and a reader arriving from search has no way to reach the other
 * 102 tags.
 *
 * **The label is localised**, unlike the hub's own heading. Those headings are deliberately
 * left in English on the French pages because Hugo titles a taxonomy page from the plural key
 * in `[taxonomies]` and the resulting `<h1>`/`<title>` are indexed (see
 * `lib/pages/taxonomy-list.tsx`). That rule is about reproducing indexed head tags; this is
 * body copy and touches none. `Widgets.categoriesTitle` is already localised and already used
 * as an aria-label by `PostTerms`, so the precedent is on this side.
 *
 * Three keys rather than one string with a `{taxonomy}` placeholder: French agreement differs
 * per taxonomy — "tous les tags" but "toutes les catégories" — and no ICU select on the noun
 * would be shorter than just writing the three phrases out.
 *
 * `SlashSafeLink` rather than `Link`. A hub href has no dotted segment so `<Link>` would in
 * fact leave it alone, but every taxonomy href on this site goes through `SlashSafeLink` and
 * making this the one exception is how the next dotted URL gets missed.
 */

import { SlashSafeLink } from '@/components/chrome/slash-safe-link'
import { taxonomyListPermalink, type Locale, type TaxonomyKind } from '@/lib/permalink'
import { getT } from '@/lib/translate'
import styles from './taxonomy-backlink.module.css'

const LABEL_KEY = {
  tags: 'allTags',
  categories: 'allCategories',
  authors: 'allAuthors',
} as const satisfies Record<TaxonomyKind, string>

export function TaxonomyBacklink({
  taxonomy,
  locale,
}: {
  taxonomy: TaxonomyKind
  locale: Locale
}) {
  const t = getT(locale, 'Widgets')

  return (
    <p className={styles.wrap}>
      {/* `&larr;` lives in the JSX, not in the message value, matching `Pager`. */}
      <SlashSafeLink href={taxonomyListPermalink(taxonomy, locale)} className={styles.backlink}>
        &larr; {t(LABEL_KEY[taxonomy])}
      </SlashSafeLink>
    </p>
  )
}
