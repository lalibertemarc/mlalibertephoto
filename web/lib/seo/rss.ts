/**
 * The per-language RSS feeds.
 *
 * `[outputs] home = ["HTML", "RSS"]` gives the home page a feed and nothing else, so there
 * are exactly two: `/index.xml` and `/en/index.xml`.
 *
 * Those feeds carry every regular content page — all 85 — not just blog posts. Hugo's
 * internal home feed iterates `.Site.RegularPages`, and `mainSections = ["blog"]` is read
 * only by the homepage's recent-posts partial, so Contact and the Photos pages appear in the
 * feed too. Reproduced rather than narrowed: trimming it would be a visible change for
 * anyone subscribed, and belongs in its own decision rather than smuggled into a migration.
 *
 * `<generator>` is dropped. Hugo names itself there; claiming the same on a Next-built site
 * would simply be untrue.
 */

import { escapeXml, formatRfc822 } from './format'

const XML_DECLARATION = '<?xml version="1.0" encoding="utf-8" standalone="yes"?>'

export interface RssItem {
  title: string
  /** Absolute URL. Doubles as the guid, matching Hugo. */
  link: string
  /**
   * Raw frontmatter datetime, or undefined for the seven pages that carry no date.
   *
   * Hugo gives those Go's zero time — `Mon, 01 Jan 0001 00:00:00 +0000` — which is not a
   * publication date so much as the absence of one, spelled out. `<pubDate>` is optional in
   * RSS 2.0, so they are emitted without it: same items, no invented date.
   */
  date?: string
  description: string
}

export interface RssChannel {
  title: string
  /** Absolute URL of the language home page. */
  link: string
  description: string
  language: string
  /** Absolute URL of this feed. */
  selfLink: string
  items: readonly RssItem[]
}

function renderItem(item: RssItem): string {
  const pubDate = item.date ? `\n      <pubDate>${formatRfc822(item.date)}</pubDate>` : ''

  return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>${pubDate}
      <guid>${escapeXml(item.link)}</guid>
      <description>${escapeXml(item.description)}</description>
    </item>`
}

export function buildRssXml(channel: RssChannel): string {
  // Newest first, and the newest item's date is the channel's lastBuildDate — both match
  // Hugo. Sorting by parsed instant rather than string: the offsets differ across DST, so a
  // lexical sort misorders posts either side of the change. Undated items sort last, which
  // is where Hugo's zero time puts them too.
  const items = [...channel.items].sort(
    (a, b) => (b.date ? Date.parse(b.date) : -Infinity) - (a.date ? Date.parse(a.date) : -Infinity),
  )
  const newestDated = items.find((item) => item.date !== undefined)

  const lastBuildDate = newestDated?.date
    ? `\n    <lastBuildDate>${formatRfc822(newestDated.date)}</lastBuildDate>`
    : ''

  return `${XML_DECLARATION}
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channel.link)}</link>
    <description>${escapeXml(channel.description)}</description>
    <language>${escapeXml(channel.language)}</language>${lastBuildDate}
    <atom:link href="${escapeXml(channel.selfLink)}" rel="self" type="application/rss+xml" />
${items.map(renderItem).join('\n')}
  </channel>
</rss>
`
}
