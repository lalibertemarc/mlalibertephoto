/**
 * The muted author/date line above a post body.
 *
 * Ports the *rendered output* of single.html:44-58, not its control flow. That template
 * carries a quirk worth stating, because reproducing the template literally would produce
 * something different from what the site actually serves:
 *
 *   - The block is gated on `.Params.author OR .Params.date`, but the author names it renders
 *     come from `.Params.authors` (plural). No post sets the singular `author`, so the gate
 *     passes on `date` alone.
 *   - The ` | ` separator between author and date is gated on `.Params.author AND
 *     .Params.date` — the singular again. It is therefore unreachable and has never rendered.
 *
 * Verified against the built site: `Par Marc Laliberté 29 octobre, 2025` and
 * `By Marc Laliberté 29 October, 2025`. Author linked, date plain, no separator.
 *
 * Multiple authors are comma-joined, matching the template's `{{ if $index }}, {{ end }}`.
 * Every post in the corpus has exactly one, but the schema permits more.
 */

import Link from 'next/link'
import type { BylineAuthor } from '@/lib/content/blog-post'
import type { Locale } from '@/lib/permalink'
import { getT } from '@/lib/translate'
import styles from './post.module.css'

export interface PostBylineProps {
  authors: BylineAuthor[]
  /** Already formatted and localised — `BlogPost.displayDate`. */
  displayDate: string
  locale: Locale
}

export function PostByline({ authors, displayDate, locale }: PostBylineProps) {
  const t = getT(locale, 'Blog')

  return (
    <p className={styles.meta}>
      {authors.length > 0 && (
        <>
          {t('authorBy')}{' '}
          {authors.map((author, index) => (
            <span key={author.href}>
              {index > 0 && ', '}
              <Link href={author.href} className={styles.metaLink}>
                {author.name}
              </Link>
            </span>
          ))}{' '}
        </>
      )}
      {displayDate}
    </p>
  )
}
