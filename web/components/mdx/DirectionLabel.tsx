'use client'

import { useTranslations } from 'next-intl'

/**
 * The localised "previous"/"next" label for a NavButton.
 *
 * This is the fixed half of a real Hugo bug. In layouts/shortcodes/navbutton.html:11-19 the
 * label is read with `.Get "text"` from *inside* `{{ with .Page.PrevInSection }}`, where the
 * dot has already been rebound to the target page — so the shortcode's own `text` parameter
 * is unreachable and the default always wins. That default is a hardcoded English literal
 * ("← Previous" / "Next →"), which is what French pages rendered.
 */
export function DirectionLabel({ direction }: { direction: string }) {
  const t = useTranslations('NavButton')
  return <>{direction === 'prev' ? t('previous') : t('next')}</>
}
