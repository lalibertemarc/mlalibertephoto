# Routing, i18n and site chrome

How the Next.js app serves two languages at Hugo's exact URLs, and the nav/footer/heading
components that surround every page. Board item #5.

## The URL contract, restated

French is unprefixed at the root; English lives under `/en`. That is not a preference — the
paths are indexed, and `netlify.toml` even 301s `/fr/*` back to the root, so French must
*not* acquire a prefix.

```
/                       /en/
/blog/                  /en/blog/
/blog/2025/10/29/prohibition/    /en/blog/2025/10/29/prohibition/
/photos/portraits/      /en/photos/portraits/
```

`lib/permalink.ts` remains the single authority. It gained `localePrefix` (now exported) and
`localeHref(path, locale)`; `blogPermalink` and `pagePermalink` are rewritten on top of the
latter, so exactly one function in the codebase concatenates the string `/en`. Chrome links —
the nav, the brand, the language switcher — go through `localeHref` rather than hand-building
a prefix, which is what keeps a menu link and a content link from disagreeing about where a
page lives.

## Route groups, and why `app/en/` would not have worked

```
app/
├─ (fr)/
│  ├─ layout.tsx     <html lang="fr">   → /
│  ├─ page.tsx                          → /
│  ├─ blog/page.tsx                     → /blog/
│  └─ tokens/page.tsx                   → /tokens/   (scaffold tooling, delete before launch)
└─ (en)/
   └─ en/
      ├─ layout.tsx  <html lang="en">   → /en/
      ├─ page.tsx                       → /en/
      └─ blog/page.tsx                  → /en/blog/
```

There is **no `app/layout.tsx`**, and adding one back would break the split. The App Router
permits multiple root layouts only through *top-level route groups*, and only when no root
layout sits above them. The migration brief specified `app/(fr)/*` plus `app/en/*`, but a
plain `en` segment is not a route group — it would nest under the shared root layout and
inherit `lang="fr"`, silently failing the one criterion it exists to satisfy. Hence
`app/(en)/en/`: the group carries the separate layout, the literal segment carries the URL.

Two consequences worth knowing:

- **Crossing locales is a full page load**, not a soft transition. Different root layouts
  cannot be swapped client-side. This is correct here — `<html lang>` genuinely changes — but
  it will look slower than in-locale navigation, and that is not a bug.
- **Every route must live inside one of the two groups.** `app/preview/[fixture]/` was
  deleted rather than relocated (it was already marked dev-only); `app/tokens/` moved into
  `(fr)`.

## The shim pattern

Route files hold no page logic. Each is a locale literal over a shared implementation in
`lib/pages/*`:

```tsx
// app/(en)/en/blog/page.tsx — the whole file
import { BlogIndexPage, blogIndexMetadata } from '@/lib/pages/blog-index'

export const metadata = blogIndexMetadata()

export default function Page() {
  return <BlogIndexPage locale="en" />
}
```

The locale is a compile-time literal, known at exactly two places (the two layouts) and
restated per shim. It then flows as an ordinary typed prop. There is deliberately no ambient
locale store: the call chain is one or two hops deep, and a missing prop should be a compile
error rather than a runtime one.

The root layouts are shims too, over `lib/pages/site-layout.tsx`.

## i18n: messages only, and why `setRequestLocale` is not used

next-intl supplies message catalogs and nothing else. Its routing module is permanently out
of reach here — under `output: 'export'` it forces `localePrefix: 'always'`, while French has
no prefix — so `defineRouting`, `createNavigation`, `Link`, `redirect` and a `[locale]`
segment are all unusable.

**The whole of `next-intl/server` is unusable as well**, which is less obvious and cost real
time to establish. Every one of its APIs — `getTranslations`, `getMessages`, `getLocale`,
`getFormatter` — routes through `getConfig()`, which imports the module specifier
`next-intl/config`. Only `createNextIntlPlugin` aliases that specifier to a user
`i18n/request.ts`. Unaliased, it resolves to a stub whose entire body is:

```js
function getConfig() { throw new Error("Couldn't find next-intl config file. …") }
```

That throw happens before the arguments are inspected, so `getTranslations({ locale, namespace })`
— passing the locale explicitly, as the brief for this work assumed — fails exactly as hard as
the bare call. `setRequestLocale` is a real export and does not itself throw, but it only
writes a locale into a React `cache()`; nothing that could read it back succeeds without the
config file. Calling it would advertise a mechanism that is not there.

What works is the layer underneath. `createTranslator` is a synchronous, pure function over
`{ locale, messages, namespace }`, re-exported at next-intl's top level via
`export * from 'use-intl/core'`, and it is precisely what `getTranslations` calls *after*
`getConfig()` succeeds. `lib/translate.ts` skips to it:

```ts
export function getT(locale, namespace) {
  return createTranslator({ locale, messages: getMessages(locale), namespace })
}
```

Typing is free: `createTranslator` reads `Locale` and `Messages` off `AppConfig`, which
`global.d.ts` already narrows.

So: **server components call `getT(locale, ns)`; client components call `useTranslations(ns)`**
under `IntlProvider`, which each root layout mounts. `IntlProvider` must stay a client
component — see the note in `components/intl-provider.tsx` for the `react-server` export-condition
trap that makes a server import of it fail with the same config-file error.

### The catalogs

`messages/{fr,en}.json` carry all 50 strings Hugo resolved, merged from two sources that are
easy to mistake for one. `i18n/{fr,en}.yaml` in the project holds only **11** keys — none of
them nav or footer strings. The other 39, including every string the chrome renders, come
from `themes/hugo-universal-theme/i18n/`, which Hugo merges at build time.

Namespaces: `ImageModal`, `NavButton` (pre-existing), `Nav`, `Footer`, `Home`, `Blog`,
`Contact`, `Widgets`, `NotFound`, `Months`. Several are consumed by nothing yet — they belong
to items #7–#9 and were ported now so those items do not each re-derive the mapping.

Four source keys are deliberately absent:

| Key | Why |
|---|---|
| `blogLink`, `ctaLink` | Not strings — they are the URLs `/blog` and `/contact/`, hand-duplicated per language. `pagePermalink` derives both from the URL contract. |
| `templateBy`, `portedBy` | The theme-attribution credit. Removed by decision: it is a claim about what builds this site, and it stops being true here. |

`Months` reproduces the theme's French names verbatim, including `aout` (the source's spelling,
without the circumflex). `Intl.DateTimeFormat('fr')` would render `août` instead — if items
#7–#9 prefer the formatter, that is a deliberate change to current output, not a cleanup.

## The language switcher

`lib/locale-counterpart.ts` answers one question: where does this page live in the other
language?

For content it is a structural prefix swap, and that is exact rather than approximate. The
corpus is fully symmetric — every one of the 85 content paths exists as both `fr.mdx` and
`en.mdx`, `scripts/migrate-content.ts` hard-errors otherwise, and slugs never diverge because
`slugFromFilename` is `basename.toLowerCase()` over identical filenames.

**Taxonomy was assumed to break it. It does not** — corrected while building the SEO layer
(see `docs/seo-contract.md`). The worry was that terms are translated along with their posts,
so `/tags/paruline-flamboyante/` and `/en/tags/american-redstart/` would be one tag under two
unrelated slugs, and `netlify.toml:227` does still carry a redirect for that pair. But that
vocabulary has since been unified: `tags` and `categories` live in each post's shared
`meta.json`, one array serving both languages, and `migrate-content.ts` hard-errors if the
source trees disagree. Verified directly — `redstart.md` reads `tags = ["american redstart"]`
in *both* trees, and every term directory in a real Hugo build appears identically under
`/tags/` and `/en/tags/`. The redirect is a historical artifact. So taxonomy prefix-swaps like
everything else, and the `UNMAPPED_SECTIONS` guard that used to special-case it is gone.

`resolveCounterpart` can still return `null`, and the switcher still falls back to the target
locale's homepage when it does — but with the taxonomy guard removed, only malformed input
reaches that branch. The distinction is kept because "no counterpart exists" and "the
counterpart is the homepage" should not collapse into one another.

Two departures from Hugo's behaviour, both intentional. Hugo's fallback ranges
`Site.Home.AllTranslations`, which **includes the current language** — so on any page without a
translation its menu offers to switch to the language you are already reading. And it is a
dropdown that always contains exactly one item. Here it is a single link that always targets
the other locale.

## Site chrome

| Component | Rendering | Notes |
|---|---|---|
| `site-header.tsx` | client | The only client component. Owns burger, scroll-affix; reads `usePathname()` |
| `dropdown-menu-item.tsx` | client | Portfolio only; owns its own open state |
| `nav-link.tsx`, `icons.tsx`, `language-switcher.tsx` | presentational | No state of their own |
| `footer.tsx` | **server** | No client JS at all |
| `page-heading.tsx` | **server** | Two skins, no state |

`usePathname()` in a client component costs nothing in the export: Next renders each route's
client tree during the export pass, so the correct link is already highlighted in the shipped
HTML before hydration.

### What was not ported, and why

Roughly half of `nav.html` is unreachable. Establish this before "restoring" any of it:

- **The yamm mega-menu** (`nav.html:32-116`, ~85 lines) is gated on `$hasSections`, true only
  when the first child's identifier starts with `section.`. No menu entry in `languages.toml`
  sets such an identifier, and the built HTML contains no `.yamm-content` anywhere. Portfolio
  is a flat five-link dropdown.
- **The topbar** never renders: `params.toml` sets `topbar.enable = false`. The Facebook and
  Instagram entries are dead in *both* `menus.toml` and `languages.toml`.
- **`#search`** (`nav.html:154-163`) has no trigger anywhere on the site.
- **Hover-to-open** (`front.js:157-161`) requires `dropdown_mouse_over`, which is `false`.

`breadcrumbs.html` renders **no breadcrumb trail** — no `.Ancestors`, no list, no links. It is
a page-title band, which is why the component is `PageHeading`.

### Bootstrap JS, replaced

- **collapse** → `navOpen` state.
- **dropdown** → `DropdownMenuItem` state plus `use-dismissable.ts` (outside-press and
  Escape, the only plugin behaviours the nav relied on).
- **affix** → a `scrollY > 62` listener. The plugin never did the pinning: `.navbar-affixed-top`
  is `position: sticky` in CSS, and the `.affix` class only swapped the background and added a
  shadow.

### The menu

`lib/nav-menu.ts` defines the menu **once**. Hugo duplicates all ten entries across
`[[fr.menu.main]]` and `[[en.menu.main]]` with `/en/` typed into each English URL; here an
item carries a locale-agnostic path and the href comes from `pagePermalink` — the same
function the content pipeline uses.

Active state reproduces Hugo's `IsMenuCurrent`/`HasMenuCurrent` pair, and both of its clauses
matter:

- A match on any **menu-tree** descendant — not a URL-path descendant. "Restauration de photos"
  is a menu-child of Portfolio but lives at `/restoration/`, nowhere near `/photos/`, so a
  `startsWith` test against the parent href alone would leave Portfolio unlit there.
- A **URL-prefix** match on the item's own href, for `page` targets only. This keeps "Blog" lit
  while reading a post, since posts have no menu node. Restricting it to `page` targets is what
  stops "Bienvenue" — whose href `/` prefixes every path on the site — from matching everywhere.

### Typography comes from two stylesheets, not one

The token extraction covered `custom.css`, which supplies the chrome's **colours**. The
**typography** comes from the theme's `style.marsala.css` and was missed on the first pass —
`.navbar ul.nav > li > a` (`:317-339`) gives every top-level entry uppercase, bold 700,
underline, `0.08em` tracking, 14px, `21px 15px` padding and a 5px top border that turns gold
on hover; `.navbar ul.dropdown-menu li` (`:361-371`) gives menu rows uppercase, `0.08em`,
12px and hairline separators.

Chrome sizes are written as explicit pixels (`text-[14px]`, `py-[21px]`) rather than Tailwind
steps, because they are measured from the running site and the 10px root makes the familiar
steps misleading — see "The 10px root" in `docs/nextjs-scaffold.md`.

Where `custom.css`'s declaration and the *computed* value disagree, computed wins: the footer
contact button declares `1.5px` and `white/70`, but Bootstrap's `.btn` ties on specificity and
the rendered result is `1px` and `white/55`.

### The active state is enabled here, and never fires in Hugo

Worth knowing before anyone "fixes" the difference. On the live site the nav `<li>` never
receives `active` — verified on `/blog/`, `/contact/` and `/photos/portraits/`, all of which
render an empty class. The menu entries in `languages.toml` define `url` rather than `pageRef`,
so `IsMenuCurrent`/`HasMenuCurrent` has no page to match and the gold `.active` rule at
`custom.css:847` is dead code.

The port enables it: the current section takes the accent fill, the deeper top border and no
underline. Submenu children stay unhighlighted, matching `nav.html:117-124`, which has no
active check for them even in principle — `ResolvedSubMenuItem` omits the field so it cannot
drift back.

### Bugs fixed rather than ported

Beyond the four already listed in `docs/mdx-components.md`:

1. **The English footer address renders in French.** `params.toml:40` defines `address` once at
   top level and never overrides it in `[en.params]`, so Hugo's language-param fallback serves
   the French line on the English site. Now translated in `lib/site-config.ts`.
2. **The switcher offered the current language** on pages without a translation (above).
3. Phone and email were inert text; they are now `tel:` / `mailto:` links.

Not fixed, deliberately: `logo` and `logo_small` (`params.toml:25-26`) hold the identical URL,
so the responsive logo swap in `nav.html:9-10` has no visual effect. Modelled as one field
rather than preserving a distinction that does not exist.

## Content loading

`lib/content/blog-posts.ts` reads `web/content/blog/*/meta.json` plus the locale's MDX
frontmatter title, newest first. Narrow on purpose — the footer needs three, the blog index
needs the list. Summaries, tags, pagination and post bodies are item #7.

Titles come from the MDX frontmatter, not `meta.json`, because they differ per language while
`meta.json` is shared.

Ordering parses the date to an instant, which would be a **bug** in `lib/permalink.ts` and is
correct here. Frontmatter dates carry `-04:00`/`-05:00` offsets: a lexical sort misorders posts
on either side of a DST change, while a `Date` round-trip can shift the calendar day a URL is
built from. Ordering wants the instant; URLs want the literal prefix.

## Assets

`web/public/img/` now holds `texture-bw.png` (light heading band) and `placeholder.png`
(bannerless posts), copied from the theme.

The 27 posts whose banners are local `/img/*` paths still have no file under `web/public/` —
that is the asset-pipeline task `docs/content-migration.md` flags, and nine of those filenames
contain spaces. The three most recent posts use Cloudinary URLs, so the footer is unaffected
today.

The brand logo goes through `next/image` with hardcoded intrinsic dimensions (736×195,
fetched once via Cloudinary's `fl_getinfo`). It is not in `lib/image-dimensions.json` because
that manifest is generated by scanning content MDX, and the logo is chrome.

## Verification performed

- `next build` exports 7 routes; `<html lang>` correct per branch.
- All 154 blog URLs (77 × 2) diffed against a real `hugo --gc --minify` build: **zero
  differences**.
- `npm run migrate:content:check` still passes after the `permalink.ts` refactor — 258 outputs
  byte-identical, 170 URLs verified.
- 14 `resolveCounterpart` cases pass, including deep blog URLs, both directions, and
  `/environnement/` (a path starting with the letters "en", which must not be mistaken for the
  prefix). The taxonomy → `null` case was correct at the time and has since been retired —
  see the language-switcher section.
- Browser: dropdown, affix, switcher round-trip `/en/blog/` → `/blog/`, and both footers
  checked visually. No console errors.
- Chrome typography diffed against a running `hugo server` by **computed style**, not by eye:
  nav links match on font-size, weight, transform, decoration, tracking, padding and border;
  footer rows match on separators, margins and padding.
- Dropdown-persistence fix confirmed by opening the menu on `/blog/` and pressing Back —
  `aria-expanded` returns to `false`.
- Burger verified by mechanism (class toggling, `sm` = 768px) rather than by eye — the
  automation could not resize the viewport below the breakpoint.

## Known gaps

- ~~**Taxonomy has no routes.**~~ **Closed by board item #8** — see `docs/blog-port.md`. All
  258 term pages, their pagination and three hubs per locale now build. The hubs are
  *populated* rather than reproducing Hugo's blank ones, a recorded deviation.
- Hugo emits **268 `page/1/` alias stubs** and a `/fr/` stub (all `noindex` meta-refresh).
  The 266 on the blog and taxonomy surface are now served as generated 301s in
  `public/_redirects` (item #8). `netlify.toml` covers `/fr/*`.
- `app/(fr)/tokens/` is still scaffold tooling and should go before launch.
