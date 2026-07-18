'use client'

/**
 * The one place a locale becomes available to client components.
 *
 * next-intl's documented App Router setup (createNextIntlPlugin + i18n/request.ts +
 * middleware) is not usable here, and not merely because `output: 'export'` disables
 * middleware. Under static export next-intl's routing module forces
 * `localePrefix: 'always'`, meaning every locale carries a URL prefix — while this site's
 * contract, fixed in lib/permalink.ts, gives French no prefix at all. That mismatch cannot
 * be configured away, so the routing module is permanently out of reach for this site and
 * route groups are the only viable shape.
 *
 * What remains is the explicit-props form of NextIntlClientProvider — the same shape the
 * Pages Router integration uses, where locale and messages are passed in rather than
 * inferred from a request. It needs no plugin, no config file and no middleware.
 *
 * Placement: wrap wherever the locale is unambiguously known. Today that is the preview
 * route; once per-locale route groups exist (items #7-#9) this moves up into
 * `app/(fr)/layout.tsx` and `app/(en)/layout.tsx` with a hardcoded literal each. No
 * `useTranslations` call site changes when it moves.
 */

import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from '@/lib/messages'
import type { Locale } from '@/lib/permalink'

/**
 * `'use client'` above is load-bearing, not habit.
 *
 * `next-intl` ships two builds behind the `react-server` export condition. Imported from a
 * Server Component, `NextIntlClientProvider` resolves to a wrapper that fills in every prop
 * it was not given by reading the request config — `getFormats()` and `getConfigNow()` are
 * called unconditionally when `formats` and `now` are absent — and that config only exists
 * in the plugin-based setup this app deliberately does not use. The build fails with
 * "Couldn't find next-intl config file" even though locale and messages were both supplied.
 * Marking this file a client component selects the plain props-only provider instead.
 *
 * The site is Quebec City.
 */
const TIME_ZONE = 'America/Toronto'

export function IntlProvider({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={getMessages(locale)} timeZone={TIME_ZONE}>
      {children}
    </NextIntlClientProvider>
  )
}
