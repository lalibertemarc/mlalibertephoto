/**
 * The term directory on a taxonomy hub.
 *
 * No Hugo source — `/tags/`, `/categories/` and `/authors/` render blank on the live site.
 * See `lib/pages/taxonomy-list.tsx` for why the port populates them.
 */

import Link from 'next/link'
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
          <Link href={term.permalink[locale]} className={styles.term}>
            {titleCaseTerm(term.term)}
            <span className={styles.count}>{term.members.length}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
