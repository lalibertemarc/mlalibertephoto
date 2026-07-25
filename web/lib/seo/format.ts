/**
 * Text, date and URL formatting for head tags and generated feeds.
 *
 * Every function here exists to reproduce a specific Hugo template function byte for byte.
 * The formats are load-bearing: `og:updated_time` and `article:*` use Go's
 * `2006-01-02T15:04:05Z0700` layout, RSS `pubDate` uses RFC822, and the Twitter tags
 * truncate at character counts Hugo picked. See `docs/seo-contract.md`.
 */

import { SITE_ORIGIN } from './constants'

/** `<` `&` `>` `"` in XML text and attributes. */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Absolute form of a site-relative path. Mirrors Hugo's `absURL`. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_ORIGIN).toString()
}

const MARKDOWN_EMPHASIS = /(\*\*|__|\*|_|`)/g
const HTML_TAG = /<[^>]*>/g
const APOSTROPHE = /'/g

/**
 * Hugo's `markdownify | plainify` chain, applied to titles and descriptions.
 *
 * Both run on every title and description (headers.html:18,36) even though the corpus is
 * plain prose — the chain exists so an author *can* write emphasis. Rendering markdown
 * properly just to strip it again would be absurd, so this removes the inline markers and
 * any HTML directly. Block constructs are out of scope: a heading or list in a `title`
 * frontmatter field would be a content bug, not something to render.
 *
 * `markdownify` also runs Goldmark's smartypants extension, which is why the straight
 * apostrophe becomes U+2019: Hugo's `<title>` for `robin` is `Merle d&rsquo;Amérique`, not
 * `d'Amérique`. Six posts carry an apostrophe in a title or description, and without this
 * every one of them advertises a different string than the indexed page does. Note the
 * `<h1>` does *not* get this treatment — `.Title` is used raw there — so the heading and the
 * title legitimately differ by one character.
 *
 * Only the apostrophe is substituted. Smartypants also converts paired quotes, dashes and
 * ellipses, but no title or description in the corpus contains any of them — verified by
 * diffing all four affected tags across every page against a real Hugo build, where the only
 * differences were apostrophes. A title containing `"quoted"` or `--` is the case that would
 * need more here.
 */
export function toPlainText(text: string): string {
  return text
    .replace(HTML_TAG, '')
    .replace(MARKDOWN_EMPHASIS, '')
    .replace(APOSTROPHE, '’')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Hugo's `truncate N`, used for `twitter:title` (70) and `twitter:description` (200).
 *
 * Word-boundary aware, and the suffix is a space followed by U+2026 — verified against real
 * output, where a 70-character truncation ends `"...St-Valentin Kinky …"` with the 70th
 * character being the `y` of `Kinky`. So the limit counts the kept text only, and the
 * suffix is added beyond it.
 */
export function truncateChars(text: string, max: number): string {
  if (text.length <= max) return text

  const cut = text.slice(0, max)
  // Only back off to a word boundary if the cut landed mid-word: if the next character is
  // whitespace, `cut` already ends on a complete word.
  const landedMidWord = !/\s/.test(text.charAt(max))
  const lastSpace = cut.lastIndexOf(' ')

  // No space anywhere in the window — a long unbroken token, say a URL used as a meta_title.
  // There is no word boundary to retreat to, so keep the whole cut. Without this guard
  // `lastIndexOf` returns -1 and `slice(0, -1)` would quietly shave off the last character.
  const kept = landedMidWord && lastSpace !== -1 ? cut.slice(0, lastSpace) : cut

  return `${kept.trimEnd()} …`
}

/** Split a raw frontmatter datetime into its wall-clock parts and its offset. */
const RAW_DATETIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(Z|[+-]\d{2}:\d{2})$/

interface DateTimeParts {
  year: string
  month: string
  day: string
  time: string
  offset: string
}

function splitRawDate(raw: string): DateTimeParts {
  const m = RAW_DATETIME.exec(raw)
  if (!m) throw new Error(`Not a frontmatter datetime: ${JSON.stringify(raw)}`)
  const [, year, month, day, hh, mm, ss, offset] = m as unknown as string[]
  return {
    year: year!,
    month: month!,
    day: day!,
    time: `${hh}:${mm}:${ss}`,
    offset: offset!,
  }
}

/**
 * Go's `2006-01-02T15:04:05Z0700` layout — ISO 8601 with a colon-less numeric offset.
 *
 * Used by `og:updated_time`, `article:published_time` and `article:modified_time`. The only
 * difference from the stored frontmatter string is that colon, so this is a string edit
 * rather than a date computation. Reconstructing the value through a Date would risk the
 * offset-vs-UTC bug `lib/permalink.ts` documents at length.
 */
export function formatMetaDatetime(raw: string): string {
  const { year, month, day, time, offset } = splitRawDate(raw)
  return `${year}-${month}-${day}T${time}${offset.replace(':', '')}`
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

/**
 * RFC822 as RSS wants it: `Wed, 04 Mar 2026 10:00:00 -0400`.
 *
 * The weekday is the only part that must be computed. `Date.UTC` is safe *here* — and only
 * here — because the Y/M/D handed to it are the wall-clock parts already extracted from the
 * string, so it is being asked "what day of the week is this calendar date", not "what
 * instant is this". The offset is passed through untouched, never applied.
 */
export function formatRfc822(raw: string): string {
  const { year, month, day, time, offset } = splitRawDate(raw)

  const weekdayIndex = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  ).getUTCDay()

  const monthName = MONTHS[Number(month) - 1]
  const numericOffset = offset === 'Z' ? '+0000' : offset.replace(':', '')

  return `${WEEKDAYS[weekdayIndex]}, ${day} ${monthName} ${year} ${time} ${numericOffset}`
}
