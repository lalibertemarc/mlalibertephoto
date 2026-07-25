/**
 * Comparing frontmatter dates without destroying them.
 *
 * Deliberately not in `lib/seo/` or `lib/content/`: both need this, and neither owns it.
 *
 * The rule this exists to enforce is the one `lib/permalink.ts` documents at length. A raw
 * frontmatter date carries its own offset (-04:00 or -05:00 across a DST boundary), so
 * comparing two of them lexically misorders posts either side of the change, while parsing
 * one to an instant and formatting it back can shift the calendar day a URL is built from.
 * Ordering wants the instant; every output wants the literal string. So the instant is used
 * as a sort key and thrown away, and the original string is what comes back.
 */

import { urlDateFromRawDate, type Locale } from './permalink'

/**
 * A raw frontmatter date, formatted for display, on the literal calendar day it was written.
 *
 * Reproduces Hugo's `date_format = "2 January, 2006"` — day, full month name, comma, year —
 * with one deliberate change: the month name comes from `Intl`, not the `Months` catalog the
 * theme ships. Hugo renders French August as `aout`; this renders `août`. That is a change to
 * live output, chosen knowingly (see docs/homepage-port.md), not a cleanup.
 *
 * `Intl` supplies the month name and nothing else. The day/month/year order is assembled by
 * hand because bare `en` resolves to US conventions and would emit "July 19, 2026", where
 * both languages want day first.
 *
 * The date never round-trips through `new Date(raw)`. That is the whole point of routing
 * through `urlDateFromRawDate`: the raw string carries a -04:00/-05:00 offset, so parsing it
 * yields a UTC instant whose calendar day can differ from the one written — and formatting
 * that instant would then use the *build machine's* timezone, which is Netlify's runner in
 * production and something else entirely on a developer's laptop. The literal Y/M/D goes in,
 * `Date.UTC` builds an instant from those raw numbers, and `timeZone: 'UTC'` pins the
 * formatter so the host's zone is never consulted. A post dated 2026-03-02T23:30:00-05:00
 * renders "2 mars" here and lives at /blog/2026/03/02/ — the same day, derived the same way.
 */
export function formatPostDate(raw: string, locale: Locale): string {
  const { year, month, day } = urlDateFromRawDate(raw)
  const instant = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  const monthName = new Intl.DateTimeFormat(locale, {
    month: 'long',
    timeZone: 'UTC',
  }).format(instant)

  return `${Number(day)} ${monthName}, ${year}`
}

/** Newest of a set of raw frontmatter dates, returned verbatim. */
export function newestDate(raws: readonly string[]): string | undefined {
  let newest: string | undefined
  let newestKey = -Infinity

  for (const raw of raws) {
    const key = Date.parse(raw)
    if (key > newestKey) {
      newestKey = key
      newest = raw
    }
  }

  return newest
}
