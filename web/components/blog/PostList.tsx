/**
 * The post rows on a list page — the blog index and every taxonomy term page.
 *
 * Ports the per-post markup of the theme's `_default/list.html`: banner (or the placeholder),
 * linked title, a byline, and a date. Two things that template contains are deliberately
 * absent:
 *
 *   - **No summary and no "continue reading" button.** `list.html:69` gates both on
 *     `.Site.Params.recent_posts.hide_summary`, which `languages.toml` sets to `true` for
 *     both languages, so neither has ever rendered on the live site. The flag reads like it
 *     belongs to the homepage widget; the list template reuses it verbatim.
 *   - **No sidebar.** See docs/blog-port.md for why the two widgets it held
 *     are not ported and what replaces the link path they provided.
 *
 * Dark rather than the source's light Bootstrap column, matching the post pages a reader
 * lands on from here. A recorded deviation, not an oversight.
 */

import Link from 'next/link'
import type { BlogPostSummary } from '@/lib/content/blog-posts'
import styles from './post-list.module.css'

export function PostList({ posts }: { posts: readonly BlogPostSummary[] }) {
  return (
    <ul className={styles.list}>
      {posts.map((post) => (
        <li key={post.href} className={styles.row}>
          <Link href={post.href} className={styles.imageLink} tabIndex={-1} aria-hidden>
            <div className={styles.imageFrame}>
              {/* Deliberately a plain <img>, matching components/home/recent-posts-section.tsx
                  and components/chrome/footer.tsx: banners are arbitrary content URLs and 4 of
                  77 posts have no entry in the dimension manifest, which next/image would need
                  a size for. Cropping to --aspect-card rather than trusting the source ratio
                  matters here — most banners are square (600x600), so any fixed box distorts
                  them without object-fit. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.imageSrc} alt="" loading="lazy" />
            </div>
          </Link>
          <div className={styles.text}>
            <h2 className={styles.title}>
              <Link href={post.href}>{post.title}</Link>
            </h2>
            <p className={styles.meta}>{post.date}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
