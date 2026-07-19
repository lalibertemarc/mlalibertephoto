/**
 * The shared root layout, rendered once per locale tree.
 *
 * Both `app/(fr)/layout.tsx` and `app/(en)/en/layout.tsx` are thin shims over this, for the
 * same reason the page routes are: the two trees exist to make the URL contract explicit,
 * not to hold two copies of the chrome.
 *
 * Each emits its own `<html>`, which is the whole reason for the route-group split. The App
 * Router permits multiple root layouts only through top-level route groups, and only when
 * there is no `app/layout.tsx` above them — so `app/en/*` as a plain segment could not have
 * carried its own `lang`, it would have inherited French from the shared root.
 */

import type { Metadata } from 'next'
import { Footer } from '@/components/chrome/footer'
import { SiteHeader } from '@/components/chrome/site-header'
import { IntlProvider } from '@/components/intl-provider'
import { listBlogPosts } from '@/lib/content/blog-posts'
import { roboto } from '@/lib/fonts'
import { LOCALE_INFO } from '@/lib/locale'
import type { Locale } from '@/lib/permalink'
import { getSiteConfig } from '@/lib/site-config'

/** Titles and descriptions from `[fr]`/`[en]` and `[*.params]` in languages.toml. */
export function siteMetadata(locale: Locale): Metadata {
  const site = getSiteConfig(locale)
  return {
    title: { template: `%s | ${site.title}`, default: site.title },
    description: site.aboutUs,
  }
}

export async function SiteLayout({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  const recentPosts = await listBlogPosts(locale, 3)

  return (
    <html lang={LOCALE_INFO[locale].htmlLang} className={roboto.variable}>
      <body>
        <IntlProvider locale={locale}>
          <SiteHeader locale={locale} />
          {children}
          <Footer locale={locale} recentPosts={recentPosts} />
        </IntlProvider>
      </body>
    </html>
  )
}
