# Bootstrap 3 Dependency Map

What the Hugo site actually uses from Bootstrap 3.3.7, and how each piece maps to
Tailwind in the Next.js rewrite. Compiled by auditing `layouts/**`,
`content/**/*.md`, `data/**`, and the theme templates the site still falls back
to.

The headline: **the Bootstrap surface is small**. Most of the 81KB theme
stylesheet and the whole of `animate.css` are dead weight. The design lives in
`static/css/custom.css`.

## Classes in use

### Grid

`container`, `container-fluid`, `row`, `col-md-12`, `col-md-4`, `col-md-3`,
`col-sm-6`, `col-sm-3`, `col-sm-12`

| Location | Combination | Behaviour |
|---|---|---|
| `layouts/partials/nav.html:43-111` | `col-sm-6` + `col-sm-3` + `col-sm-3`, or `col-sm-3`×4 | mega-menu; 2–4 cols ≥768px, stacked below |
| `layouts/partials/features.html:30` | `col-md-4` (from `col-md-{{ div 12 $elements }}`, `features.cols = 3`) | 3 cols ≥992px. **No `col-sm` override**, so it is full-width across the whole 768–991px tablet range, not 2-up |
| `layouts/partials/recent_posts.html:20` | `col-md-3 col-sm-6` | 4 / 2 / 1 |
| `layouts/partials/footer.html:5,15,45` | `col-md-4 col-sm-6` ×3 | 3 / 2+1 / 1 |
| `content/{fr,en}/contact.md` | `col-sm-6` ×2, then `col-sm-12` ×2 | 2 cols ≥768px, stacked below |
| `breadcrumbs.html:5`, `testimonials.html:8`, `see_more.html:6` | `col-md-12` alone | full-width; used only to pick up the 15px gutter |
| `layouts/_default/single.html:34` | **no `col-*` at all** | the theme's `col-md-9` + `col-md-3` sidebar were deleted in the override and nothing replaced them. `#blog-post` is a bare block div relying on default flow — confirm visually before porting |

### Navbar / dropdown / collapse

`navbar`, `navbar-default`, `navbar-affixed-top`, `navbar-header`,
`navbar-brand`, `navbar-buttons`, `navbar-toggle`, `navbar-collapse`, `collapse`,
`navbar-nav`, `navbar-right`, `navbar-form`, `nav`, `dropdown`,
`dropdown-toggle`, `dropdown-menu`, `caret`

All in `layouts/partials/nav.html`. Plus theme mega-menu classes riding on
`.dropdown`: `yamm`, `use-yamm`, `yamm-fw`, `yamm-content`.

### Everything else

- **Buttons**: `btn`, `btn-template-main` (theme skin, not core), `btn-small`
- **Forms**: `form-group`, `form-control`, `input-group`, `input-group-btn`
- **Visibility**: `hidden-xs`, `hidden-sm`, `hidden-md`, `hidden-lg`, `visible-xs`, `visible-sm`
- **Text/layout utils**: `text-center`, `text-muted`, `text-uppercase`, `text-right`, `pull-left`, `pull-right`, `sr-only`, `clearfix`, `img-responsive`

### Only reachable via the un-overridden theme fallback

`layouts/_default/list.html` is **not** overridden, so blog index, `/categories/*`
and `/tags/*` still render the theme's legacy two-column layout: `col-md-9` +
`col-md-3` sidebar, with `panel`, `panel-default`, `panel-heading`,
`panel-title`, `panel-body`, `nav-pills`, `nav-stacked`, and the `pager` /
`previous` / `next` pagination component.

This is the largest single rewrite surface and it is invisible from `layouts/`.

## Tailwind mapping

Only `.container` ships as real CSS in `web/app/globals.css` — its stepped
750/970/1170px widths have no Tailwind equivalent (`max-w-*` is a single value).
It is defined with `@utility container`, which **replaces** Tailwind's built-in
container; a component-layer rule would lose to it, since the utilities layer
outranks components.

Everything else maps onto stock utilities and is deliberately not reimplemented:

| Bootstrap | Tailwind |
|---|---|
| `container-fluid` | `w-full px-gutter` |
| `row` | `flex flex-wrap -mx-gutter` (or drop it for `grid`) |
| `col-md-4` | `md:w-1/3 px-gutter` |
| `col-md-3` | `md:w-1/4 px-gutter` |
| `col-sm-6` | `sm:w-1/2 px-gutter` |
| `col-sm-12` / `col-md-12` | `w-full px-gutter` |
| `hidden-xs` | `max-sm:hidden` |
| `hidden-sm` | `sm:max-md:hidden` |
| `hidden-md` | `md:max-lg:hidden` |
| `hidden-lg` | `lg:hidden` |
| `visible-xs` | `sm:hidden` |
| `visible-sm` | `hidden sm:max-md:block` |
| `text-center` / `text-right` | `text-center` / `text-right` |
| `text-uppercase` | `uppercase` |
| `text-muted` | `text-white/45` |
| `pull-left` / `pull-right` | `float-left` / `float-right` |
| `clearfix` | `after:table after:clear-both` |
| `img-responsive` | `max-w-full h-auto block` |
| `sr-only` | `sr-only` |
| `btn btn-template-main` | component using `bg-accent rounded-card` tokens |
| `panel*` (sidebar widgets) | component using `border-white/6 rounded-card` |

Breakpoint names in `globals.css` are redefined to Bootstrap's values
(`sm:768px`, `md:992px`, `lg:1200px`), so `col-md-4` → `md:w-1/3` lands on the
same pixel. Tailwind's defaults (640/768/1024/1280) would silently shift things.

## Bootstrap JavaScript

Genuinely load-bearing:

- **Dropdown** — `data-toggle="dropdown"` (`nav.html:36,135`). The theme hooks
  `show.bs.dropdown` / `hide.bs.dropdown` to animate the slide
  (`front.js:140-154`); hover-to-open fakes a click (`front.js:157-161`).
- **Collapse** — the hamburger, `data-toggle="collapse" data-target="#navigation"`
  (`nav.html:15`). Stock behaviour, nothing overrides it.
- **Affix** — `data-spy="affix" data-offset-top="62"` (`nav.html:1`). Deprecated
  even within Bootstrap 3's own docs.

Not actually Bootstrap:

- **`.modal`** — `layouts/shortcodes/image-modal.html` is a hand-rolled lightbox
  (vanilla JS: open/close, prev/next, keyboard, swipe). It reuses Bootstrap's
  class name for styling only. No `data-toggle="modal"`, no `modal()` plugin,
  **zero dependency on Bootstrap JS**. A naming collision, not a dependency.
- **Owl Carousel** — separate jQuery plugin (`front.js:81-136`).

## Dead code

Worth deleting rather than porting:

- **`animate.css`** (76KB) — loaded at `headers.html:55`, but no template,
  shortcode, content file or data file sets `data-animate`, `data-animate-hover`
  or `data-animate-always` anywhere. Its only consumer (`front.js:164-212`) has
  nothing to act on.
- **`#search` collapse** (`nav.html:154`) — a `navbar-form` search box with no
  button anywhere targeting it. Unreachable.
- **`contact-form-ajax`** (`front.js:38`) — no element carries the class; the
  live form posts straight to Formspree.
- **Bootstrap tooltip init** (`front.js:249`) — no element sets
  `data-toggle="tooltip"`.
- **Google Maps** (`gmaps.init.js`, `hpneo.gmaps.js`) — `enableGoogleMaps` unset.

## Theme classes that look like Bootstrap but are not

From `style.marsala.css`, plan these separately: `.bar`, `.no-mb`,
`.background-white` / `-gray` / `-pentagon`, `.same-height-row` / `-always`
(JS-driven, `front.js:340-365`), `.list-style-none` (used inside
`data/carousel/*.yaml` description HTML).
