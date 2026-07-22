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
 * one. Links written by hand in MDX do not: 52 `NavButton` calls point at `/contact`,
 * `/en/contact`, `/restoration` and `/en/restoration`. Those resolve — Netlify redirects the
 * unslashed form — but every one costs a hop, and the page's own canonical advertises the
 * slashed URL that its buttons do not use. `scripts/check-links.ts` reports each as a
 * `redirect-hop`.
 *
 * Only URLs *from content* go through here. A path with a dot in its last segment is left
 * alone, which is deliberately the same rule Next applies to a `Link` href — it treats such a
 * path as a file and declines to add the slash. Agreeing with it means this can never produce
 * an href that Next then rewrites into something else. The consequence is that the eight
 * taxonomy terms containing a dot (`fe-50mm-f1.8`, `magick.net`) keep their hop; that is a
 * property of the framework, not of this function, and is recorded in docs/build-validation.md.
 *
 * An author who links an actual file this way gets no slash either, for the same reason. If
 * one ever slips through with no extension, `check-links.ts` fails the build naming the page.
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
