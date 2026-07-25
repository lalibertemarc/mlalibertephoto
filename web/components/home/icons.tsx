/**
 * The eight homepage glyphs, inline.
 *
 * Hugo pulls all of Font Awesome 6 from a CDN (`headers.html:51`) to draw these. The Next app
 * loads no icon font and no CDN — `components/chrome/icons.tsx` set that precedent for the nav,
 * and docs/bootstrap-dependency-map.md spent its effort removing exactly this kind of weight —
 * so reintroducing a render-blocking stylesheet for eight shapes would undo that work.
 *
 * These are hand-drawn equivalents, not copies of Font Awesome's paths. They read at the sizes
 * the site uses them (22px feature icons, 14px quote mark, 12px card overlay) and match the
 * originals in silhouette, not vertex for vertex.
 *
 * All are `aria-hidden`: each sits beside real text, and the card overlay's link glyph is
 * decoration over an already-labelled anchor.
 *
 * Sized in `em` so the existing `--text-card-icon` / `--text-quote-icon` tokens keep driving
 * scale through `font-size`, the way they did when these were font glyphs.
 */

interface IconProps {
  className?: string
}

/**
 * Filled, not stroked. The source's glyphs are Font Awesome's *solid* family, and an outline
 * version of the same silhouette reads visibly lighter at the 22px these render at — a
 * side-by-side against the live site made the difference obvious.
 */
const FILL = { fill: 'currentColor', stroke: 'none' } as const

function HouseIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...FILL}>
      {/* Traced as one outline: apex, eaves, body, and the doorway as a notch in the base. */}
      <path d="M12 3 1.6 11.7h3.1v8.8h5.2v-5.4h4.2v5.4h5.2v-8.8h3.1Z" />
    </svg>
  )
}

function LightbulbIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...FILL}>
      <path d="M12 2.6a6.1 6.1 0 0 0-3.7 10.9c.63.52 1.03 1.2 1.15 1.95h5.1c.12-.75.52-1.43 1.15-1.95A6.1 6.1 0 0 0 12 2.6Z" />
      <rect x="9.35" y="16.6" width="5.3" height="1.7" rx="0.85" />
      <rect x="10.3" y="19.4" width="3.4" height="1.7" rx="0.85" />
    </svg>
  )
}

function SunIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...FILL}>
      <circle cx="12" cy="12" r="4.6" />
      <g>
        <rect x="11.1" y="1.4" width="1.8" height="3.4" rx="0.9" />
        <rect x="11.1" y="19.2" width="1.8" height="3.4" rx="0.9" />
        <rect x="1.4" y="11.1" width="3.4" height="1.8" rx="0.9" />
        <rect x="19.2" y="11.1" width="3.4" height="1.8" rx="0.9" />
        <rect x="4.05" y="4.9" width="1.8" height="3.4" rx="0.9" transform="rotate(-45 4.95 6.6)" />
        <rect x="18.15" y="15.7" width="1.8" height="3.4" rx="0.9" transform="rotate(-45 19.05 17.4)" />
        <rect x="18.15" y="4.9" width="1.8" height="3.4" rx="0.9" transform="rotate(45 19.05 6.6)" />
        <rect x="4.05" y="15.7" width="1.8" height="3.4" rx="0.9" transform="rotate(45 4.95 17.4)" />
      </g>
    </svg>
  )
}

function CameraIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...FILL}>
      {/* evenodd punches the lens out of the body rather than drawing it on top. */}
      <path
        fillRule="evenodd"
        d="M7.7 5.6h8.6l1.6 2.6H21a1.6 1.6 0 0 1 1.6 1.6v8.6A1.6 1.6 0 0 1 21 20H3a1.6 1.6 0 0 1-1.6-1.6V9.8A1.6 1.6 0 0 1 3 8.2h3.1ZM12 10.2a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8Z"
      />
    </svg>
  )
}

function CartIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...FILL}>
      <path d="M1.4 3.2a.95.95 0 0 0 0 1.9h1.9l2.9 9.9a1.6 1.6 0 0 0 1.53 1.15h9.1a.95.95 0 0 0 0-1.9H8.3l-.45-1.55h9.2a1.6 1.6 0 0 0 1.55-1.2l1.75-6.4H5.4l-.5-1.7a.95.95 0 0 0-.9-.2Z" />
      <circle cx="8.6" cy="19.6" r="1.7" />
      <circle cx="16.6" cy="19.6" r="1.7" />
    </svg>
  )
}

function WalletIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...FILL}>
      <path
        fillRule="evenodd"
        d="M4.1 4.4h12.3a1 1 0 0 1 0 2H4.1a.55.55 0 0 0 0 1.1h15.4a2 2 0 0 1 2 2v8.1a2 2 0 0 1-2 2H4.1a2.6 2.6 0 0 1-2.6-2.6V7a2.6 2.6 0 0 1 2.6-2.6Zm12.6 8.2a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 0 0 0-2.7Z"
      />
    </svg>
  )
}

/**
 * The feature `icon` field carries the Font Awesome class verbatim from the source YAML
 * (`"fas fa-house"`), so the mapping is keyed on that string rather than on a field the
 * migration would have had to invent.
 */
const FEATURE_ICONS: Record<string, (props: IconProps) => React.JSX.Element> = {
  'fas fa-house': HouseIcon,
  'fas fa-lightbulb': LightbulbIcon,
  'fas fa-sun': SunIcon,
  'fas fa-camera': CameraIcon,
  'fas fa-cart-shopping': CartIcon,
  'fas fa-wallet': WalletIcon,
}

/**
 * Throws rather than rendering nothing. A seventh feature added with an undrawn icon should
 * fail the build, not ship a card with a hole where its glyph goes — the same
 * loud-failure-over-silent-degradation stance `lib/schema.ts` takes on unrecognised keys.
 */
export function FeatureIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = FEATURE_ICONS[icon]
  if (!Icon) {
    throw new Error(
      `No inline SVG for feature icon ${JSON.stringify(icon)} — add one to components/home/icons.tsx`,
    )
  }
  return <Icon className={className} />
}

/** Font Awesome's `fa-quote-left`: the opening double-quote mark above each testimonial. */
export function QuoteIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9.4 5.6C6.2 7 4.2 9.9 4.2 13.4c0 3 1.7 5 4.2 5 2.1 0 3.7-1.5 3.7-3.5 0-1.9-1.4-3.3-3.2-3.3-.4 0-.8.1-1 .2.4-1.7 1.9-3.3 3.9-4.2Zm10 0C16.2 7 14.2 9.9 14.2 13.4c0 3 1.7 5 4.2 5 2.1 0 3.7-1.5 3.7-3.5 0-1.9-1.4-3.3-3.2-3.3-.4 0-.8.1-1 .2.4-1.7 1.9-3.3 3.9-4.2Z" />
    </svg>
  )
}

/**
 * Font Awesome's `fa-link`: the glyph that fades in over a blog card on hover.
 *
 * Stroked rather than filled, unlike the feature icons above — FA's solid chain is itself two
 * open loops, so a stroke reproduces it directly. It also only ever appears at 12px under a
 * hover scrim, where the distinction would not read.
 */
export function LinkIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13.8a3.6 3.6 0 0 0 5.4.4l2.8-2.8a3.6 3.6 0 0 0-5.1-5.1l-1.6 1.6" />
      <path d="M14 10.2a3.6 3.6 0 0 0-5.4-.4l-2.8 2.8a3.6 3.6 0 0 0 5.1 5.1l1.6-1.6" />
    </svg>
  )
}
