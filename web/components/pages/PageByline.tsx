/**
 * The date line above a page's body.
 *
 * `single.html:44` gates its byline block on `.Params.author OR .Params.date`, and `/photos/`
 * is the only page whose `meta.json` carries a date — so this renders on exactly one page in
 * each locale, with no author beside it. `PostByline` is the blog's richer twin; the two do
 * not share a body because this one has no author half to share.
 */

import styles from './page.module.css'

export function PageByline({ displayDate }: { displayDate: string }) {
  return <p className={styles.meta}>{displayDate}</p>
}
