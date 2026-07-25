/**
 * Locale metadata that is not part of the URL contract.
 *
 * `lib/permalink.ts` owns the `Locale` type and every URL-shaped concern. This module
 * owns the things that are merely *about* a locale — what to put in `<html lang>`, what
 * to call the language in the switcher — so a copy change to a switcher label can never
 * reach code that generates URLs.
 */

import type { Locale } from './permalink'

export interface LocaleInfo {
  /**
   * The `<html lang>` value. Identical to the `Locale` key today, but kept as its own
   * field because they answer different questions: `Locale` keys the content tree, this
   * is a BCP-47 tag. Hugo's `languageCode = "fr-ca"` in hugo.toml is inert — it is
   * overridden by neither language block, and the built site emits `lang="fr"`.
   */
  readonly htmlLang: string
  /** How the language names itself in the switcher, from `languageName` in languages.toml. */
  readonly label: string
}

export const LOCALE_INFO: Record<Locale, LocaleInfo> = {
  fr: { htmlLang: 'fr', label: 'Français' },
  en: { htmlLang: 'en', label: 'English' },
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'fr' ? 'en' : 'fr'
}
