/**
 * The three nav glyphs, inline.
 *
 * Hugo pulls these from Font Awesome (`fa-align-justify`, `fa-globe`, plus Bootstrap's CSS
 * `.caret` triangle). The Next app loads no icon font and no CDN — docs/bootstrap-dependency-map.md
 * spent its effort removing exactly that kind of weight — so three hand-rolled SVGs stand in
 * rather than reintroducing a webfont for a hamburger and a globe.
 *
 * All are `aria-hidden`: every one sits next to real text, visible or screen-reader-only.
 */

export function BurgerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="1" y1="3" x2="15" y2="3" />
      <line x1="1" y1="8" x2="15" y2="8" />
      <line x1="1" y1="13" x2="15" y2="13" />
    </svg>
  )
}

export function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.6" />
      <ellipse cx="8" cy="8" rx="2.9" ry="6.6" />
      <line x1="1.6" y1="5.8" x2="14.4" y2="5.8" />
      <line x1="1.6" y1="10.2" x2="14.4" y2="10.2" />
    </svg>
  )
}

/** Bootstrap's `.caret`: a small solid triangle that flips when its menu is open. */
export function CaretIcon({ open, className }: { open?: boolean; className?: string }) {
  return (
    <svg
      className={`${open ? 'rotate-180' : ''} transition-transform ${className ?? ''}`}
      width="8"
      height="5"
      viewBox="0 0 8 5"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M0 0h8L4 5z" />
    </svg>
  )
}
