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
