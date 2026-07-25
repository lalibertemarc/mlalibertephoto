/**
 * The homepage, shared by both locale trees.
 *
 * Section order follows layouts/index.html:20-28 — carousel, features, testimonials, CTA, recent
 * posts. The CTA sits before the posts, not after.
 *
 * There is no page-level `container` and no page-level `h1`. Each section is full-bleed with its
 * own inner container, so wrapping the page would clip every section background to content
 * width; and the only `h1` on the real homepage is the active carousel slide's title. The
 * `clients` partial is not ported — `[clients] enable = false`, so it renders nothing today.
 */

import type { Metadata } from 'next'
import { HomeCarousel } from '@/components/home/carousel/carousel'
import { CtaSection } from '@/components/home/cta-section'
import { FeaturesSection } from '@/components/home/features-section'
import { RecentPostsSection } from '@/components/home/recent-posts-section'
import { TestimonialsSection } from '@/components/home/testimonials-section'
import { ExtraMeta } from '@/components/seo/ExtraMeta'
import { newestContentDate } from '@/lib/content/content-dates'
import { getCarouselSlides } from '@/lib/content/homepage-data'
import { localeHref, type Locale } from '@/lib/permalink'
import { buildMetadata } from '@/lib/seo/metadata'
import { getSiteConfig } from '@/lib/site-config'

/**
 * The homepage's title is the site title, and its description and keywords fall through to
 * the language defaults — Hugo sets no `.Description` on the home page, so `defaultDescription`
 * is what production emits.
 */
export function homeMetadata(locale: Locale): Metadata {
  return buildMetadata({
    locale,
    permalinks: { fr: localeHref('/', 'fr'), en: localeHref('/', 'en') },
    title: getSiteConfig(locale).title,
  })
}

export async function HomePage({ locale }: { locale: Locale }) {
  // The home page cascades from all content, not just posts — see lib/content/content-dates.ts.
  const updatedAt = await newestContentDate()

  return (
    // `home` scopes a small typographic bump over the extracted-verbatim custom.css sizes —
    // the homepage reads its body copy a touch larger. See the `.home` block in globals.css.
    <main className="home">
      <ExtraMeta updatedAt={updatedAt} />
      <HomeCarousel slides={getCarouselSlides()} locale={locale} />
      <FeaturesSection locale={locale} />
      <TestimonialsSection locale={locale} />
      <CtaSection locale={locale} />
      <RecentPostsSection locale={locale} />
    </main>
  )
}
