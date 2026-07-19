/**
 * The homepage, shared by both locale trees.
 *
 * The real homepage — carousel, features, testimonials, recent posts — is item #7. This
 * carries only what the routing shell needs to demonstrate: that one implementation serves
 * two URLs, in two languages, under two `<html lang>` values.
 */

import type { Metadata } from 'next'
import { ExtraMeta } from '@/components/seo/ExtraMeta'
import { newestContentDate } from '@/lib/content/content-dates'
import { getT } from '@/lib/translate'
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
  const t = getT(locale, 'Home')
  const site = getSiteConfig(locale)
  // The home page cascades from all content, not just posts — see lib/content/content-dates.ts.
  const updatedAt = await newestContentDate()

  return (
    <main className="container py-16">
      <ExtraMeta updatedAt={updatedAt} />
      <h1 className="mb-4 text-page-title font-light tracking-title text-white">{site.title}</h1>
      <p className="max-w-prose text-white/70">{site.aboutUs}</p>
      <p className="mt-8 text-white/45">{t('ctaSubtitle')}</p>
    </main>
  )
}
