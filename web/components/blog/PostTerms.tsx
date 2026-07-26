/**
 * The tags and categories a post carries, as links to their term pages.
 *
 * New work — there is no Hugo template behind it. The theme put these in a sidebar the port
 * dropped (docs/blog-port.md), which left 258 term pages with no inbound link from any post.
 *
 * `SlashSafeLink`, not `Link`, and that is not optional: seven term slugs end in a dotted
 * segment (`/tags/fe-50mm-f1.8/`), and Next's `<Link>` reads a trailing dot-segment as a file
 * and strips the trailing slash, which then disagrees with the term page's own canonical and
 * with both sitemaps. `TermList` takes the same precaution on the hubs.
 *
 * The two groups are separate lists rather than one, so each can carry an `aria-label`. That
 * is what replaces the visible "Categories:" / "Tags:" labels: the distinction is styling to a
 * sighted reader, and a group name to a screen reader. The labels reuse `Widgets.*`, which the
 * dropped sidebar left behind in both message files.
 */

import { SlashSafeLink } from '@/components/chrome/slash-safe-link'
import type { TermLink } from '@/lib/content/post-terms'
import type { Locale } from '@/lib/permalink'
import { getT } from '@/lib/translate'
import styles from './post-terms.module.css'

export interface PostTermsProps {
  categories: readonly TermLink[]
  /** Omitted on cards, where the full tag list would out-weigh the title above it. */
  tags?: readonly TermLink[]
  locale: Locale
  /** `card` is the compact skin used inside a post-list row. */
  variant?: 'post' | 'card'
}

export function PostTerms({ categories, tags = [], locale, variant = 'post' }: PostTermsProps) {
  // A post may legitimately carry neither — the schema allows both arrays to be empty. Render
  // nothing rather than an empty flex row, which would still paint its top border.
  if (categories.length === 0 && tags.length === 0) return null

  const t = getT(locale, 'Widgets')
  const isCard = variant === 'card'
  const pill = `${styles.pill}${isCard ? ` ${styles.compact}` : ''}`

  return (
    <div className={isCard ? styles.cardGroups : styles.groups}>
      {categories.length > 0 && (
        <ul className={styles.list} aria-label={t('categoriesTitle')}>
          {categories.map((term) => (
            <li key={term.slug}>
              <SlashSafeLink href={term.href} className={`${pill} ${styles.category}`}>
                {term.label}
              </SlashSafeLink>
            </li>
          ))}
        </ul>
      )}
      {tags.length > 0 && (
        <ul className={styles.list} aria-label={t('tagsTitle')}>
          {tags.map((term) => (
            <li key={term.slug}>
              <SlashSafeLink href={term.href} className={`${pill} ${styles.tag}`}>
                {term.label}
              </SlashSafeLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
