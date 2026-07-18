/**
 * UI-string catalogs for the MDX components.
 *
 * These are chrome strings only — button labels, aria-labels. Content itself is already
 * split per locale at the file level (`fr.mdx` / `en.mdx`), so nothing here interpolates
 * or pluralises; it exists because a handful of strings live in the components rather
 * than in the content.
 *
 * `moreFromShoot` and the NavButton labels are carried over verbatim from Hugo's
 * i18n/fr.yaml and i18n/en.yaml. The four ImageModal aria-labels are new in French: the
 * Hugo shortcode hardcodes them in English for both locales
 * (layouts/shortcodes/image-modal.html:28-31), so French pages ship English aria-labels
 * today. Translating them is a fix, not a port.
 */

import en from '@/messages/en.json'
import fr from '@/messages/fr.json'
import type { Locale } from './permalink'

/**
 * `satisfies` makes a key present in one catalog but missing from the other a compile
 * error. With two locales maintained by hand, a silently missing string would otherwise
 * only surface as a next-intl runtime warning in the browser.
 */
const catalogs = { fr, en } satisfies Record<Locale, typeof fr>

export type Messages = typeof fr

export function getMessages(locale: Locale): Messages {
  return catalogs[locale]
}
