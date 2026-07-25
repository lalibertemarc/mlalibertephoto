# The homepage port

How `layouts/index.html` and its five section partials became `lib/pages/home.tsx`, why the
carousel's animations are driven imperatively, and the three places where reading `custom.css`
would have given the wrong answer. Board item #7.

## Composition

```
lib/pages/home.tsx
├─ HomeCarousel        client — Embla, the only JS on the page
├─ FeaturesSection     server
├─ TestimonialsSection server
├─ CtaSection          server
└─ RecentPostsSection  server (async — reads blog meta)
```

Order follows `layouts/index.html:20-28`: the CTA sits **before** recent posts, not after.

There is no page-level `.container` and no page-level `<h1>`. Every section is full-bleed with
its own inner container, so a page-level container would clip each section's background to
content width; and the page's only `<h1>` is the active carousel slide's title. The placeholder
`home.tsx` had both and rendered an `aboutUs` block the real homepage has never shown.

`clients.html` is not ported — `[clients] enable = false`, so it renders nothing today.

## Data

`lib/content/homepage-data.ts` exposes `getCarouselSlides()`, `getFeatures()`,
`getTestimonials()` over the JSON that `scripts/migrate-content.ts` writes. Static imports, not
`fs` reads: these are three small checked-in arrays, which is the `lib/messages.ts` case rather
than the `blog-posts.ts` one (that module is async because it enumerates 77 unknown directories).

Two things worth knowing:

- **Sorting is mandatory, not defensive.** The migration writes items in source-filename order,
  so `carousel.json` is weight `2,1,3,4` — unsorted, the hero opens on Events instead of
  Portraits. Hugo sorts at render time; this sorts once at module load.
- **Testimonials are deliberately not sorted.** `TestimonialSchema` has no `weight`, and the
  array order already *is* production's order (Hugo ranges a data map, which iterates by key —
  the filename — and the migration wrote them in that same order). Sorting by anything else
  would diverge from the live site rather than match it.

The schemas are re-parsed here even though the migration already validated them. That parse ran
once, against the source YAML; the JSON read here is a separate checked-in artefact that can be
hand-edited or left behind by a schema change. Sixteen objects cost nothing to re-check, and it
makes this module independent of whether the general build-time validation item ever lands.

## The carousel

### Why the active class is set imperatively

Owl adds `.active` to the current `.owl-item` (`addClassActive: true`), and four CSS behaviours
hang off it: Ken Burns on the image, and three `carouselFadeUp` animations staggered at 0.2s,
0.4s and 0.55s. Those four elements are `opacity: 0` by default — the animation's `forwards`
fill is the *only* thing that makes them visible.

Embla has no equivalent. `carousel.tsx` toggles a `data-active` attribute directly on refs
inside `emblaApi.on('select')`, outside React's render cycle, and the remove → forced reflow
(`void el.offsetWidth`) → add sequence runs **unconditionally**:

```ts
next.removeAttribute('data-active')
void next.offsetWidth // force a style flush so re-adding restarts the animations
next.setAttribute('data-active', 'true')
```

CSS animations do not replay when a class is re-added within the same frame, and the carousel
loops — slide 1 becomes active again every cycle and must animate again. Deriving `data-active`
from render state usually survives this, because each `select` is its own commit with a paint
between. But `reInit` (a resize, a breakpoint change) can re-fire `select` for an unchanged
index, and React's automatic batching can then coalesce the off and on into one commit that
never paints the off state — at which point the animations silently stop replaying. The reflow
costs one layout read a few times a minute and converts "should replay" into "does replay".

Verified in the browser: after cycling back to slide 0, its `h1` reports
`carouselFadeUp:running` and its image `kenBurns:running`.

React state holds only the pagination dot index.

### Embla's loop does not clone

Worth knowing because Owl's *does*, and the clone-vs-real desync is a classic source of
"my JS-added class vanished" bugs. Embla translates the real slide elements by `± loopSize`;
no nodes are created or destroyed. Refs stay valid for a slide's whole lifetime and
`selectedScrollSnap()` returns indices into the real array. Build the ref list from the same
`.map()` that renders the slides — never by querying the DOM.

### The timing was misread in the brief

The board's acceptance criterion said "autoplay 2000ms". That conflates two different numbers:

| params.toml | Owl option | Meaning | Value |
|---|---|---|---|
| `slide_speed = 2000` | `slideSpeed` | transition duration | 2000ms |
| `auto_play = true` | `autoPlay` | interval | **5000ms** |

`auto_play = true` reaches Owl as a boolean, and 1.3.2 turns a boolean `true` into its own
5000ms default. Confirmed against the running site:
`$('.homepage').data('owlCarousel').options.autoPlay === 5000`. The port matches the live site;
the criterion was amended on the board.

**Embla's `duration` is not milliseconds.** It feeds a friction model. `duration: 125` measured
5740ms per slide; `44` gave ~1775ms; **`50` measures ~1933ms**, which is the value in the file.
Re-measure rather than convert if it ever needs changing.

### Pause on hover needs two options, not one

```ts
Autoplay({ delay: 5000, stopOnMouseEnter: true, stopOnInteraction: false })
```

Both are required and both differ from the defaults. `stopOnMouseEnter` is `false` by default,
so hover would not pause; `stopOnInteraction` is `true` by default, so the first hover or drag
would stop autoplay **permanently**. Verified: 7s hovering does not advance, and it resumes on
leave.

### Reduced motion is two mechanisms

A media query cannot stop a timer, so the preference is read twice:

- **CSS** (`carousel.module.css`) kills Ken Burns and the fade-ups. It must also restore
  `opacity: 1` — dropping the animation alone would leave the hero text permanently invisible,
  which is far worse for that visitor than the motion. The block therefore covers both the
  inactive and the `[data-active]` selectors.
- **JS** (`use-prefers-reduced-motion.ts`) stops autoplay and makes dot clicks jump instantly
  via `scrollTo(index, jump)`.

The hook uses `useSyncExternalStore`, not `useState` + `useEffect`: `matchMedia` is an external
store, and the server snapshot gives the static export a defined answer instead of rendering one
value and immediately setting another. It returns `false` on the server — assume motion is fine,
so a reduced-motion visitor sees autoplay stop on hydration rather than a motion-tolerant
visitor getting a carousel that never starts. The CSS half applies before any of it runs.

### The no-JS story is better than Hugo's

Owl's own CSS is `.owl-carousel { display: none }` until its JS runs, so Hugo's hero is **blank**
until jQuery and Owl download and execute. Embla's base structure is a correct layout on its own
(`overflow: hidden` + `display: flex` + `flex: 0 0 100%`), so slide 1 shows immediately.

For that to be true, slide 1's `data-active` must be a **literal in JSX**, not state and not an
effect — effects never run during the export pass. Confirmed in `out/index.html`:
`data-active="true"` appears exactly once, on Portraits.

### Images

`next/image` with `fill` + `sizes="100vw"`, `priority` on the first slide only.

`fill` is not a convenience here. Three of the four slide images have **no entry in
`lib/image-dimensions.json`** — that manifest is generated by scanning content MDX, and these
come from `content/data/`. `fill` needs no intrinsic dimensions and is the literal equivalent of
the source's `position:absolute; width:100%; height:100%; object-fit:cover`.

An earlier version marked slides 2–4 `loading="eager"`, reasoning that Embla parks them just
outside a clipped viewport where lazy-loading's proximity heuristic might defer them. That was
wrong: Next emits a **preload link per eager image**, so four full-bleed heroes raced the one
that actually matters and the `priority` hint bought nothing. They are now left at the default
lazy, and the export preloads exactly two images — the logo and the Portraits slide.

## Where custom.css lies

Three values could not be read off the stylesheet. All three were caught by diffing *computed*
styles against a running `hugo server`, and all three follow the same rule
`docs/routing-and-chrome.md` records for the footer button: **where declaration and computed
value disagree, computed wins.**

### 1. The gold rule under every section label

`custom.css` says nothing about it. The theme's `.heading h2` — a class-plus-element selector,
therefore more specific than `.hp-section-label` alone — supplies:

```
display: inline-block;  border-bottom: 5px solid #c9a84c;
padding: 0 0 10px;      margin: 20px 0 0;
letter-spacing: 0.06em;  /* NOT the 0.18em custom.css declares */
```

So the eyebrow's tracking is `--tracking-label`, not `--tracking-eyebrow`, and its declared
`margin-bottom: 0.6em` never applies. Porting the declared values got the tracking wrong and
dropped the gold rule entirely — a prominent piece of the design that exists nowhere in
`custom.css`.

### 2. Testimonial card padding

`custom.css` declares `2rem 1.5rem 1.5rem`. The theme's `.testimonial { padding: 20px }` sits on
the same element and wins: **20px uniform**.

### 3. Line height, everywhere

Bootstrap sets `body { line-height: 1.428571429 }` and `h1–h6 { line-height: 1.1 }`. Tailwind's
preflight sets 1.5 on `html` and makes headings inherit it. Every ported element that did not
name its own leading rendered ~5% tall, and headings ~36% tall — a section label boxed at 27px
against Hugo's 24px.

Both are now in `globals.css`'s `@layer base`, next to the 10px root and the 1.4rem body size
that exist for exactly the same reason. Elements with an explicit `leading-*` are unaffected,
so the carousel `h1` (1.15) and blog card titles (1.4) still override, just as they override the
theme rule in the source.

**This changes more than the homepage.** It is the correct Bootstrap reproduction and the
migration's whole premise, but any page verified before this landed was verified against the
wrong baseline.

## Bootstrap grid, reproduced

| Source | Tailwind | Note |
|---|---|---|
| features `.row` | `-mx-gutter flex flex-wrap` | The negative margin is load-bearing — it cancels the container's padding so outer cards sit flush. Without it the grid is 30px narrower. |
| recent posts `.row` | `flex flex-wrap` — **no** negative margin | See below. |
| features `col-md-4` | `w-full px-gutter md:w-1/3` | **No `sm:` variant**, matching the source — cards are full-width across the entire 768–991px band. Reads like an oversight in the original; preserved, not corrected. |
| recent posts `col-md-3 col-sm-6` | `w-full px-gutter sm:w-1/2 md:w-1/4` | |

**The two rows are not the same, and copying one to the other is wrong.** `recent_posts.html`
nests its row inside a `col-md-12` that `features.html` does not have. That wrapper's 15px
padding exactly cancels the row's −15px margin, so the recent-posts row spans the container's
*content* box while the features row spans its full width. Applying `-mx-gutter` to both made
blog cards 263px wide starting at x=383, against Hugo's 255px at x=398 — caught by measuring
bounding boxes, not by looking. Correct values: feature cards `w360` from x=383, blog cards
`w255` from x=398.

Hugo's manual row-chunking in `features.html:16-21` (`$total_rows`, `seq`, `div`, `mod`) exists
only because Bootstrap 3's float grid needs an explicit `<div class="row">` break every `cols`
items. `flex-wrap` wraps natively, so the chunking is dropped rather than reproduced.

## Deliberate departures

| Change | Why |
|---|---|
| **Testimonials are a static grid, not a slider** | In Hugo this is a second Owl carousel showing 4 of 6, swipeable, autoplay off. Now all 6 render at the same column counts (4/3/2/1) with zero JS. Two testimonials that needed a swipe are simply visible. |
| **The hero CTA is locale-aware** | `carousel.html` hardcodes `href="/contact"` with no locale branch, so the English homepage links to the French contact page. Now `pagePermalink('contact', locale)`. Same bug, same fix, in `see_more.html`. |
| **Dates come from `Intl`, not the `Months` catalog** | Hugo formats `"2 January, 2006"` then string-replaces month names from the theme's i18n table, whose French August is `aout` — no circumflex. `formatPostDate` renders `août`. The comma is kept, so the shape is otherwise identical. No post currently on the homepage falls in August, so this is invisible today. |
| **Testimonial attribution is `figure`/`figcaption`** | The source puts the author in an `<h5>`, injecting six phantom fifth-level headings into the page outline. The quote's source is not part of the quote. |
| **Icons are inline SVG** | Hugo pulls all of Font Awesome 6 from a CDN for eight glyphs. `components/chrome/icons.tsx` already set the no-icon-font precedent. Drawn **filled**, matching FA's solid family — an outline version reads visibly lighter at 22px. |
| **The post summary is dead but present** | `hide_summary = true` in both locales, so `.hp-blog-card__summary` has never rendered. Kept behind a `HIDE_SUMMARY` constant so reviving it is a one-line change. `BlogPostSummary.summary` is never populated — no MDX-body summariser exists. |

## `formatPostDate` and the date trap

`lib/dates.ts`. The rule `lib/permalink.ts` documents at length applies to display too, and the
failure mode is worse because it is environment-dependent.

A raw frontmatter date carries a `-04:00`/`-05:00` offset. `new Date(raw)` correctly yields a UTC
instant — but formatting that instant without an explicit `timeZone` uses the **build machine's**
zone, which is Netlify's runner in production and something else on a laptop. The post at
`2026-03-02T23:30:00-05:00` is `2026-03-03T04:30Z`; formatted in a UTC build it reads "3 mars"
while its own URL says `/blog/2026/03/02/`.

So the date never round-trips. `urlDateFromRawDate` — the same literal-string extractor that
builds URLs — yields Y/M/D, `Date.UTC` builds an instant from those raw numbers, and
`timeZone: 'UTC'` pins the formatter. `Intl` supplies the month name and nothing else; day/month/
year order is assembled by hand because bare `en` would emit "July 19, 2026".

Verified across `UTC`, `Pacific/Auckland` (+13), `Pacific/Honolulu` (-10), `Asia/Tokyo` and
`America/Toronto`: the DST-boundary post renders "2 mars, 2026" in all five. The four homepage
dates match Hugo's output string-for-string.

## Two latent divergences

Neither is visible today; both would surface the moment content changes.

**A malformed date anywhere fails the whole export, not just the blog.** `urlDateFromRawDate`
throws on anything that does not start `YYYY-MM-DD`, and `SiteLayout` calls `listBlogPosts` for
the footer on *every* route — so one bad `meta.json` takes down all 7 pages. This is the same
fail-loud stance as `FeatureIcon`'s throw and the strict schemas, and all 77 current dates are
well-formed. Worth knowing before diagnosing a build failure that names the homepage.

**Feature descriptions are rendered as plain text, but the schema calls them markdown.** Hugo
runs `index $element.description $lang | markdownify`; `features-section.tsx` renders the string
as a React child. None of the six descriptions contains markdown syntax, so the output is
identical — but adding a `**bold**` to one would render the asterisks. The carousel's
`description` is the opposite case and is handled: it is raw HTML in the source and goes through
`dangerouslySetInnerHTML`.

## `listBlogPosts` is now cached

Three call sites read the same 77-post tree in one render — the footer's three, the homepage's
four, the blog index's all. `readAllPosts` is wrapped in `React.cache()` keyed on **locale
alone**, with slicing outside it, so the three share one filesystem sweep instead of three.
Folded in while the function was already being touched for the `date` field.

## Verification performed

- `npm run typecheck`, `npm run lint`, `npm run build` clean; export produces 7 routes.
- **A runtime bug that all three missed**: `autoplay.play()` in the reduced-motion effect threw
  `Cannot read properties of undefined (reading 'internalEngine')` on first render, before
  `emblaApi` existed. The static export cannot catch this because effects never run during it.
  The effect now guards on `emblaApi`. Worth remembering that a green build says nothing about
  whether a client component mounts.
- Computed styles diffed against `hugo server` at desktop width, element by element: section
  labels, subtitles, feature cards and icons, testimonial cards/quotes/authors/roles, blog card
  titles and meta, CTA, and section padding — all match, including the three "custom.css lies"
  above once fixed.
- Carousel behaviour: single-slide transition measured at 1933ms; hover holds for 7s without
  advancing and resumes on leave; a synthetic touch-type pointer drag advances the slide;
  animations confirmed replaying after a loop back to slide 0.
- Content: 6 features, 6 testimonials, 4 blog cards, 4 dots, 0 summaries, 0 arrow buttons.
- Both locales: `<html lang>` correct, English copy throughout `/en/`, and every slide CTA
  resolves to `/en/contact/` rather than the source's `/contact`.
- `out/index.html` contains no `jquery`, `owl` or `owlCarousel`; exactly two image preloads.

### Not verified

- **Mobile breakpoints were verified by mechanism, not by eye.** The automation could not resize
  the viewport below 992px — `resize_window` had no effect on `innerWidth`, the same limitation
  `docs/routing-and-chrome.md` records for the burger menu. The `991px`, `767px` and `480px`
  rules were confirmed present and correctly scoped in the CSSOM, and drag was verified
  functionally with synthetic pointer events, but nobody has *looked* at this page on a phone.
- **`prefers-reduced-motion` was verified by rule presence, not by emulation.** The media query
  cannot be forced through the available tooling. The CSS block is confirmed to exist and to
  cover both the inactive and `[data-active]` selectors; the JS path is code-reviewed only.
- The testimonials grid has no historical screenshot to diff against — it was always a slider —
  so its layout is judgement rather than comparison.
