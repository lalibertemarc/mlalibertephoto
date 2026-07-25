/**
 * Per-locale site chrome data, ported from Hugo's config.
 *
 * Sources: `config/_default/languages.toml` ([fr]/[en] `title`, `languageName`, and the
 * `[*.params]` `about_us` / `copyright`) and `config/_default/params.toml` (`logo`,
 * `address`).
 *
 * Three things are deliberately not modelled the way Hugo modelled them:
 *
 * 1. `about_us` and `address` are raw HTML strings in Hugo, rendered through `safeHTML`
 *    (footer.html:8,49). Carrying them across as `dangerouslySetInnerHTML` would work but
 *    would make the footer's structure invisible to the type system for no benefit — both
 *    are trivially structured. `aboutUs` is a plain string the component wraps in a `<p>`,
 *    and `address` is broken into fields so the phone and email can render as real
 *    `tel:` / `mailto:` links instead of the inert text they are today.
 *
 * 2. `contact_url` is not stored. Hugo hand-duplicates `/contact/` and `/en/contact/` per
 *    language, which is the same drift risk the menu had; `pagePermalink('contact', locale)`
 *    already produces exactly those two strings from the URL contract.
 *
 * 3. `logo` and `logo_small` (params.toml:25-26) hold the identical URL, so the
 *    "responsive logo swap" in nav.html:9-10 has no visual effect. Modelled as one field.
 */

import type { Locale } from './permalink'

export interface SiteAddress {
  name: string
  phone: string
  email: string
  region: string
  country: string
}

export interface LocaleSiteConfig {
  title: string
  logoSrc: string
  aboutUs: string
  copyright: string
  address: SiteAddress
}

const LOGO_SRC =
  'https://res.cloudinary.com/dbjekf3b7/image/upload/v1770857743/mlalibertephoto3_pn6qpx.png'

const SHARED_ADDRESS = {
  name: 'Marc Laliberte',
  phone: '514-503-2446',
  email: 'laliberte.marc1@gmail.com',
  country: 'Canada',
} as const

const SITE_CONFIG: Record<Locale, LocaleSiteConfig> = {
  fr: {
    title: 'Marc Laliberte Photo et Vidéos',
    logoSrc: LOGO_SRC,
    aboutUs:
      'Photographe et vidéographe de la ville de Québec spécialisé en portrait et événementiel.',
    copyright:
      'Copyright (c) 2025 - 2026, Marc Laliberte Photo&Video; tous droits réservés.',
    address: { ...SHARED_ADDRESS, region: 'Ville de Québec et environs' },
  },
  en: {
    title: 'Marc Laliberte Photo and Videos',
    logoSrc: LOGO_SRC,
    aboutUs:
      'Photographer and videographer from Quebec City specializing in portraits and events.',
    copyright:
      'Copyright (c) 2025 - 2026, Marc Laliberte Photo&Video; all rights reserved.',
    // Fix, not a port. `address` is defined once at the top level of params.toml:40 and
    // never overridden in [en.params], so Hugo's language-param fallback renders this line
    // in French on the English site today.
    address: { ...SHARED_ADDRESS, region: 'Quebec City and surrounding area' },
  },
}

export function getSiteConfig(locale: Locale): LocaleSiteConfig {
  return SITE_CONFIG[locale]
}
