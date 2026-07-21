/**
 * The rendered body of a standalone page — Hugo's `#post-content` inside
 * `#blog-post.dark-gallery`.
 *
 * Server component: the compiled MDX tree it receives may contain client components
 * (`ImageModal`, `BeforeAfter`), but this wrapper has no state and no effects of its own.
 */

import type { ReactNode } from 'react'
import styles from './page.module.css'

/**
 * The literal, unhashed `dark-gallery` class alongside the hashed module class is deliberate,
 * and is the same device `PostBody` uses for `dark-blog`.
 *
 * Two rules in other modules are scoped to the page class and cannot be written here:
 * `nav-button.module.css` needs the outline CTA variant, and `before-after.module.css` needs
 * the muted caption. Both target a class this file does not own, and CSS Modules hash each
 * file's class names independently — a selector written over here would compile to a name that
 * appears in no other file's output and would silently never match. So each rule lives beside
 * the class it restyles, guarded by `:global(.dark-gallery)`, and this is what satisfies it.
 *
 * Emitted for all eight pages, including the three Hugo renders light. They share one skin —
 * see the note at the top of page.module.css.
 */
export function PageBody({ children }: { children: ReactNode }) {
  return <div className={`${styles.body} dark-gallery`}>{children}</div>
}
