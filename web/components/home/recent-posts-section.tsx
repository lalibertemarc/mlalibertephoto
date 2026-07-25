/**
 * "My recent posts" — the four newest, then a link to the whole blog.
 *
 * Four, not the footer's three (recent_posts.html:19 takes `first 4`, footer.html:21 `first 3`).
 *
 * Hugo reaches these through `.Paginate` on the home page's own pagination context, which sounds
 * meaningful and is not: the homepage exposes no pagination UI, so the expression reduces to
 * "the first four blog posts, newest first". `listBlogPosts` says that directly.
 *
 * The heading comes from `Home.recentPostsTitle` rather than a per-language config param. Hugo
 * keeps it in `languages.toml` — the only homepage section whose copy lives outside i18n — and
 * there is no reason to reproduce that split here. Its subtitle is `""` in both languages, so
 * none is passed.
 */

import Link from 'next/link'
import { listBlogPosts } from '@/lib/content/blog-posts'
import { localeHref, type Locale } from '@/lib/permalink'
import { getT } from '@/lib/translate'
import { LinkIcon } from './icons'
import { SectionHeading } from './section-heading'
import buttons from './section-button.module.css'
import styles from './blog-card.module.css'

/**
 * `hide_summary` is `true` in both `fr.params.recent_posts` and `en.params.recent_posts`, so no
 * summary has ever rendered here. A constant rather than a prop or a config lookup: both locales
 * agree, and a single flag is the honest model of a setting nothing varies. Flip it and populate
 * `BlogPostSummary.summary` to bring the copy back.
 */
const HIDE_SUMMARY = true

export async function RecentPostsSection({ locale }: { locale: Locale }) {
  const t = getT(locale, 'Home')
  const posts = await listBlogPosts(locale, 4)

  return (
    <section className="bg-surface-hero py-section max-md:py-section-md max-sm:py-section-sm">
      <div className="container">
        <SectionHeading label={t('recentPostsTitle')} />

        {/*
          Deliberately NO -mx-gutter here, unlike features-section.tsx. This section's markup has
          an extra `col-md-12` wrapper that features.html does not, and its 15px padding exactly
          cancels the row's -15px margin — so the row spans the container's content box, not its
          full width. Adding the negative margin makes each card 263px instead of 255px and
          shifts the grid 15px left.
        */}
        <div className="flex flex-wrap">
          {posts.map((post) => (
            <div key={post.href} className="w-full px-gutter sm:w-1/2 md:w-1/4">
              <article className={styles.card}>
                <Link href={post.href} className={styles.imageLink} tabIndex={-1} aria-hidden>
                  <div className={styles.imageFrame}>
                    {/* Deliberately a plain <img>, matching components/chrome/footer.tsx: banners
                        are arbitrary content URLs and 4 of 77 posts have no entry in the
                        dimension manifest, which next/image would need a size for. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={post.imageSrc} alt="" loading="lazy" />
                    <div className={styles.overlay}>
                      <LinkIcon />
                    </div>
                  </div>
                </Link>

                <div className="px-4 py-[1.2rem]">
                  <h3 className="mb-2 text-blog-card-title leading-card-title font-normal max-md:text-blog-card-title-md">
                    <Link href={post.href} className="text-white/90 no-underline hover:text-accent">
                      {post.title}
                    </Link>
                  </h3>
                  <p className="mb-[0.6rem] text-blog-card-meta tracking-button font-light text-white/40 uppercase">
                    {post.date}
                  </p>
                  {!HIDE_SUMMARY && post.summary ? (
                    <p className="text-blog-card-summary leading-body font-light text-white/55">
                      {post.summary}
                    </p>
                  ) : null}
                </div>
              </article>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link href={localeHref('/blog/', locale)} className={buttons.outline}>
            {t('viewAllPosts')}
          </Link>
        </div>
      </div>
    </section>
  )
}
