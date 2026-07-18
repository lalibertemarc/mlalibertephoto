import { linkTargetProps } from '@/lib/links'
import { DirectionLabel } from './DirectionLabel'
import styles from './nav-button.module.css'

/**
 * A styled CTA link. Ports layouts/shortcodes/navbutton.html.
 *
 * Stays a server component. The only piece needing a translation is the `direction` label,
 * which is delegated to a small client component, so the common case — a plain url + text
 * button, which is every one of the ~60 real usages — ships no client JavaScript.
 */
export interface NavButtonProps {
  url?: string
  text?: string
  /**
   * Renders a localised "previous"/"next" label instead of `text`.
   *
   * In Hugo this also resolved the URL from `.Page.PrevInSection`. That half cannot be
   * reproduced yet — section ordering is a page-layer concern (items #7-#9) — so `url`
   * remains required. No content in the corpus uses `direction`, so nothing regresses.
   */
  direction?: 'prev' | 'next' | (string & {})
  className?: string
}

export function NavButton({ url, text, direction, className }: NavButtonProps) {
  // Hugo renders nothing when it cannot resolve a URL; same here.
  if (!url) return null

  const classes = [styles.navButton, className].filter(Boolean).join(' ')

  return (
    <a href={url} className={classes} {...linkTargetProps(url)}>
      {text ?? (direction ? <DirectionLabel direction={direction} /> : null)}
    </a>
  )
}
