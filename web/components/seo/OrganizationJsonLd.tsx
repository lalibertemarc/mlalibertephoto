/**
 * Site-wide Organization schema.
 *
 * Ports `layouts/partials/schema/org.jsonld`, which has never actually shipped: the partial
 * is never invoked, and the `{{ block "schema" }}` in `_default/single.html` that was meant
 * to carry it is defined by no template. So this is a port of intent, not of output — there
 * is nothing in production to diff it against.
 *
 * Two values are reconciled rather than copied. The partial's `logo` points at
 * `img/logo-small.png`, but `params.toml` defines `logo_small` as a Cloudinary URL and the
 * local file is not what the site actually uses; `lib/site-config.ts` already collapsed that
 * pair into one field, so this reuses it. And `description` reads the language default,
 * because the partial's `.Site.Params.description` is set nowhere and always fell through.
 */

import { localeHref, type Locale } from '@/lib/permalink'
import { SEO_DEFAULTS, SOCIAL_PROFILE_URLS } from '@/lib/seo/constants'
import { absoluteUrl } from '@/lib/seo/format'
import { getSiteConfig } from '@/lib/site-config'
import { JsonLd } from './JsonLd'

export function OrganizationJsonLd({ locale }: { locale: Locale }) {
  const site = getSiteConfig(locale)

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: site.title,
        url: absoluteUrl(localeHref('/', locale)),
        logo: site.logoSrc,
        description: SEO_DEFAULTS[locale].description,
        sameAs: [...SOCIAL_PROFILE_URLS],
      }}
    />
  )
}
