/**
 * "Ready to capture your moments?" — the see_more band between testimonials and recent posts.
 *
 * Hugo takes the button's href from an i18n key (`{{ i18n "ctaLink" }}`), which means the URL
 * is a hand-maintained string duplicated per language — `/contact/` in fr.yaml, `/en/contact/`
 * in en.yaml. `messages/*.json` deliberately omits that key: `pagePermalink` derives both from
 * the URL contract, so the link cannot drift out of step with where the page actually lives.
 */

import Link from 'next/link'
import { pagePermalink, type Locale } from '@/lib/permalink'
import { getT } from '@/lib/translate'
import buttons from './section-button.module.css'

export function CtaSection({ locale }: { locale: Locale }) {
  const t = getT(locale, 'Home')

  return (
    <section className="border-t border-white/6 bg-surface-page py-cta text-center max-md:py-cta-md max-sm:py-cta-sm">
      <div className="container">
        <h2 className="mb-2 text-cta-title font-light tracking-title text-white max-md:text-cta-title-md max-sm:text-cta-title-sm">
          {t('ctaTitle')}
        </h2>
        <p className="mb-[1.8rem] text-cta-subtitle font-light text-white/60">{t('ctaSubtitle')}</p>
        <Link
          href={pagePermalink('contact', locale)}
          className={`${buttons.outline} ${buttons.cta}`}
        >
          {t('ctaButtonText')}
        </Link>
      </div>
    </section>
  )
}
