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
