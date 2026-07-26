# The standalone-page port — galleries, static pages and the contact form

How the Next.js app serves the eight non-blog pages at Hugo's exact URLs. Board item #9.

> **2026-07 update — restoration retired.** The photo restoration service was deprecated: the
> `restoration` page, its 8 blog posts, and the now-empty restoration/colorization/digitization/
> retouching taxonomies were removed, and their URLs 301 to `/` and `/blog/` (see `netlify.toml`).
> Counts below (the "eight pages", the Restoration table row, its BeforeAfter/standalone-image
> tallies, and the per-page `NavButton` totals) describe the port as shipped and are left as the
> historical record — the live app now serves **seven** standalone pages.

> **2026-07 update — behind-the-scenes gallery added.** A fourth portfolio gallery,
> `photos/behind-the-scenes` (`/photos/behind-the-scenes/`, `/en/photos/behind-the-scenes/`),
> was added for the on-set photography service: `dark-gallery`, 1 gallery, 6 images, all six
> pulled from the 2026-07-26 Forgotten Tales post and already carried by
> `lib/image-dimensions.json`. It is the first page on this surface with no Hugo ancestor — no
> `content/fr` source, no `languages.toml` menu entry (see the note in `lib/nav-menu.ts`), and
> nothing in the Hugo tree to diff its head tags against. The live app now serves **eight**
> standalone pages over 18 route shims. It also takes the homepage carousel to four slides,
> which is what `lib/content/homepage-data.ts` and `components/home/carousel/carousel-slide.tsx`
> have always described.

The Hugo-side styling reference is `docs/gallery-pages.md`; the components these pages render
are in `docs/mdx-components.md`; the head-tag contract is `docs/seo-contract.md`.

## What this surface is

| Page | Route | `page_class` | Notes |
|---|---|---|---|
| Portraits | `photos/portraits` | `dark-gallery` | 4 galleries, 16 images, 4 `wide` |
| Events | `photos/events` | `dark-gallery` | 1 gallery, 10 images |
| Wildlife | `photos/wildlife` | `dark-gallery` | 2 galleries, 11 images |
| Restoration | `restoration` | `dark-gallery` | 3 BeforeAfter sliders, 1 standalone image |
| Videos | `videos` | `dark-gallery` | 5 YouTube iframes |
| Photos index | `photos` | — | a 3-link list; the only page with a `date` |
| SMS prices | `smsPrices` | — | `noindex`; URL is `/smsprices/` |
| Contact | `contact` | — | Formspree form, 3 Font Awesome icons |

16 routes — eight paths × two locales. **Most of the work was already done**: items #2–#8 shipped
the gallery grid, the modal with its scoping and counter, the Cloudinary loader, `BeforeAfter`,
and the page reader's blueprint. This item is largely routing, one stylesheet, and the contact
form.

## Routing

Sixteen five-line shims over `lib/pages/content-page.tsx`, matching the shim pattern in
`docs/routing-and-chrome.md`. No `generateStaticParams` and no dynamic segment.

A `[...slug]` catch-all was rejected. It would sit at the same level as `blog`, `tags`,
`categories` and `authors` and would have to be trusted not to swallow them; eight pages with
fixed, indexed URLs are cheaper as eight files, and a literal route cannot disagree with
`meta.json` about where a page lives.

`ContentPagePath` is a union rather than `string`, so a shim naming a folder that does not
exist is a type error instead of a silent build-time 404 with nothing pointing at the typo.
Note `smsPrices` keeps its camelCase folder name while its URL is `/smsprices/` —
`pagePermalink` lowercases.

`lib/content/page.ts` is the fifth content reader, a sibling of `blog-post.ts` rather than an
extension of it: the two share four lines of file I/O and disagree on everything else, and
merging them would produce a return type where half the fields are absent depending on the
caller.

## One skin for all eight pages

The largest deliberate deviation here.

`contact`, `photos` and `smsPrices` set no `page_class`, so **Hugo renders them light** — white
Bootstrap page, grey textured heading band, dark text. But `globals.css` puts
`--color-surface-page` (`#1a1212`) on both `html` and `body` app-wide, so there is no light
surface left for them to sit on. A faithful port would give them dark body, light band and
dark-text-on-dark.

So all eight pages render the `dark-gallery` skin, band included. `isDarkPageHeading` still
encodes Hugo's real condition and is what to re-enable if the three light pages ever get a
light skin back, but `content-page.tsx` does not consult it.

The alternative — a second "plain dark" skin for those three — would have meant either
duplicating `post.module.css` or reworking item #8's verified blog surface. Same reasoning the
blog index and term pages already used (`docs/blog-port.md`, "Index and term pages render dark").

Visible consequence: contact's phone/email block centres instead of left-aligning, because
`.body > p` centres direct-child paragraphs.

## `components/pages/page.module.css`

Ports `custom.css:427-715` — the `.dark-gallery #post-content` family. A module rather than
utilities for the reason `post.module.css` already documents: every source rule is a descendant
selector off one wrapper, and the elements are produced by MDX.

Three decisions worth knowing:

- **`#post-content::before` is dropped.** The `calc(-50vw + 50%)` full-bleed breakout paints
  `#1a1212` edge to edge; `--color-surface-page` *is* `#1a1212` and already covers `html` and
  `body`. Exactly the call `post.module.css:15-19` records for the `.dark-blog` twin.
- **`list-style` and `padding-left` are restorations, not ports.** The source styles only colour
  and measure because Bootstrap and the browser default supply the marker and the indent.
  Tailwind's preflight zeroes both, so porting the source rule alone renders restoration's six
  service lists and smsPrices' price list as unmarked runs of text. See the known gap below —
  the blog surface has this defect today.
- **Links are gold and undecorated**, where `post.module.css` underlines them. Not an
  inconsistency: there is no `.dark-gallery … a` rule to port, so these pages fall through to
  the theme's bare `a { color: var(--primary-accent) }`, while `.dark-blog #post-content a`
  (`custom.css:1448`) adds the underline. The two files disagree because the two cascades do.

### The two rules that were waiting for this item

Both are scoped to the page class, so neither could be written before it existed, and neither
can live in `page.module.css` — CSS Modules hash each file's class names independently, so a
selector written there would name a class appearing in no other file's output. `PageBody`
renders the unhashed `dark-gallery` class the way `PostBody` renders `dark-blog`.

- `nav-button.module.css` — the outlined standalone CTA (`custom.css:597-613`).
- `before-after.module.css` — the muted main caption (`custom.css:662-664`).

`:not(.galleryOverlay)` on the nav-button rule is load-bearing, not defensive: without it the
page rule scores (0,2,0) against `.galleryOverlay`'s (0,1,0) and wins, restyling the very
gallery-cell CTAs that block exists to define. The source scopes to `.flex-images` instead;
equivalent on the current corpus, where all 34 `NavButton` calls across the eight pages sit
inside a `FlexImages` — verified, not assumed. A bare `NavButton` added later would be outlined
here and gold in Hugo.

## Font Awesome, and the seam that does not exist

Content writes bare `<i class="fab fa-2x fa-facebook">` against the CDN stylesheet at
`headers.html:51`, which the Next port deliberately does not load. Left alone those render as
empty inline elements: the contact page's two social links become invisible and its submit
button loses its glyph.

**The MDX component map cannot intercept them.** MDX routes only *markdown-generated* elements
through `components` — literal JSX in the body compiles to `_jsx("i", …)` with a string tag.
Verified against `@mdx-js/mdx` directly after an `i: FaIcon` entry silently did nothing:

```
_jsx(_components.em, …)   ← markdown *emphasis*, goes through the map
_jsx("i", …)              ← literal <i> in the body, does not
```

A rehype plugin is the other obvious route and is rejected on purpose: `mdx-runtime.ts` and
`scripts/migrate-content.ts` both run with no plugins specifically so the configuration the
compile gate proves and the configuration that renders are the same one.

So the rewrite happens at migration time, in `scripts/lib/html-jsx.ts` where every other raw-HTML
rewrite already lives. It is keyed on a tag-and-class pattern rather than on a page, so it stays
a general rule; an `<i>` with content, or without a `fa-` class, is left alone and still renders
as an italic. `FaIcon` is the sixth entry in `mdxComponents` and the only one with no Hugo
shortcode behind it.

Two things this cost, both worth recording:

- **The class attribute is written in both quoting styles in the same file.** contact.md uses
  double quotes for the submit button's icon and **single quotes** for the two social icons.
  Matching only double quotes converted one of three and left the others empty — precisely the
  invisible failure the transform exists to prevent.
- **An unknown `fa-` class throws** rather than falling back. The migration converts *any*
  `fa-` icon, so a class with no glyph here would otherwise render an empty element — invisible
  on the page and invisible in review.

The glyphs are hand-drawn equivalents, not copies of Font Awesome's paths, matching the choice
`components/home/icons.tsx` documents.

## The contact form

**Unchanged markup, styled where it stands.** The form stays a plain `method="post"` to
`https://formspree.io/f/mjkyajaa` with no `onSubmit` and no client handler, because
`contact_form_ajax = false` today and the form is the site's only lead channel.

Its Bootstrap classes — `row`, `col-sm-*`, `form-group`, `form-control`, `btn-template-main`,
and the theme's `.heading` — ship as real CSS in `globals.css`. That is the single exception to
the rule stated there that Bootstrap classes are not reimplemented, and it holds for a specific
reason: those classes live inside `content/pages/contact/{fr,en}.mdx` as raw HTML, and
`web/content/` is **regenerated wholesale** by `npm run migrate:content` at cutover. Editing the
markup by hand would be overwritten on the next run; teaching the migration to special-case one
page would put content-specific knowledge into a script that is otherwise content-agnostic.

Values are Bootstrap 3.3.7's own with the theme's two overrides folded in: `.form-control:focus`
takes the gold border and glow (`style.marsala.css:3270`) and `.btn-template-main` is
white-on-gold (`:555`). Both read from `--color-accent`.

`@layer components` is deliberate — CSS Modules are emitted outside Tailwind's layers and
therefore outrank it, so `page.module.css`'s `.body h3` keeps its margin against `.heading h3`
rather than the two racing on source order.

`gtag_report_conversion` is kept verbatim. It is defined in both contact files and **called by
nothing** — dead in Hugo too, since the submit button carries no `onclick`. Ported as-is rather
than dropped, because removing it is a content decision, not a port decision.

## The `/photos/` byline

`photos/meta.json` is the only page meta carrying a `date`, and `single.html:44` gates its
byline block on `.Params.author OR .Params.date`. So `/photos/` alone renders a right-aligned
uppercase date line — `4 avril, 2025` — with no author beside it. Reproduced.

It is also the only page emitting `og:updated_time`: that tag is `with .Lastmod`, and `.Lastmod`
falls back to `.Date`, which the other seven do not have.

## Verification

Ground truth is a real `hugo --gc --environment production` build, **not** `--minify` — the
minifier collapses `, ` to `,` inside attribute values and produces false `keywords` mismatches.

| Check | Result |
|---|---|
| `<title>`, `<h1>`, `description`, `keywords`, `robots`, `googlebot`, `author`, `og:title`, `og:description`, `og:type`, `og:url`, `og:image`, `og:updated_time`, `canonical` | **0 differences across all 16 pages** |
| Component counts vs source | portraits 16 / events 10 / wildlife 11 ImageModal, restoration 3 BeforeAfter, videos 5 iframes — all exact |
| Modal scoping | portraits' 4 galleries hold 6/4/2/4; every trigger assigned to exactly one root, none lost |
| Counter | reads `1..6/6` in portraits' first gallery, never `1..16/16` |
| Standalone images | restoration 1, smsPrices 2 — outside any gallery, so no nav and no counter |
| `noindex` | `smsprices` only; `noindex,nofollow` plus the four googlebot flags |
| hreflang | fr / en / x-default present and correct |
| Cloudinary | every gallery image `f_auto,q_auto,w_*,c_limit` with a real srcset; `sizes` 12 grid + 4 wide |
| JSON-LD | exactly one `ImageObject` per page that has an ImageModal, none on contact/photos/videos |
| Migration | `migrate:content:check` passes, 258 outputs byte-identical, 170 URLs verified |
| Leaked shortcodes | zero `{{<` |

Modal scoping and the counter were verified **by mechanism** rather than by eye — the check
reproduces `ImageModal.handleClick`'s `closest('[data-gallery-root]')` +
`querySelectorAll('[data-modal-trigger]')` against the exported HTML. The Chrome extension was
not connected during this work.

## Known gaps

- **The Formspree submission is not confirmed.** Markup, action, method, `encType` and the three
  field names (`name`, `email`, `message`) are verified identical to Hugo's, and no JS touches
  the form — but no message has been sent through a deploy preview. That acceptance criterion is
  open.
- **No visual side-by-side.** Everything above is structural or computed-value evidence.
- ~~**Blog lists lose their markers.**~~ **Fixed.** `post.module.css` set colour and line-height
  on `ul`/`ol` but never restored what Tailwind's preflight zeroes, so the 6 blog posts using
  bullet lists rendered them unmarked and unindented. Found while porting these pages, which
  needed the same declarations; `post.module.css` now carries them too. A CSS-only change, so
  item #8's 430-page head-tag parity is untouched.
