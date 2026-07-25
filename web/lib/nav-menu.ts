/**
 * The main menu, defined once and resolved per locale.
 *
 * Hugo hand-duplicates every entry across `[[fr.menu.main]]` and `[[en.menu.main]]` in
 * languages.toml, with the `/en/` prefix typed into each English URL. That is twenty
 * entries where ten would do, and nothing checks that a menu URL still matches where the
 * content actually lives. Here an item carries a locale-agnostic path and the href comes
 * from `pagePermalink` — the same function the content pipeline uses — so a menu link and
 * a content URL cannot drift apart.
 */

import { linkTargetProps } from './links'
import { localeHref, pagePermalink, type Locale } from './permalink'

export type MenuTarget =
  | { kind: 'home' }
  | { kind: 'page'; path: string }
  | { kind: 'external'; url: string }

/** Same shape as `LangPairSchema` in lib/schema.ts, which every localized data file uses. */
export interface MenuLabel {
  fr: string
  en: string
}

export interface MenuItem {
  id: string
  label: MenuLabel
  target: MenuTarget
  weight: number
  children?: MenuItem[]
}

export interface ResolvedSubMenuItem {
  id: string
  label: string
  href: string
  linkProps: { target?: string; rel?: string }
}

export interface ResolvedMenuItem extends ResolvedSubMenuItem {
  /**
   * Top-level entries only. Hugo's dropdown children carry no active check at all
   * (nav.html:117-124 renders them as bare `<li><a>`), so highlighting one would be
   * inventing state the source has no concept of.
   */
  active: boolean
  children?: ResolvedSubMenuItem[]
}

/** Labels and weights are verbatim from config/_default/languages.toml. */
export const MAIN_MENU: MenuItem[] = [
  {
    id: 'home',
    label: { fr: 'Bienvenue', en: 'Welcome' },
    target: { kind: 'home' },
    weight: 1,
  },
  {
    id: 'photos',
    label: { fr: 'Portfolio', en: 'Portfolio' },
    target: { kind: 'page', path: 'photos' },
    weight: 3,
    children: [
      {
        id: 'photos-portraits',
        label: { fr: 'Portraits', en: 'Portraits' },
        target: { kind: 'page', path: 'photos/portraits' },
        weight: 1,
      },
      {
        id: 'photos-events',
        label: { fr: 'Évènements', en: 'Events' },
        target: { kind: 'page', path: 'photos/events' },
        weight: 2,
      },
      {
        id: 'restoration',
        label: { fr: 'Restauration de photos', en: 'Restoration' },
        target: { kind: 'page', path: 'restoration' },
        weight: 3,
      },
      {
        id: 'photos-wildlife',
        label: { fr: 'Animalière', en: 'Wildlife' },
        target: { kind: 'page', path: 'photos/wildlife' },
        weight: 5,
      },
      {
        id: 'videos',
        label: { fr: 'Vidéos', en: 'Videos' },
        target: { kind: 'page', path: 'videos' },
        weight: 6,
      },
    ],
  },
  {
    id: 'blog',
    label: { fr: 'Blog', en: 'Blog' },
    target: { kind: 'page', path: 'blog' },
    weight: 4,
  },
  {
    id: 'store',
    label: { fr: 'Boutique', en: 'Store' },
    target: { kind: 'external', url: 'https://store.marclaliberte.photos/' },
    weight: 5,
  },
  {
    id: 'contact',
    label: { fr: 'Contact', en: 'Contact' },
    target: { kind: 'page', path: 'contact' },
    weight: 7,
  },
]

export function resolveHref(target: MenuTarget, locale: Locale): string {
  switch (target.kind) {
    case 'home':
      return localeHref('/', locale)
    case 'page':
      return pagePermalink(target.path, locale)
    case 'external':
      return target.url
  }
}

/**
 * Reproduces Hugo's `IsMenuCurrent` / `HasMenuCurrent` pair (nav.html:29).
 *
 * Two clauses, and both are load-bearing:
 *
 * - A match on any *menu-tree* descendant. This is not the same as a URL-path descendant:
 *   "Restauration de photos" is a child of Portfolio in the menu but lives at
 *   `/restoration/`, nowhere near `/photos/`. A `startsWith` check against the parent's
 *   href alone would leave Portfolio unlit on that page.
 * - A URL-prefix match on the item's own href, for `page` targets only. This is what keeps
 *   "Blog" lit while reading an individual post, since posts have no menu node. Restricting
 *   it to `page` targets is what stops "Bienvenue" — whose href is `/` and therefore a
 *   prefix of every path on the site — from matching everywhere; its target is `home`.
 */
function isActive(item: MenuItem, locale: Locale, pathname: string): boolean {
  const href = resolveHref(item.target, locale)
  if (pathname === href) return true
  if (item.target.kind === 'page' && pathname.startsWith(href)) return true
  return (item.children ?? []).some((child) => isActive(child, locale, pathname))
}

function resolveChild(item: MenuItem, locale: Locale): ResolvedSubMenuItem {
  const href = resolveHref(item.target, locale)
  return {
    id: item.id,
    label: item.label[locale],
    href,
    linkProps: linkTargetProps(href),
  }
}

function resolveOne(item: MenuItem, locale: Locale, pathname: string): ResolvedMenuItem {
  const href = resolveHref(item.target, locale)
  return {
    id: item.id,
    label: item.label[locale],
    href,
    active: isActive(item, locale, pathname),
    linkProps: linkTargetProps(href),
    ...(item.children
      ? { children: sortByWeight(item.children).map((c) => resolveChild(c, locale)) }
      : {}),
  }
}

function sortByWeight(items: MenuItem[]): MenuItem[] {
  return [...items].sort((a, b) => a.weight - b.weight)
}

/** `pathname` must carry a trailing slash; `usePathname()` does under `trailingSlash: true`. */
export function resolveMenu(
  items: MenuItem[],
  locale: Locale,
  pathname: string,
): ResolvedMenuItem[] {
  return sortByWeight(items).map((item) => resolveOne(item, locale, pathname))
}
