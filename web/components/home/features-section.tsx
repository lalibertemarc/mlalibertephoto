/**
 * "Why choose me" — six feature cards.
 *
 * Hugo builds this grid with explicit row chunking (`$total_rows`, `seq`, `div`, `mod` in
 * features.html:16-21) because Bootstrap 3's float grid needs a `<div class="row">` break every
 * `cols` items or the cards misalign. `flex-wrap` wraps on its own, so the chunking is dropped
 * rather than reproduced — one container, six children, same result.
 *
 * `col-md-4` with no `col-sm` override is deliberate and matches the source: the cards go
 * full-width for the entire 768–991px band. That reads like an oversight in the original but is
 * what the live site does, so it is preserved, not corrected.
 */

import { getFeatures } from '@/lib/content/homepage-data'
import { linkTargetProps } from '@/lib/links'
import type { Locale } from '@/lib/permalink'
import { getT } from '@/lib/translate'
import { FeatureIcon } from './icons'
import { SectionHeading } from './section-heading'
import styles from './feature-card.module.css'

export function FeaturesSection({ locale }: { locale: Locale }) {
  const t = getT(locale, 'Home')
  const features = getFeatures()

  return (
    <section className="bg-surface-page py-section max-md:py-section-md max-sm:py-section-sm">
      <div className="container">
        <SectionHeading label={t('featuresTitle')} subtitle={t('featuresSubtitle')} />

        {/* -mx-gutter is Bootstrap's `.row { margin: 0 -15px }`, which cancels the container's
            own padding so the outer cards sit flush with the container edge. Without it every
            card is inset by one gutter and the grid reads 30px narrower than the source. */}
        <div className="-mx-gutter flex flex-wrap">
          {features.map((feature) => (
            <div key={feature.weight} className="w-full px-gutter md:w-1/3">
              <article className={styles.card}>
                <FeatureCardIcon icon={feature.icon} url={feature.url} />
                <h3 className="mb-[0.7rem] text-card-title font-normal tracking-title text-white/90">
                  {feature.name[locale]}
                </h3>
                <p className="text-card-body leading-body font-light text-white/55">
                  {feature.description[locale]}
                </p>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * Hugo wraps only the icon in the link — never the title or text — and `url` is `""` on all six
 * entries today, so this renders bare in practice. Kept because the field is a real optional in
 * the schema, and routed through `linkTargetProps` because nothing constrains it to an internal
 * path.
 */
function FeatureCardIcon({ icon, url }: { icon: string; url: string }) {
  const glyph = (
    <span className={styles.icon}>
      <FeatureIcon icon={icon} className="mx-auto size-[1em]" />
    </span>
  )

  return url ? (
    <a href={url} {...linkTargetProps(url)}>
      {glyph}
    </a>
  ) : (
    glyph
  )
}
