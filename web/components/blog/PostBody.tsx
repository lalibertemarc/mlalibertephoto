/**
 * The rendered body of a blog post — Hugo's `#post-content` inside `#blog-post.dark-blog`.
 *
 * Server component: the compiled MDX tree it receives may contain client components
 * (`ImageModal`, `BeforeAfter`), but this wrapper itself has no state and no effects.
 */

import type { ReactNode } from 'react'
import styles from './post.module.css'

/**
 * The literal, unhashed `dark-blog` class alongside the hashed module class is deliberate.
 *
 * `flex-images.module.css` needs to switch its image shadow on only inside a blog post, and a
 * rule written over here as `.body .flexImages img` could never match: the two modules hash
 * that class name independently, so the selector would name a class that does not exist in
 * the other file's output. The same problem gallery.module.css documents for its own pair.
 *
 * So the shadow rule lives over there, guarded by `:global(.dark-blog)`, and this is the
 * class that satisfies it. Keeping Hugo's own class name rather than inventing a sentinel
 * means anyone diffing the two implementations finds the same string on both sides.
 */
export function PostBody({ children }: { children: ReactNode }) {
  return <div className={`${styles.body} dark-blog`}>{children}</div>
}
