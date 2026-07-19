/**
 * The blog index, shared by both locale trees.
 *
 * The full listing — summaries, banners, the sidebar, pagination across three pages — is
 * item #7. This renders post titles, which is enough to prove the shim carries locale: the
 * two trees must show the same 77 posts, under different titles, at different URLs.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeading, isDarkPageHeading } from '@/components/chrome/page-heading'
import { listBlogPosts } from '@/lib/content/blog-posts'
import type { Locale } from '@/lib/permalink'

/**
 * "Blog" is the section title in both languages — it is the menu label in each
 * `[[*.menu.main]]` block and Hugo derives the list heading from the section name.
 * Hence no locale parameter here; add one if a locale ever needs a different title.
 */
const BLOG_TITLE = 'Blog'

export function blogIndexMetadata(): Metadata {
  return { title: BLOG_TITLE }
}

export async function BlogIndexPage({ locale }: { locale: Locale }) {
  const posts = await listBlogPosts(locale)

  return (
    <>
      <PageHeading title={BLOG_TITLE} dark={isDarkPageHeading('blog')} />
      <main className="container py-12">
        <ul className="flex flex-col gap-4">
          {posts.map((post) => (
            <li key={post.href}>
              <Link
                href={post.href}
                className="text-white/80 underline decoration-accent-underline underline-offset-4 hover:text-accent"
              >
                {post.title}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}
