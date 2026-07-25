/**
 * The term directory on a taxonomy hub.
 *
 * No Hugo source — `/tags/`, `/categories/` and `/authors/` render blank on the live site.
 * See `lib/pages/taxonomy-list.tsx` for why the port populates them.
 */

import { SlashSafeLink } from '@/components/chrome/slash-safe-link'
import type { TermEntry } from '@/lib/content/site-index'
import { titleCaseTerm, type Locale } from '@/lib/permalink'
import styles from './term-list.module.css'

export function TermList({
  terms,
  locale,
}: {
  terms: readonly TermEntry[]
  locale: Locale
}) {
  return (
    <ul className={styles.terms}>
      {terms.map((term) => (
        <li key={term.slug}>
          <SlashSafeLink href={term.permalink[locale]} className={styles.term}>
            {titleCaseTerm(term.term)}
            <span className={styles.count}>{term.members.length}</span>
          </SlashSafeLink>
        </li>
      ))}
    </ul>
  )
}
