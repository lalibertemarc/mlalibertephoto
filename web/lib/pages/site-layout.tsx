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
import { GoogleTagManager, GoogleTagManagerNoScript } from '@/components/chrome/gtm'
import { SiteHeader } from '@/components/chrome/site-header'
import { IntlProvider } from '@/components/intl-provider'
import { OrganizationJsonLd } from '@/components/seo/OrganizationJsonLd'
import { listBlogPosts } from '@/lib/content/blog-posts'
import { roboto } from '@/lib/fonts'
import { LOCALE_INFO } from '@/lib/locale'
import type { Locale } from '@/lib/permalink'
import { SITE_ORIGIN } from '@/lib/seo/constants'
import { getSiteConfig } from '@/lib/site-config'

/**
 * Titles and descriptions from `[fr]`/`[en]` and `[*.params]` in languages.toml.
 *
 * `metadataBase` lives here because Next merges it down to every child route, so setting it
 * once at each locale root gives canonical, OG and hreflang URLs an origin to resolve
 * against without any leaf needing to know one exists.
 *
 * There is deliberately no title `template`. Hugo's `<title>` is the bare page title for
 * every page kind — `headers.html:19` never concatenates the site name — so a `%s | Site`
 * template would make each page's title diverge from the indexed one. The site title
 * remains the default for any route that sets no title of its own.
 */
export function siteMetadata(locale: Locale): Metadata {
  const site = getSiteConfig(locale)
  return {
    metadataBase: new URL(SITE_ORIGIN),
    title: site.title,
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
        <GoogleTagManagerNoScript />
        <OrganizationJsonLd locale={locale} />
        <IntlProvider locale={locale}>
          <SiteHeader locale={locale} />
          {children}
          <Footer locale={locale} recentPosts={recentPosts} />
        </IntlProvider>
        <GoogleTagManager />
      </body>
    </html>
  )
}
