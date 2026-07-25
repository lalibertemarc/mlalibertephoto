/**
 * Whether a link leaves the site.
 *
 * Both Hugo shortcodes that render links forced `target="_blank"` unconditionally
 * (layouts/shortcodes/navbutton.html:28, image-modal.html:19), so internal navigation —
 * every gallery CTA, every "contact me" button — opened a new tab and abandoned the
 * current one. Only genuinely external destinations should do that.
 */
export function isExternalLink(href: string): boolean {
  return /^(https?:)?\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:')
}

/** Attributes for an anchor, opening a new tab only when the destination is off-site. */
export function linkTargetProps(href: string): { target?: string; rel?: string } {
  return isExternalLink(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {}
}

/** A dot anywhere after the last slash — the segment looks like a filename. */
const LAST_SEGMENT_HAS_DOT = /\.[^/]*$/

/**
 * A content-authored internal link, carrying the trailing slash the site canonicalises on.
 *
 * `next.config.ts` sets `trailingSlash: true`, so every page is served at `<path>/` and every
 * framework-derived link (`lib/permalink.ts`, the nav, the feeds, the sitemap) already ends in
 * one. Links written by hand in MDX do not: `NavButton` calls point at unslashed paths such
 * as `/contact` and `/en/contact`. Those resolve — Netlify redirects the
 * unslashed form — but every one costs a hop, and the page's own canonical advertises the
 * slashed URL that its buttons do not use. `scripts/check-links.ts` reports each as a
 * `redirect-hop`.
 *
 * Only URLs *from content* go through here. A path with a dot in its last segment is left
 * alone, which is deliberately the same rule Next applies to a `Link` href — it treats such a
 * path as a file and declines to add the slash. Agreeing with it means this can never produce
 * an href that Next then rewrites into something else.
 *
 * An author who links an actual file this way gets no slash either, for the same reason. If
 * one ever slips through with no extension, `check-links.ts` fails the build naming the page.
 *
 * The complement is `linkStripsTrailingSlash` below: framework-derived taxonomy permalinks
 * (`/tags/fe-50mm-f1.8/`) already carry the slash and must *keep* it to match their canonical,
 * so they route around `Link` through `SlashSafeLink` rather than through here.
 */
export function internalHref(href: string): string {
  // Anchors, relative links and `mailto:`/`tel:`/absolute URLs are all left untouched.
  if (!href.startsWith('/') || isExternalLink(href)) return href

  const boundary = href.search(/[?#]/)
  const pathPart = boundary === -1 ? href : href.slice(0, boundary)
  const rest = boundary === -1 ? '' : href.slice(boundary)

  if (pathPart.endsWith('/') || LAST_SEGMENT_HAS_DOT.test(pathPart)) return href

  return `${pathPart}/${rest}`
}

/**
 * Whether Next's `<Link>` would drop the trailing slash from this internal path.
 *
 * With `trailingSlash: true`, `<Link>` treats a path whose last segment contains a dot as a
 * file and refuses to keep the slash, so `<Link href="/tags/fe-50mm-f1.8/">` renders
 * `href="/tags/fe-50mm-f1.8"`. That disagrees with the page's own canonical and both sitemaps,
 * which keep the slash, and costs a Netlify redirect hop on every such link. The seven dotted
 * taxonomy terms (`fe-50mm-f1.8`, `magick.net`, `sigma-24-70mm-f2.8-dg-dn-ii-art`, …) are the
 * only paths on the site this hits.
 *
 * `SlashSafeLink` uses this to route those links through a plain `<a>`, which React emits
 * verbatim — Next rewrites `Link` hrefs, not literal anchors. See docs/build-validation.md.
 */
export function linkStripsTrailingSlash(href: string): boolean {
  if (!href.startsWith('/') || isExternalLink(href)) return false
  const boundary = href.search(/[?#]/)
  const pathPart = boundary === -1 ? href : href.slice(0, boundary)
  // Match Next's own test: strip the trailing slash first, then look for a dot in what is now
  // the last segment. `/tags/fe-50mm-f1.8/` → `…f1.8` (a file); `/tags/imagemagick/` → clean.
  return LAST_SEGMENT_HAS_DOT.test(pathPart.replace(/\/+$/, ''))
}
