/**
 * The homepage, shared by both locale trees.
 *
 * The real homepage — carousel, features, testimonials, recent posts — is item #7. This
 * carries only what the routing shell needs to demonstrate: that one implementation serves
 * two URLs, in two languages, under two `<html lang>` values.
 */

import type { Metadata } from 'next'
import { getT } from '@/lib/translate'
import type { Locale } from '@/lib/permalink'
import { getSiteConfig } from '@/lib/site-config'

export function homeMetadata(locale: Locale): Metadata {
  const site = getSiteConfig(locale)
  // The root layout's title template appends the site name; the homepage is the one page
  // that should not read "Site | Site", so it opts out with an absolute title.
  return { title: { absolute: site.title } }
}

export function HomePage({ locale }: { locale: Locale }) {
  const t = getT(locale, 'Home')
  const site = getSiteConfig(locale)

  return (
    <main className="container py-16">
      <h1 className="mb-4 text-page-title font-light tracking-title text-white">{site.title}</h1>
      <p className="max-w-prose text-white/70">{site.aboutUs}</p>
      <p className="mt-8 text-white/45">{t('ctaSubtitle')}</p>
    </main>
  )
}
