/**
 * Fixed SEO values, ported from Hugo's config.
 *
 * Sources: `config/_default/hugo.toml` (baseURL), `config/_default/languages.toml`
 * (`[*.params]` `defaultDescription`, `defaultKeywords`, `author`) and
 * `config/_default/params.toml` (`facebook_site`, `default_sharing_image`).
 *
 * See `docs/seo-contract.md` for the full tag-by-tag contract these feed.
 */

import type { Locale } from '@/lib/permalink'

/** `baseURL` from hugo.toml. Every absolute URL in the head resolves against this. */
export const SITE_ORIGIN = 'https://marclaliberte.photos'

/**
 * The one analytics wiring the port keeps.
 *
 * Hugo had four: this GTM loader (universal), a GTM `<noscript>` (homepage only), an
 * inline gtag for G-DT1RL3KDNZ (content pages only, guarded by a runtime hostname check)
 * and Hugo's `_internal/google_analytics.html` for the same GA4 property (every page).
 * GA4 therefore fired twice, by two mechanisms with two different guards. Consolidating on
 * GTM keeps tag management out of the codebase and covers every page kind uniformly.
 */
export const GTM_ID = 'GTM-TNS3FT57'

/**
 * `article:publisher`, emitted verbatim.
 *
 * Hugo prepends `https://www.facebook.com/` to `facebook_site` (headers.html:118), but the
 * config value is already a full URL, so every post ships a doubled one today:
 * `https://www.facebook.com/https://www.facebook.com/profile.php?id=...`. Emitting the
 * config value directly is the fix.
 */
export const FACEBOOK_PUBLISHER_URL =
  'https://www.facebook.com/profile.php?id=61567037645807'

/** `sameAs` for the Organization schema, from the topbar menus in languages.toml. */
export const SOCIAL_PROFILE_URLS = [
  'https://www.instagram.com/marc.laliberte.photo',
  FACEBOOK_PUBLISHER_URL,
] as const

/** `author` from `[*.params]` — the same string in both languages. */
export const SITE_AUTHOR = 'Marc Laliberte'

/**
 * `default_sharing_image` (params.toml:9), used by every page without its own banner.
 *
 * Dimensions are Hugo's `imageConfig` reading the real file; measured at 782x200, which is
 * what production emits today. The asset is copied into `public/img/` so the absolute URL
 * resolves — Hugo served it from `static/`, which the Next app does not share.
 */
export const DEFAULT_SHARING_IMAGE = {
  src: '/img/logo.png',
  width: 782,
  height: 200,
} as const

interface LocaleSeoDefaults {
  readonly description: string
  readonly keywords: readonly string[]
}

export const SEO_DEFAULTS: Record<Locale, LocaleSeoDefaults> = {
  fr: {
    description:
      'Photographe de la ville de Québec spécialisé en portrait, événementiel et restauration de photos anciennes.',
    keywords: [
      'photographe portrait',
      'photographe Québec',
      'portrait corporatif',
      'portrait casting',
      'événementiel',
      'restauration de photos',
    ],
  },
  en: {
    description:
      'Photographer in Quebec City specializing in portraits, events and restoration of old photos',
    keywords: [
      'portrait photographer',
      'portrait',
      'casting portrait',
      'corporate portrait',
      'events',
      'photographer Quebec',
      'photo restoration',
    ],
  },
}
