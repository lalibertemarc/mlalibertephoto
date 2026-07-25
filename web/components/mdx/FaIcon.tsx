/**
 * The three Font Awesome glyphs that survive in content, drawn inline.
 *
 * Hugo loads all of Font Awesome 6 from a CDN (`headers.html:51`) and content writes bare
 * `<i class="fab fa-2x fa-facebook">` tags against it. The Next app loads no icon font and no
 * CDN — `components/chrome/icons.tsx` set that precedent and `components/home/icons.tsx`
 * followed it — so those tags would otherwise render as empty inline elements, leaving the
 * contact page's two social links invisible and its submit button unlabelled.
 *
 * This is registered as the MDX map's `i` override rather than as a transform in
 * `scripts/migrate-content.ts`, because `web/content/` is regenerated wholesale at cutover and
 * the class strings are the stable thing to key on. All six `<i>` tags in the corpus are on the
 * two contact pages and all six are Font Awesome; anything else falls through untouched, so a
 * future `<i>` used for real italics still renders as one.
 *
 * The glyphs are hand-drawn equivalents, not copies of Font Awesome's paths — the same choice
 * `components/home/icons.tsx` documents, matching the originals in silhouette rather than
 * vertex for vertex.
 */

interface GlyphProps {
  className?: string
  style?: React.CSSProperties
}

/**
 * Sized in `em` so Font Awesome's own `fa-Nx` scale classes keep working through `font-size`,
 * exactly as they did when these were font glyphs.
 */
const BOX = { width: '1em', height: '1em', fill: 'currentColor' } as const

/**
 * The circled `f`. `fab fa-facebook` is the enclosed mark (the bare letter is
 * `fa-facebook-f`), so the letter is a hole in the disc — hence `evenodd`, and hence the stem
 * running out through the bottom edge rather than stopping short of it.
 */
function FacebookIcon(props: GlyphProps) {
  return (
    <svg {...props} {...BOX} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1.4 19.8v-7.6h2.05l.39-2.5H13.4V10.1c0-.72.2-1.21 1.24-1.21h1.32V6.65c-.23-.03-1.01-.1-1.92-.1-1.9 0-3.2 1.16-3.2 3.29v1.86H8.78v2.5h2.06v7.6Z"
      />
    </svg>
  )
}

/**
 * Rounded frame, lens ring, and the corner dot — three rings from six subpaths under
 * `evenodd`, each outer shape immediately followed by the hole that hollows it.
 */
function InstagramIcon(props: GlyphProps) {
  return (
    <svg {...props} {...BOX} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M7.8 2.5h8.4a5.3 5.3 0 0 1 5.3 5.3v8.4a5.3 5.3 0 0 1-5.3 5.3H7.8a5.3 5.3 0 0 1-5.3-5.3V7.8a5.3 5.3 0 0 1 5.3-5.3Zm0 2.1a3.2 3.2 0 0 0-3.2 3.2v8.4a3.2 3.2 0 0 0 3.2 3.2h8.4a3.2 3.2 0 0 0 3.2-3.2V7.8a3.2 3.2 0 0 0-3.2-3.2ZM12 6.9a5.1 5.1 0 1 1 0 10.2 5.1 5.1 0 0 1 0-10.2Zm0 2.1a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.3-3.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z"
      />
    </svg>
  )
}

/** Solid rather than outlined: it renders at 1em inside a button, where a hairline outline
    disappears against the fill. */
function EnvelopeIcon(props: GlyphProps) {
  return (
    <svg {...props} {...BOX} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.45 6.2 12 12.98l9.55-6.78A1.6 1.6 0 0 0 20 5H4a1.6 1.6 0 0 0-1.55 1.2Z" />
      <path d="M22 8.05l-9.42 6.69a1 1 0 0 1-1.16 0L2 8.05V17.4A1.6 1.6 0 0 0 3.6 19h16.8a1.6 1.6 0 0 0 1.6-1.6Z" />
    </svg>
  )
}

const GLYPHS: Record<string, (props: GlyphProps) => React.JSX.Element> = {
  'fa-facebook': FacebookIcon,
  'fa-instagram': InstagramIcon,
  'fa-envelope': EnvelopeIcon,
}

/** Font Awesome's `fa-2x`, `fa-3x`, … scale classes. `fa-lg`/`fa-sm` are unused in content. */
const SCALE = /^fa-(\d)x$/

export interface FaIconProps {
  /** The original Font Awesome class list, verbatim — e.g. `"fab fa-2x fa-facebook"`. */
  className: string
}

/**
 * Renders a Font Awesome class list as inline SVG.
 *
 * Emitted by `scripts/lib/html-jsx.ts`, which rewrites every empty `<i>` carrying a `fa-`
 * class. It takes the raw class string rather than a glyph name so the migration stays a
 * mechanical rewrite with no vocabulary of its own to keep in sync with this file.
 */
export function FaIcon({ className }: FaIconProps) {
  const classes = className.split(/\s+/).filter(Boolean)
  const name = classes.find((c) => c in GLYPHS)

  // A hard error rather than a fallback. The migration converts *any* `fa-` icon, so a class
  // this file has no glyph for would otherwise render an empty element — invisible on the
  // page and invisible in review, which is exactly how the CDN removal broke these in the
  // first place. Failing the build names the class and the fix is to draw it.
  if (name === undefined) {
    throw new Error(
      `No inline glyph for Font Awesome class ${JSON.stringify(className)}. ` +
        `Add one to components/mdx/FaIcon.tsx.`,
    )
  }

  const Glyph = GLYPHS[name]!
  const scale = classes.map((c) => SCALE.exec(c)?.[1]).find(Boolean)

  return (
    <Glyph
      // `align-middle` replaces the baseline alignment the icon font got for free: an inline
      // SVG sits on the text baseline and hangs below it, which is visible next to the submit
      // button's label.
      className="inline-block align-middle"
      style={scale ? { fontSize: `${scale}em` } : undefined}
    />
  )
}
