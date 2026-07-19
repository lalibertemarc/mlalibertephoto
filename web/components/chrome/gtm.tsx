/**
 * Google Tag Manager — the site's single analytics wiring.
 *
 * Hugo had four (see `docs/seo-contract.md`): this loader on every page, a `<noscript>`
 * fallback on the homepage only, an inline gtag for GA4 on content pages guarded by a
 * runtime hostname check, and Hugo's internal GA template on every page for that same GA4
 * property. GA4 therefore fired twice. Both gtag wirings are dropped here; GTM alone covers
 * every page kind, and what it loads is managed in the container rather than in this repo.
 *
 * Not `@next/third-parties`: its GoogleTagManager wraps the identical snippet in a
 * dependency this project otherwise has no need for.
 *
 * Both pieces mount in `SiteLayout`, which renders exactly once per locale tree and wraps
 * every route — so "fires once, on every page" falls out of the existing structure. That
 * also fixes Hugo's homepage-only `<noscript>`, which was an oversight rather than a
 * decision.
 *
 * Unguarded, matching Hugo: only the dropped gtag wiring ever checked for localhost.
 */

import Script from 'next/script'
import { GTM_ID } from '@/lib/seo/constants'

export function GoogleTagManager() {
  return (
    <Script
      id="gtm-loader"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
      }}
    />
  )
}

export function GoogleTagManagerNoScript() {
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  )
}
