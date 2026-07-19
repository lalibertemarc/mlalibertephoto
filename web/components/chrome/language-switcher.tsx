import Link from 'next/link'
import { resolveCounterpart } from '@/lib/locale-counterpart'
import { LOCALE_INFO, otherLocale } from '@/lib/locale'
import { localeHref, type Locale } from '@/lib/permalink'
import { GlobeIcon } from './icons'

/**
 * Switch to the other language, staying on the current page where one exists.
 *
 * Rendered as a single link rather than Hugo's dropdown (nav.html:134-149). That dropdown
 * ranges over `.Translations`, which on a two-language site yields exactly one entry — so
 * it is a menu that costs a click to reveal one option.
 *
 * Two departures from the source's behaviour, both deliberate:
 *
 * - Hugo's no-counterpart fallback ranges `Site.Home.AllTranslations`, and `AllTranslations`
 *   *includes the current language*. On any page without a translation the menu therefore
 *   offers to switch to the language you are already reading. Here the target is always the
 *   other locale.
 * - When there is no counterpart the link goes to the other locale's homepage, which is
 *   what Hugo does too, but the label stays honest about which language you are getting.
 */
export function LanguageSwitcher({
  locale,
  pathname,
  label,
}: {
  locale: Locale
  pathname: string
  label: string
}) {
  const target = otherLocale(locale)
  const href = resolveCounterpart(pathname, target) ?? localeHref('/', target)

  return (
    <Link
      href={href}
      lang={LOCALE_INFO[target].htmlLang}
      aria-label={`${label}: ${LOCALE_INFO[target].label}`}
      // A sibling `> li > a` in the same `ul.nav`, so it takes the bar's typography
      // (style.marsala.css:317-339) like every other top-level entry.
      className="flex items-center gap-1.5 border-t-[5px] border-t-transparent px-gutter py-[21px] text-[14px] font-bold uppercase tracking-[0.08em] text-white/80 underline transition-colors duration-250 hover:border-t-accent hover:bg-white/8 hover:text-white"
    >
      <GlobeIcon />
      {LOCALE_INFO[target].label}
    </Link>
  )
}
