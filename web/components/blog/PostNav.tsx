/**
 * Links to the posts either side of this one, at the foot of a post page.
 *
 * New work — Hugo's `single.html` has no prev/next, so unlike almost everything else on this
 * surface there is no original to reproduce. Two consequences of that freedom, both chosen
 * rather than inherited:
 *
 *   - **Each link shows the neighbour's title**, not just a direction word. `Pager` can get
 *     away with a bare "Ancien →" because the destination is more of the list you are already
 *     looking at; here the destination is a specific post, and its title is the only thing
 *     that tells a reader whether to follow.
 *   - **A missing neighbour is omitted, not disabled.** `Pager` renders an inert `<span>` at
 *     the ends, reproducing Hugo's pager, which emits both controls unconditionally. There is
 *     no such contract here, and a dead control at the end of the archive is worse than an
 *     empty grid cell.
 *
 * Labels reuse `Blog.newer` / `Blog.older`, already in both message files and already used by
 * `Pager` — "Récent"/"Ancien" and "Newer"/"Older". Newer on the left, older on the right,
 * matching the pager's orientation so the two never disagree about which way time runs.
 *
 * A plain `next/link` is correct here, unlike the taxonomy pills: a post permalink ends in a
 * slug that contains no dot, so `<Link>` has nothing to mistake for a file extension and the
 * trailing slash survives. See `components/chrome/slash-safe-link.tsx` for when it does not.
 */

import Link from 'next/link'
import type { BlogPostSummary } from '@/lib/content/blog-posts'
import type { Locale } from '@/lib/permalink'
import { getT } from '@/lib/translate'
import styles from './post-nav.module.css'

export interface PostNavProps {
  newer: BlogPostSummary | undefined
  older: BlogPostSummary | undefined
  locale: Locale
}

export function PostNav({ newer, older, locale }: PostNavProps) {
  // A one-post archive has neither neighbour. Not reachable with 77 posts, but rendering an
  // empty bordered row would be a visible defect if it ever were.
  if (!newer && !older) return null

  const t = getT(locale, 'Blog')

  return (
    <nav className={styles.nav} aria-label={t('postNavigation')}>
      {newer && (
        <Link href={newer.href} className={styles.link} rel="prev">
          <span className={styles.direction}>&larr; {t('newer')}</span>
          <span className={styles.title}>{newer.title}</span>
        </Link>
      )}
      {older && (
        <Link href={older.href} className={`${styles.link} ${styles.older}`} rel="next">
          <span className={styles.direction}>{t('older')} &rarr;</span>
          <span className={styles.title}>{older.title}</span>
        </Link>
      )}
    </nav>
  )
}
