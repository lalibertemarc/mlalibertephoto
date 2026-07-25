/**
 * The prev/next pager under a list page.
 *
 * Ports the theme's `<ul class="pager">` (`_default/list.html`), which is the whole of this
 * site's pagination UI: two controls, no page numbers, no ellipsis. Hugo renders the
 * unavailable direction as a disabled `<a href="#">`; a non-link is rendered as a `<span>`
 * here instead, since an anchor to `#` is a focusable control that goes nowhere.
 *
 * Labels are `newer`/`older` — "Récent"/"Ancien" and "Newer"/"Older" — which live in the
 * theme's i18n files, not the project's. Both are already in `messages/*.json`.
 */

import Link from 'next/link'
import type { PagerLinks } from '@/lib/pagination'
import type { Locale } from '@/lib/permalink'
import { getT } from '@/lib/translate'
import styles from './pager.module.css'

export function Pager({
  links,
  locale,
}: {
  links: PagerLinks
  locale: Locale
}) {
  const t = getT(locale, 'Blog')
  const { prevHref, nextHref } = links

  // Hugo emits the pager even when both directions are disabled — every single-page term page
  // carries one. Reproduced, so a term page with one page of posts looks the same as today.
  return (
    <nav className={styles.pager} aria-label={t('newer')}>
      {prevHref ? (
        <Link href={prevHref} className={styles.link} rel="prev">
          &larr; {t('newer')}
        </Link>
      ) : (
        <span className={`${styles.link} ${styles.disabled}`}>&larr; {t('newer')}</span>
      )}
      {nextHref ? (
        <Link href={nextHref} className={styles.link} rel="next">
          {t('older')} &rarr;
        </Link>
      ) : (
        <span className={`${styles.link} ${styles.disabled}`}>{t('older')} &rarr;</span>
      )}
    </nav>
  )
}
