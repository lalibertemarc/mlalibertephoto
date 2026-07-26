# The blog port — posts, index, pagination and taxonomy

How the Next.js app serves 430 blog-surface pages at Hugo's exact URLs. Board item #8, which
also absorbed item #15.

Covers the post pages, the blog index, and all three taxonomies. The Hugo-side styling
reference is `docs/blog-post-styling.md`; the head-tag contract is `docs/seo-contract.md`.

## What this surface is

| Kind | Pages | Route |
|---|---|---|
| Posts | 154 (77 × 2) | `blog/[year]/[month]/[day]/[slug]` |
| Blog index | 2 | `blog/` |
| Blog pagination | 4 | `blog/page/[page]` |
| Term pages | 258 (129 × 2) | `{tags,categories,authors}/[...slug]` |
| Term pagination | 6 | same catch-all |
| Taxonomy hubs | 6 | `{tags,categories,authors}/` |
| **Total** | **430** | |

129 terms = 103 tags + 25 categories + 1 author. 105 distinct tag strings collapse to 103
pages because terms differing only in case share one (`Quebec`/`quebec`, `Sonum Fest`/`sonum
fest`), matching Hugo.

Only three lists exceed one page: `categories/wildlife` (34 posts), `authors/marc-laliberté`
(77), and the blog index (77).

## Rendering MDX

Nothing in the app could render an MDX body before this item. `@mdx-js/mdx` was a
devDependency used only by `scripts/migrate-content.ts` as a compile gate; it is now a real
dependency.

`lib/content/mdx-runtime.ts` is the only place the app evaluates content as code:

```ts
const { default: Content } = await evaluate(body, { ...jsxRuntime, baseUrl: import.meta.url })
const tree = Content({ components: mdxComponents })
```

**`Content(...)` is called as a function, not as `<Content />`.** This is load-bearing.
`findFirstImageModal` walks `props.children` to emit the page's ImageObject block, and a JSX
element's `props.children` is only what was passed *in* — for `<Content />` that is nothing.
Rendered as JSX, the walk returns `null` and every post silently loses its structured data.
Calling the function runs its body once and returns the real nested tree.

This does not render anything. The MDX-generated function turns markdown into elements;
`ImageModal`, `Gallery` and the rest stay opaque element descriptors whose own bodies React
invokes later. No `'use client'` boundary is crossed by the call, which is why no provider
plumbing was needed — `ImageModal` elects its own modal host through a module store,
`GalleryScope` is internal to `Gallery`, and `IntlProvider` already wraps both route groups.

**No remark/rehype plugins**, matching the migration's compile gate exactly. The gate proves
every file compiles, and only for the configuration it used; adding a plugin here would mean
the verified thing and the running thing are no longer the same thing.

Errors are not caught and degraded. A body that parses but references an undefined component
can only fail here — the gate never executes anything — so `lib/content/blog-post.ts` wraps
the call to name the file, and the build fails.

## The four content readers

Each is narrow in a different direction, and they deliberately do not share a body.

| Module | Scope | Body | Consumer |
|---|---|---|---|
| `content/blog-posts.ts` | all posts, one locale | no | chrome, index, term pages |
| `content/site-index.ts` | all posts, both locales | plain text | sitemap, RSS |
| `content/content-dates.ts` | dates only | no | lastmod cascade |
| `content/blog-post.ts` | **one** post, one locale | **compiled** | the post page |
| `content/post-meta.ts` | all posts' meta.json | no | taxonomy grouping |

`blog-post.ts` is separate because the costs do not compose: `listBlogPosts` runs on
essentially every route (the footer's recent-posts block), so compiling bodies there would
fire up to 77 `evaluate()` calls per page rendered. And `site-index.ts` exists precisely to
*avoid* compiling MDX, since its consumers serialise XML.

`post-meta.ts` is memoized at **module scope**, not with React's `cache()`. `cache()` is
render-scoped; this is read from `generateStaticParams` and `generateMetadata` across hundreds
of independent page generations in one build, where a module-level promise is what actually
persists.

`blog-post.ts` keys its `cache()` on `(folderName, locale)` — two primitives. Keying on the
`UrlDate` object would miss every time, because `generateMetadata` and the page component each
destructure their own params into structurally-identical but distinct objects.

## URLs

### Posts

Y/M/D comes from `meta.json`'s stored `urlDate`, never re-derived from the raw date string.
The reason is in `lib/permalink.ts` at length: frontmatter dates carry `-04:00`/`-05:00`
offsets and Hugo uses the date *as written*, so a `Date` round-trip moves
`motherRockersValentinesDayPart2` from `/2026/03/02/` to a URL that has never existed.

Fixed-depth `[year]/[month]/[day]/[slug]` segments. A year is always four digits, so this can
never collide with the literal `page` segment of `blog/page/[page]`.

### Terms, and the slash problem

`LR/Mogrify 2` slugifies to `lr/mogrify-2` and serves from `/tags/lr/mogrify-2/` — a term slug
can contain a path separator. It is the only one in the corpus.

That makes term depth variable, so the routes use a single `[...slug]` catch-all **with
pagination folded into the same array** rather than a nested `page/[page]` folder. One leaf
per taxonomy means one `generateStaticParams` enumerates every URL, with no second route to
agree with about who owns what.

`parseTermParam` reads a trailing `page/N` off the end. `lib/content/terms.ts` asserts at
build time that no term slug ends that way, so a future term that would make the parse
ambiguous fails the build instead of silently serving the wrong page.

### Percent-encoded params

**Segments arrive URL-encoded and must be decoded.** `generateStaticParams` returns
`marc-laliberté` and the export writes a directory with those literal bytes, but the params
handed back to the page carry `marc-lalibert%C3%A9`.

Without `decodeURIComponent`, every accented term — the author, `île-dorléans` — misses its
lookup and renders a **404 into a file at the correct URL**. The build succeeds, the page
exists, and only its contents are wrong. This cost a real debugging pass; it is invisible to
a URL diff, which is why the verification below compares headings too, not just paths.

Slugs are re-normalised to NFC after decoding, matching `slugifyTerm`.

## Title casing — 99 of 129 terms

Hugo does not display the frontmatter spelling. `wildlife` heads its page as **Wildlife**,
`sonum fest` as **Sonum Fest**. Using the raw string would change nearly every taxonomy
heading and `<title>` on the site.

`titleCaseTerm` in `lib/permalink.ts` capitalises every letter following a non-alphanumeric
character, apostrophes and hyphens included:

```
Île d'Orléans              → Île D'Orléans
Parc de la Chute‑Montmorency → Parc De La Chute‑Montmorency
black-bird                 → Black-Bird
```

The first two look like defects and are what Hugo renders — its AP `titleCaseStyle` lowercases
a list of short **English** words, so French articles are capitalised.

Hugo's AP rule and this simpler one are **indistinguishable on the current corpus**: both
reproduce all 129 headings exactly, because no term contains an English stop word anywhere but
the first position. A term like `birds of prey` is the case that would tell them apart — "Birds
Of Prey" here, "Birds of Prey" in Hugo.

The taxonomy hub headings are **not translated**: Hugo titles them from the plural key in
`[taxonomies]`, so the French `/categories/` is headed "Categories" and `/authors/` "Authors".
Reproduced, since these are indexed titles. Translating them is a defensible follow-up.

## What the list pages do and don't show

Two things in the theme's `_default/list.html` never render on the live site, and neither is
ported:

- **No summary, no "continue reading".** Both are gated on
  `.Site.Params.recent_posts.hide_summary`, which `languages.toml` sets `true` for both
  languages. The flag reads like it belongs to the homepage widget; the list template reuses
  it verbatim, so the entire blog index and every term page loses them.
- **No sidebar.** The theme's `col-md-9` + `col-md-3` split carried categories and tags
  widgets. See the deviations below for what replaces the link path they provided.

Pagination is prev/next only — `← Récent` / `Ancien →`, `← Newer` / `Older →` — with no page
numbers and no ellipsis. Hugo emits the pager even when both directions are disabled, so a
single-page term page still shows two inert controls. Reproduced.

One thing the list rows now show that `list.html` does not: **each row carries its post's
categories as pills.** See the section below.

## Terms on posts and cards

Added after the port. Nothing on the site linked to a term page from a post: the sidebar that
carried the tags/categories widgets was dropped (above), and the taxonomy hubs were the only
remaining path to 258 term pages. Tags were authored, validated, and fed to `article:tag` —
and were invisible to a reader.

| Surface | Shows | Component |
|---|---|---|
| Post page, under the body | categories **and** tags | `components/blog/PostTerms.tsx` |
| Post-list row (blog index + every term page) | categories only | same, `variant="card"` |

Categories render as a soft accent fill, tags as an outlined hairline — the distinction is
carried by the skin, not by a visible "Categories:"/"Tags:" label. Each group is its own `<ul>`
so it can take an `aria-label`, which is what gives a screen reader the name a sighted reader
gets from the styling. Those labels reuse `Widgets.categoriesTitle` / `Widgets.tagsTitle`, the
orphaned sidebar strings already sitting in both message files — no new i18n keys.

Tags are deliberately absent from cards: 3–6 pills per row across ten rows out-weighs the
titles they sit under.

Four things this had to get right, all of them pre-existing traps:

- **`SlashSafeLink`, never `Link`.** Seven term slugs end in a dotted segment
  (`/tags/fe-50mm-f1.8/`); `<Link>` reads a trailing dot-segment as a file and strips the
  trailing slash, which then disagrees with the term page's own canonical and both sitemaps.
- **Labels go through `titleCaseTerm`,** so a pill reading "Île D'Orléans" opens a page headed
  "Île D'Orléans". The raw frontmatter spelling would disagree on 99 of 129 terms.
- **Raw `tags`/`categories` stay on `BlogPost` alongside the resolved links.** The head and the
  body want different forms of the same value: `article:tag` carries the raw `Île d'Orléans`,
  the pill displays the title-cased one. Dropping the raw arrays would silently rewrite the
  OG block.
- **Dedupe by slug, not by string,** and skip terms that slugify to nothing — both mirroring
  `deriveTerms`, so a pill can never point at a page that was not generated. `Quebec` and
  `quebec` are one page and must not render two identical links.

`lib/content/post-terms.ts` holds the mapping. It is pure and synchronous, and deliberately
does **not** read the term index: a post shows which terms it carries, not how many posts share
them, so it needs no membership grouping. That is what keeps it callable from `blog-posts.ts`,
which runs on essentially every route via the footer's recent-posts block.

## Prev/next post navigation

Also added after the port, below the terms row. `single.html` has no such block, so unlike
almost everything else on this surface there is no original to reproduce — both of the
decisions below are choices, not ports.

- **Each link shows the neighbour's title.** `Pager` gets away with a bare "Ancien →" because
  its destination is more of the list you are already looking at. Here the destination is one
  specific post, and the title is the only thing that tells a reader whether to follow.
- **A missing neighbour is omitted, not disabled.** `Pager` renders an inert `<span>` at the
  ends because Hugo's pager emits both controls unconditionally. No such contract applies here.

`getPostNeighbours` in `lib/content/blog-posts.ts` is an index lookup, not a read: the
underlying `readAllPosts` is `cache()`d on locale and the footer has already called it while
rendering the same page, so the list is in memory by the time the post page asks.

**It reuses that list's order rather than recomputing it**, and that is the load-bearing part.
The sort runs on `Date.parse(meta.date)` — the parsed instant — because frontmatter dates carry
`-04:00`/`-05:00` offsets and a lexical sort on the raw string misorders posts either side of a
DST change. Re-deriving the order at the call site is exactly how the two would drift.
Newest-first, so the *newer* neighbour is the preceding index.

The layout is a two-column grid rather than `justify-content: space-between`, precisely because
one side is omitted at the ends: with flex the survivor slides to the middle, while fixed tracks
keep the oldest post's "Récent" on the left and the newest post's "Ancien" on the right.

`Blog.postNavigation` was added to both message files for the `<nav>` landmark's accessible
name — the one new i18n key on this surface. `Blog.newer` / `Blog.older` were already there.

Anchors carry `rel="prev"` / `rel="next"`, matching what `Pager` already emits. These are
anchor attributes, not `<link>` head tags; no head tag changed.

Verified across all 140 post pages (70 posts × 2 locales): neighbours match publication order,
and no FR post links to an EN one or vice versa.

> The corpus is **70 posts** as of this change, not the 77 in the table at the top of this
> document — posts have been removed since the port was written. The counts in that table
> (and the 430-page total) describe the port at the time and have not been re-audited.

## The `page/1` alias stubs

Hugo emits a real file for every list's first page — `/blog/page/1/` and one per term, 266
across this surface — as a `noindex` meta-refresh stub pointing at the unsuffixed URL. They are
indexed by crawl discovery, so they cannot simply 404.

`scripts/build-seo-files.ts` **generates** literal 301 rules into `public/_redirects`. Netlify's
placeholder syntax could express most of them in a handful of rules, but not `lr/mogrify-2` —
a named placeholder matches a single segment. Since the term set is known at build time anyway,
literal rules avoid depending on a matching grammar nobody has verified against a deploy, and
cannot drift as terms change.

`netlify.toml` is evaluated ahead of `_redirects`, so the existing moved-term rules
(`/tags/bird/*` → `/categories/bird/`) still win over the generic stub rule.

## Styling

`components/blog/post.module.css` ports `custom.css:1416-1522`. A CSS Module rather than
utilities because every source rule is a descendant selector off one wrapper and the elements
are produced by MDX, so there is no JSX to hang a class on.

Three decisions worth knowing:

- **`#blog-post.dark-blog::before` is dropped.** The fixed full-viewport `#1a1212` pane patched
  a Bootstrap layout whose `html`/`body` background was never dark. `globals.css` sets that
  colour on both, app-wide, so porting it would be redundant paint behind a `position: fixed`
  and a negative `z-index`.
- **Blockquote is written as the computed box, not as the source override.** `custom.css`
  overrides only `padding-left`, so three quarters of the theme's `padding: 10px 20px` survive,
  and it never touches `font-size`, so the theme's flat `14px` survives too. At the 10px root
  that is *larger* than the surrounding `1.2rem` (12px) paragraph. Porting the override alone
  would not reproduce it here: Tailwind's preflight zeroes blockquote margin, padding and
  border, and nothing restores them, so there is no base layer to cascade against.
- **List markers are a restoration, not a port.** `custom.css:1476-1481` styles only colour and
  line-height, because Bootstrap and the browser default supply the marker and the indent.
  Tailwind's preflight zeroes both, so the original port rendered the 6 posts with bullet lists
  unmarked and unindented. Added in item #9, which hit the same thing on the standalone pages —
  `list-style: revert` rather than a literal `disc`, so ordered lists keep their numbers.
- **`pre`/`code` are new work.** Nothing in `custom.css` or the theme styles them on a dark
  background, so production renders Bootstrap's light-grey box on `#1a1212` — visible today on
  `lrmogrifymanualfix` and `imagemagickscriptsrelease`. Reproducing that was rejected. The new
  style reuses the existing embed vocabulary (`--color-surface-hero`, `--radius-embed`,
  `--shadow-embed`) rather than inventing a third depth treatment. `--font-mono` is declared
  explicitly in `globals.css` rather than inherited from Tailwind's default theme.

One cross-module rule: `.dark-blog .flex-images img { box-shadow }` lives in
`flex-images.module.css` behind `:global(.dark-blog)`, and `PostBody` renders that unhashed
class. A selector written in `post.module.css` could never match it — the two modules hash
`.flexImages` independently, so it would name a class that appears in no other file's output.

## The byline

`single.html` carries a quirk, and reproducing the template literally would produce something
different from what the site serves:

- The block is gated on `.Params.author OR .Params.date`, but the names it renders come from
  `.Params.authors` (plural). No post sets the singular, so the gate passes on `date` alone.
- The ` | ` separator is gated on `.Params.author AND .Params.date` — singular again. It is
  unreachable and has never rendered.

Verified output: `Par Marc Laliberté 29 octobre, 2025` and `By Marc Laliberté 29 October, 2025`.
Author linked, date plain, no separator.

Hugo writes the author href without a trailing slash (`/authors/marc-lalibert%C3%A9`) while the
page has one, so every byline link currently takes a redirect hop. The port routes through
`taxonomyPermalink` and emits the trailing slash.

Dates come from `formatPostDate`, which already reproduced Hugo's `2 January, 2006` with
locale month names. Note it renders French August as `août` where Hugo's theme catalog says
`aout` — a deliberate pre-existing deviation recorded in `docs/homepage-port.md`.

## Verification

Ground truth is a real `hugo --gc --environment production` build, **not** `--minify`: the
minifier collapses `, ` to `,` inside attribute values, which shows up as 430 false
`keywords` mismatches. `web/scripts/fixtures/hugo-urls.csv` covers only `kind=page` and cannot
verify list, term or pagination URLs.

| Check | Result |
|---|---|
| Blog + taxonomy URL set | 430 Next vs 430 Hugo, **0 extra, 0 missing** (excluding the 266 `page/1` aliases) |
| `<title>`, `<h1>`, `description`, `keywords`, `robots`, `googlebot`, `author`, `og:title`, `og:description`, `og:image`, `og:type`, `twitter:card` | **0 mismatches across all 430 pages** |
| `canonical` / `og:url` | 10 differ — the paginated pages, deliberate |
| `og:*` block | absent in Hugo on 8 pages — the 4 bannerless posts × 2 locales |
| `article:published_time` | 2 differ by seconds — the known FR/EN date quirk |
| Slash term | `/tags/lr/mogrify-2/` is a leaf; no stray `/tags/lr/` page |
| Accented dirs | `marc-laliberté`, `île-dorléans` written NFC and resolving |
| MDX components | Gallery, BeforeAfter, FlexImages, NavButton, Facebook iframe and fenced code all render; zero `{{<` leaked |
| JSON-LD | exactly one `ImageObject` per post that has an `ImageModal`, none otherwise |

## Deliberate deviations

Recorded here and in `docs/seo-contract.md`.

| Deviation | Rationale |
|---|---|
| Index and term pages render dark, no sidebar | The app's ambient surface is already `#1a1212`; a light column would disagree with every post it links to. The two sidebar widgets are navigation the nav menu and the hubs now cover. |
| Taxonomy hubs are populated | They render **blank** in Hugo — the paginator filters `.Data.Pages` by `Type in mainSections`, which matches nothing on a Kind=taxonomy page. They are indexed anyway. With the sidebar gone they were the only site-wide link path to 129 term pages, on a site already showing 322 URLs as "crawled — currently not indexed". Posts and cards now link terms directly too — see "Terms on posts and cards". |
| Posts and list rows link their terms | Not in `single.html` or `list.html`; the sidebar they replace was. Restores the reader-facing path from a post to related work, and gives the 258 term pages inbound links from indexed content rather than from the hubs alone. |
| Self-referencing canonical on paginated pages | Hugo collapses `/blog/page/2/` onto `/blog/`, asserting that two pages listing different posts are duplicates. Rollback is one line in each of two functions if GSC coverage worsens. |
| OG block emitted for the 4 bannerless posts | Hugo's `$is_valid_image` gate fails on their broken local banner and drops the block entirely, so those pages currently share with no preview at all. The migration already dropped the broken banner, so the port falls back to the default sharing image. |
| `pre`/`code` styled for dark | No source to port; the current rendering is a defect. |
| Byline author links get a trailing slash | Removes a redirect hop. |

## Known gaps

- **`toPlainText` substitutes only the apostrophe** for Goldmark's smartypants. Hugo also
  converts paired quotes, dashes and ellipses, but no title or description in the corpus
  contains any — verified by diffing all four affected tags across every page. A title with
  `"quoted"` or `--` would need more.
- **`docs/seo-contract.md`'s keywords count is stale.** It records 46 posts carrying
  `keywords`; the current corpus has **5**. `external_banner` still measures 46, so the field
  was stripped from ~41 posts on `master` after that doc was written. Corrected there.
- The `/blog/page/1/` redirects are generated but **not verified against a deploy preview** —
  no Netlify environment was available. The rules are literal, so the risk is low.
