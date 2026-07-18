import type { CSSProperties } from 'react'
import styles from './flex-images.module.css'

/**
 * A centered, wrapping row. Ports layouts/shortcodes/fleximages.html.
 *
 * Despite the name it is used as a general row wrapper — most real usages hold NavButtons
 * rather than images. Per docs/gallery-pages.md, image *groups* use Gallery, so this never
 * wraps a set of navigable images.
 */
export interface FlexImagesProps {
  children: React.ReactNode
  className?: string
  /**
   * A raw CSS declaration string, because the Hugo shortcode interpolated this parameter
   * straight into a `style` attribute and the migration preserves parameter values
   * verbatim. React needs an object, so a string is parsed. No content in the corpus sets
   * it; the object form is accepted for callers written against React directly.
   */
  style?: string | CSSProperties
}

/** Turns `"margin-top: 2rem; gap: 0"` into `{ marginTop: '2rem', gap: '0' }`. */
function parseStyle(style: string): CSSProperties {
  const parsed: Record<string, string> = {}
  for (const declaration of style.split(';')) {
    const at = declaration.indexOf(':')
    if (at === -1) continue
    const property = declaration.slice(0, at).trim()
    const value = declaration.slice(at + 1).trim()
    if (!property || !value) continue
    const camel = property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
    parsed[camel] = value
  }
  return parsed as CSSProperties
}

export function FlexImages({ children, className, style }: FlexImagesProps) {
  const classes = [styles.flexImages, className].filter(Boolean).join(' ')
  const resolved = typeof style === 'string' ? parseStyle(style) : style

  return (
    <div className={classes} style={resolved}>
      {children}
    </div>
  )
}
