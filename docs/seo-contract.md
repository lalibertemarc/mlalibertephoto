# The SEO contract

Everything the Hugo site emits for search engines and social crawlers, and what the
Next.js port must reproduce. This is the *contract*, extracted tag by tag from the
templates and cross-checked against a real build in `public/`. It is the reference for
the `web/lib/seo/` implementation and for the cutover diff in board item #12.

Two audiences: whoever implements the Next side, and whoever later asks "why does the
port emit X when Hugo emitted Y?" — the deliberate deviations are listed at the end.

## Where it all comes from

`layouts/partials/headers.html` is a project override of the theme partial and holds
essentially the entire contract. Partial lookup is by name, so the project copy always
wins; `themes/hugo-universal-theme/layouts/partials/headers.html` is unreachable at
runtime and matters only as a reference for what the override changed.

The override exists because of external banners. Under the theme's original logic an
image is only valid if `fileExists "static/<path>"` — a Cloudinary URL fails that check,
so **every** OG and Twitter image tag would be dropped for the 46 posts that use one.
The override adds an `external_banner` escape hatch. It also adds canonical links
(absent from the theme entirely), `meta_title` support, noindex support, and a `.jpg` →
`jpeg` MIME fix.

### Which template renders what

Hugo exhausts the project's layout directory across all candidate names before falling
back to the theme — it does not interleave "most specific" across project and theme.
Since the project defines `layouts/_default/single.html`, **every** page-kind content
item renders through it, regardless of type or section. Verified: `public/contact/index.html`
and `public/photos/wildlife/index.html` both carry the inline gtag snippet that exists
only in that file.

| Page kind | Template | Notes |
| --- | --- | --- |
| All regular content (blog posts, `photos/*`, `contact`, `videos`, `restoration`, `smsPrices`) | `layouts/_default/single.html` | |
| Homepage | `layouts/index.html` | |
| Lists (`/blog/`, `/tags/`, `/categories/`, `/authors/`) | theme's `_default/list.html` | no project override |
| — | theme's `page/single.html` | **dead**, never reached |

## The tag spec

In emission order. `$title_plain` is `meta_title | default .Title` run through
`markdownify | plainify`; `$description_plain` is `.Description | default
.Site.Params.defaultDescription` through the same.

| Tag | Condition | Value | Fallback |
| --- | --- | --- | --- |
| `robots` / `googlebot` | always | see below | — |
| `<title>` | always | `$title_plain` | `.Title` |
| `author` | always | `.Param "author"` | language param `Marc Laliberte` |
| `keywords` | `len > 0` | `.Params.keywords` | per-language `defaultKeywords` |
| `description` | always | `$description_plain` | per-language `defaultDescription` |
| `generator` | always | explicit `hugo.Generator` call | — |
| `canonical` | always | `.Params.canonical` | `.Permalink` (always, in practice) |
| RSS `alternate` | always | `/index.xml` absolute | — |
| OG block | `$is_valid_image` | see below | — |
| `og:updated_time` | `with .Lastmod` | ISO-8601 numeric offset | — |
| `article:*` | `$is_blog` | see below | — |
| Twitter block | always (image gated) | see below | — |

`$is_blog` is `and (eq .Type "blog") (eq .Kind "page")` — **type and kind, not section**.
List pages are `Kind == "section"`, so they render `og:type: website`.

### robots

```
noindex → "noindex,nofollow"  +  googlebot "noindex,nofollow,nosnippet,noarchive"
else    → "all,follow"        +  googlebot "index,follow,snippet,archive"
```

Exact strings, no interpolation. Only `content/{fr,en}/smsPrices.md` set `noindex`.

### The image chain

```
banner  →  default_sharing_image ("img/logo.png", 782x200)
```

Hugo shipped a third link in this chain, `"img/sharing-default.png"`, which was unreachable —
`default_sharing_image` is always set — and named a file that has never existed. Item #14
removed it. If that param were ever removed too, `fileExists` would silently fail and drop
every image tag rather than erroring.

Validity: external banners are trusted unconditionally; local images must exist on disk.
Dimensions come from `banner_width`/`banner_height` front matter for external banners, or
from Hugo's `imageConfig` probing the real file for local ones. `og:image:type` is derived
from the path's extension string, not from file bytes: `.svg` → `svg+xml`, `.jpg` → `jpeg`,
anything else → extension minus the dot. Comparison is case-sensitive, so a `.JPG` would
fall through to `image/JPG`; no content currently uses uppercase extensions.

### article:\*

Blog posts only. `article:section` takes **the first category only**. `article:tag`
emits one tag per line in front-matter order. All three date tags use Go layout
`2006-01-02T15:04:05Z0700` — ISO-8601 with a **colon-less** numeric offset
(`2025-10-27T08:39:53-0400`). `og:updated_time` uses the same format.

`article:expiration_time` is structurally reachable but dead: no content sets `expiryDate`.
`article:author` never fires: `facebook_author` is unset everywhere.

### Twitter

`twitter:card` is `summary_large_image` only when the page is a blog post **and** has its
own `banner` **and** that image is valid — a page falling back to the default sharing
image stays `summary`. Title truncates at 70 characters, description at 200, both
word-boundary aware with an ellipsis.

`twitter:site` and `twitter:creator` **never render** — `twitter_site` and `twitter_author`
are unset in both config and content.

Note the whole Twitter block and `og:updated_time` sit *outside* the `$is_valid_image`
gate; only `twitter:image` is inside it.

## Front-matter reality

Counted across `content/fr/` + `content/en/`, so each story counts twice.

| Field | Files | Stories | Notes |
| --- | --- | --- | --- |
| `banner` (any) | 154 | 77 | 46 external + 31 local |
| `external_banner` | 92 | 46 | always co-occurs with `banner_width`/`banner_height`/`keywords` |
| `keywords` | 10 | **5** | Was 92/46 when this was written and 1:1 with `external_banner`; since stripped from ~41 posts on `master`. `external_banner` still measures 92/46, so the two are no longer paired. Re-measured during item #8. |
| `meta_title` | 24 | 12 | |
| `noindex` | 2 | 1 | `smsPrices` only |
| `canonical` | 0 | 0 | override never used; canonical is always `.Permalink` |
| `expiryDate` | 0 | 0 | `article:expiration_time` is dead |
| `lastmod` | 0 | 0 | `.Lastmod` falls back to `.Date` |

That last row matters for the port: `og:updated_time` and `article:modified_time` are
reproducible from `date` alone. There is no missing data.

## Generated artifacts

### Sitemap

Hugo's internal template — no `[sitemap]` config, no custom template. Because two
languages are configured, output is a **sitemapindex** regardless of
`defaultContentLanguageInSubdir = false`:

```
/sitemap.xml  →  /fr/sitemap.xml  +  /en/sitemap.xml
```

The FR sub-sitemap lives at `/fr/sitemap.xml` even though FR pages have no `/fr/` prefix.

**219 URLs per language**, identical shape both sides:

| Kind | Count |
| --- | --- |
| Home | 1 |
| Blog (1 list + 77 posts) | 78 |
| Tags (1 list + 103 terms) | 104 |
| Categories (1 list + 25 terms) | 26 |
| Authors (1 list + 1 term) | 2 |
| Photos section + 3 subsections | 4 |
| Standalone (`contact`, `smsprices`, `restoration`, `videos`) | 4 |
| **Total** | **219** |

Taxonomy is 60% of the sitemap. Entries carry `<loc>`, `<lastmod>`, and `xhtml:link
rel="alternate" hreflang` per counterpart — **so hreflang already exists in the sitemap
today**; it has never existed in the page `<head>`.

No `<changefreq>`, no `<priority>` (modern Hugo emits neither). Paginated URLs are
excluded — which is why `netlify.toml` carries manual redirects for `/blog/page/4/` and
`/en/blog/page/6/`: those were indexed by crawl discovery, never advertised.

`<lastmod>` comes from each page's `date`; list and taxonomy pages inherit the max
lastmod of their members.

One term contains a slash — `LR/Mogrify 2` — and renders as a two-segment path
`/tags/lr/mogrify-2/`. Accented terms are preserved: `marc-laliberté`, `île-dorléans`.

### robots.txt

Hugo's internal template, `enableRobotsTXT = true`, no override. The entire file:

```
User-agent: *
```

No `Disallow`, no `Sitemap:` directive.

### RSS

`[outputs] home = ["HTML", "RSS"]` — home only, so there are no section or taxonomy
feeds. Two feeds: `/index.xml` (FR) and `/en/index.xml` (EN).

**85 items each — every regular content page, not just blog posts.** Hugo's internal
home feed iterates `.Site.RegularPages`; `mainSections = ["blog"]` is consumed only by
the homepage recent-posts partial, not by the RSS template. So Contact, SMS prices and
the Photos pages all appear in the feed.

RSS 2.0 with the atom namespace. Channel carries title, link, description (`Recent
content on <title>`), generator, language, lastBuildDate, `atom:link rel="self"`. Items
carry title, link, pubDate (RFC822), guid (equal to link, `isPermaLink` defaults true),
and description — which is the **summary**, not full content, truncated per
`summaryLength = 70` words.

## JSON-LD

Only one kind ships today: the `ImageObject` from `layouts/shortcodes/image-modal.html`,
emitted once per page (guarded by a `Scratch` flag on first shortcode use). Already
ported to `web/components/mdx/ImageModalJsonLd.tsx`, field for field, with proper
escaping added — the Hugo original interpolates raw shortcode params into JSON, so a
caption containing a quote or backslash would produce invalid JSON. Keep the port.

`layouts/partials/schema/org.jsonld` holds an Organization schema that **has never
shipped**. `layouts/_default/single.html` has `{{ block "schema" }}{{ end }}` but no
template anywhere defines that block, and the partial is never invoked. Its `logo` points
at `img/logo-small.png` while `params.toml` defines `logo_small` as a Cloudinary URL —
reconcile before reviving.

## Analytics: four wirings, not three

| # | What | Where | Scope | Guard |
| --- | --- | --- | --- | --- |
| 1 | GTM loader `GTM-TNS3FT57` | `headers.html:10-16` | every page | none |
| 2 | GTM `<noscript>` | `layouts/index.html:10-13` | homepage only | none |
| 3 | gtag `G-DT1RL3KDNZ` | `_default/single.html:8-20` | content pages only | runtime JS hostname check |
| 4 | `_internal/google_analytics.html` | theme's `scripts.html:1` | every page | build-time `hugo.IsServer` |

GA4 `G-DT1RL3KDNZ` is wired **twice**, by two mechanisms with two different guard styles,
and only #4 covers the homepage and list pages. Wiring 3 sits between `</head>` and
`<body>` — invalid placement that browsers execute anyway.

Wiring 4's exact behaviour could not be verified: the template is compiled into the Hugo
binary, not vendored in this repo. Its `hugo.IsServer` guard is documented public
behaviour, not read from source.

## Dead code and no-op config

Confirmed by grep; safe to delete or ignore during the port.

- **The keywords tag-merge.** `headers.html:21-22` builds a `$keywords` slice from
  `defaultKeywords` plus every tag, then line 24 redeclares `$keywords := slice`,
  discarding it. Net behaviour: front-matter `keywords` if present, else site defaults —
  **tags never contribute**. Verified on real output both ways.
- **`layouts/_default/image-sitemap.xml`** — no `[outputFormats]` entry registers it and
  no `[outputs]` references it, so Hugo has no path to render it. It also points `<loc>`
  at the image rather than the page. Delete.
- **`layouts/partials/schema/org.jsonld`** — see above.
- **`[opengraph]` block** in `params.toml` — zero template references. The homepage's
  `og:image:width/height` matching `image_width`/`image_height` (782x200) is coincidence:
  those come from `imageConfig` reading the real `logo.png`.
- **Top-level `canonical =`** in `hugo.toml` — not a Hugo setting, referenced by nothing.
- **`static/img/sharing-default.png`** — was referenced as a fallback and never existed.
  Removed from `headers.html:90` by item #14; Hugo's output is unchanged, since the branch
  could not execute. See `docs/static-assets.md`.
- **`permalinks.toml`'s `en`/`fr` keys** — the flat `[permalinks]` map keys by *section*,
  and no content has section `en` or `fr`. Almost certainly inert, but not empirically
  disprovable here because no content sets a `slug` override, so the patterns coincide
  with Hugo's defaults either way. Treat only the `blog` pattern as load-bearing.
- **`languageCode = "fr-ca"`** — renders as plain `fr`/`en` in `<html lang>` and
  `og:locale`, since per-language blocks don't set their own and Hugo falls back to the
  language key. Observed from output, not traced to Hugo source.

## Live bugs

Fix these in the port rather than reproducing them.

1. **RSS link is not language-aware.** `absURL` on a literal string doesn't add a
   language prefix, so every page in both languages advertises the French feed. The EN
   homepage renders `title="Marc Laliberte Photo and Videos"` alongside
   `href=".../index.xml"`. Port: FR → `/index.xml`, EN → `/en/index.xml`.
2. **`article:publisher` emits a double URL.** The template prepends
   `https://www.facebook.com/` to `facebook_site`, but `params.toml` already holds a full
   URL — so all 77 posts render
   `content="https://www.facebook.com/https://www.facebook.com/profile.php?id=61567037645807/"`.
   Port: emit the config value directly.
3. **`/smsprices/` is in the sitemap while its page says `noindex,nofollow`.** Hugo's
   sitemap template has no knowledge of the custom `noindex` param. Google honours the
   meta tag, so the page isn't indexed — the sitemap entry is just wasted crawl budget,
   plausibly feeding the crawled-not-indexed count.

## Deliberate deviations in the port

Decided during board item #6. Item #12 diffs the generated sitemap against production, so
the first row is an **expected** delta, not a regression.

| Deviation | Rationale |
| --- | --- |
| noindex pages excluded from the sitemap | Fixes bug 3. Sitemap becomes 218 URLs/language instead of 219. |
| RSS link language-prefixed | Fixes bug 1. |
| `article:publisher` emits config value directly | Fixes bug 2. |
| GTM `GTM-TNS3FT57` only; both gtag wirings dropped | Brief requires GA fire exactly once. GTM covers all page types and keeps tag management out of the codebase. |
| GTM `<noscript>` on all pages, not just homepage | The homepage-only placement was an oversight, not a design. |
| hreflang added to `<head>` | Never existed on the page; the single largest gap for a bilingual site. |
| Organization + BlogPosting JSON-LD added | Organization was written but never wired; BlogPosting is new. |
| `image-sitemap.xml` deleted | Dead and buggy. |
| Keywords behaviour left as-is | Meta keywords is ignored by Google. "Fixing" the shadowed variable would alter 92 pages for no gain and pollute the head diff. |
| RSS keeps all 85 pages | Parity at cutover. Narrowing to blog-only is a visible change to subscribers; file it separately if wanted. |
| Self-referencing canonical on paginated pages (item #8) | Hugo collapses `/blog/page/2/` onto `/blog/`, asserting two pages listing different posts are duplicates. 10 URLs affected; one-line rollback in each of two functions. |
| Taxonomy hub pages populated (item #8) | `/tags/`, `/categories/`, `/authors/` render **blank** in Hugo — the paginator filters `.Data.Pages` by `Type in mainSections`, which matches nothing on a Kind=taxonomy page — yet are indexed. With the sidebar widgets unported they are the only site-wide link path to 129 term pages. |
| OG block emitted for the 4 bannerless posts (item #8) | Hugo's `$is_valid_image` gate fails on their broken local banner and drops the block entirely, so those 8 pages share with no preview image at all. The migration already dropped the broken banner, so the port falls back to the default sharing image. |
| Byline author links gain a trailing slash (item #8) | Hugo emits `/authors/marc-lalibert%C3%A9` while the page has a trailing slash, so every byline link takes a redirect hop. |
| RSS descriptions are plain text | Hugo's are rendered HTML. Matching that means compiling every MDX body through the full pipeline, custom components and all, to produce markup nothing indexes. See "RSS summaries" below. |
| Undated pages omit `<pubDate>` | Hugo gives the seven dateless pages Go's zero time, `Mon, 01 Jan 0001 00:00:00 +0000`. The element is optional in RSS 2.0, so they carry none. Item count is unchanged at 85. |
| `hugo.Generator` dropped | It names Hugo and a version number. Emitting it from a Next build would be false. |
| Favicon assets copied into `web/public/img/` | `logo.png`, `favicon.ico` and `apple-touch-icon.png` existed only under Hugo's `static/`, which the Next app does not share. Without them the default `og:image` — used by every page with no banner — would have 404'd. |

## Implementation

The port lives in `web/lib/seo/`, with the components it needs in `web/components/seo/`.
It is built to be imported: the blog-post, static-page and taxonomy routes do not exist yet
(they are separate work items), so today only the two homepages and the two blog indexes
call it.

| Module | Responsibility |
| --- | --- |
| `lib/seo/constants.ts` | Origin, GTM id, Facebook publisher URL, per-locale defaults, default sharing image |
| `lib/seo/format.ts` | `escapeXml`, `absoluteUrl`, `toPlainText`, `truncateChars`, the two date formats, `newestDate` |
| `lib/seo/share-image.ts` | The banner → default fallback chain and the MIME type |
| `lib/seo/metadata.ts` | `buildMetadata(input)` — the whole head, as a Next `Metadata` |
| `lib/seo/sitemap.ts` | urlset and sitemapindex serialisers |
| `lib/seo/rss.ts` | Feed serialiser |
| `lib/content/site-index.ts` | The wide content read: posts, pages, and taxonomy terms derived from post membership |
| `components/seo/ExtraMeta.tsx` | The two tags Next's `Metadata` cannot express |
| `components/seo/*JsonLd.tsx` | Organization (site-wide) and BlogPosting (per post) |
| `components/chrome/gtm.tsx` | The single analytics wiring |
| `scripts/build-seo-files.ts` | Generates the sitemap and both feeds into `public/`, as `prebuild` |

### Four things Next's Metadata API cannot do

Each was verified against Next 16.2.10's own resolver source, not its docs.

1. **`robots` and `googlebot` need the `other` escape hatch.** `resolveRobotsValue` joins
   flags with a comma *and a space* and has no `all` token, so the typed `robots` field
   cannot produce Hugo's `all,follow`.
2. **Keywords too.** Next joins an array with a bare comma; Hugo's `delimit` uses `", "`.
   Passing one pre-joined string sidesteps the join, since `Array#join` inserts no separator
   for a single element.
3. **`og:updated_time` and `article:publisher` have no field at all** — and cannot go
   through `other`, which always renders `name=` where these need `property=`. They are
   plain JSX in `ExtraMeta`, relying on React 19 hoisting `<meta>` into `<head>` from
   anywhere in the tree. **Any route calling `buildMetadata` must also render `<ExtraMeta>`**;
   the two halves together are the full tag set.
4. **`title` must always be `{ absolute }`.** `resolveTitle` applies the ambient template
   even to `openGraph.title`, and Hugo never appends the site name.

A fifth thing, found in item #8: **`markdownify` applies Goldmark's smartypants**, so Hugo's
`<title>` and `description` carry U+2019 where the frontmatter has a straight apostrophe —
`Merle d&rsquo;Amérique`, not `d'Amérique`. Six posts are affected across `<title>`,
`description`, `og:title` and `og:description`. `toPlainText` now substitutes the apostrophe.
The `<h1>` does *not* get this treatment (`.Title` is used raw), so heading and title
legitimately differ by one character.

Two more traps worth stating: Next infers `twitter:card` as `summary_large_image` whenever
any image resolves, and one always resolves here, so the card is always set explicitly. And
`openGraph.publishedTime`/`modifiedTime` are emitted verbatim, so they need the colon-less
format applied — unlike sitemap `<lastmod>`, which keeps the colon.

### Why the artifacts come from a script

Next's metadata conventions cannot produce this site's sitemap. `app/sitemap.ts` returns a
`<urlset>` and has no representation of a `<sitemapindex>`; `generateSitemaps()` emits
`/sitemap/[id].xml`, not the `/fr/sitemap.xml` + `/en/sitemap.xml` pair Google has indexed.
RSS has no convention at all. Since three of the five files need hand-rolled XML regardless,
all five come from `scripts/build-seo-files.ts`, wired as `prebuild` so `npm run build`
picks it up with no CI change. Output is gitignored — derived from content already in the
repo, unlike `lib/image-dimensions.json`, which is committed because producing it needs
network access.

`robots.txt` is not generated at all: its content never varies, so it is a static file in
`public/`.

### Taxonomy term slugs

`slugifyTerm` in `lib/permalink.ts` was derived by diffing candidate implementations against
a real Hugo build until all 129 terms matched, rather than from Hugo's `urlize` source. The
rules that matter: a slash makes a multi-segment path (`LR/Mogrify 2` → `lr/mogrify-2`),
accented letters and dots survive (`île-dorléans`, `magick.net`, `f2.8`), apostrophes are
deleted rather than hyphenated, and **an en-dash (U+2013) is stripped with no replacement**
while a plain hyphen is kept — `E 70–350mm F4.5–6.3 G OSS` becomes `e-70350mm-f4.56.3-g-oss`.
The corpus also contains a non-breaking hyphen (U+2011). Neither is distinguishable from a
hyphen by eye.

Terms differing only in case collapse to one page, matching Hugo: the corpus has both
`Quebec`/`quebec` and `Sonum Fest`/`sonum fest`, which is why 105 distinct tag strings
produce 103 tag pages.

### RSS summaries

`summarize()` in `lib/content/site-index.ts` produces plain text at Hugo's 70-word limit.
Hugo's `.Summary` is rendered HTML — the live feed carries `<p>`, `<a href>`, `<pre><code>`
and smartypants-substituted quotes. Reproducing that would mean compiling each MDX body
through the whole pipeline including the custom components. The structural contract is kept
(one item per regular page, summary rather than full content, same word count); the markup
is not.

## Verification

Run against a fresh `hugo --gc --minify --environment production` build, not the checked-in
`public/` — **that directory is a stale `hugo server -D` artifact** and disagrees with
current content (it still has `squirrel` as a category, which is a tag now).

| Check | Result |
| --- | --- |
| Head tags, FR/EN homepage and blog index | All 23 Hugo tags reproduced exactly; only differences are the 3 added hreflang links and the fixed RSS href on EN |
| Sitemap URL sets, both languages | 218 vs Hugo's 219 — the only difference is `/smsprices/`, the intended noindex exclusion |
| Sitemap `lastmod`, 436 URLs | 3 mismatches, all EN, all seconds-level — see below |
| Sitemap hreflang alternates | 2 per URL, 436 total |
| RSS item links, both languages | Identical, 85 each |
| `robots.txt` | Byte-identical |

The 3 `lastmod` mismatches are a content quirk, not a defect. `simonShadow` and `pigeons`
carry FR and EN dates differing by 1–11 seconds; the migration stores one shared date per
post, so English inherits the French one.

Blog post, gallery and taxonomy pages could not be diffed — those routes do not exist yet.
That verification belongs to the work item that builds them.

## Notes for the port

- FR/EN pairing is exact for all 85 content paths — identical filenames in both trees,
  enforced at migration. **Tags and categories are identical strings across languages**
  (`redstart.md` is `tags = ["american redstart"]` in both), so taxonomy pairs by the same
  prefix swap as content. `web/lib/locale-counterpart.ts` used to return `null` for
  `/tags/`, `/categories/` and `/authors/`; that guard has been removed, and its `null`
  branch now only catches malformed input.
- The `netlify.toml:227` redirect from `paruline-flamboyante` to `american-redstart` is a
  historical artifact from when tags were translated. Not evidence of a live gap.
- `netlify.toml` holds **55** redirects (not ~90), all `status = 301`, exactly one
  `force = true` (www → apex, correctly first). They are CDN-level and framework
  independent — carry the file over untouched; only `command` and `publish` change at
  cutover.
- Redirect ordering is load-bearing in two places: the www → apex rule must stay first,
  and the broad `/fr/*` → `/:splat` catch-all at line 26 will shadow any future
  `/fr/`-prefixed rule added below it. A request for `/fr/blog/2025/10/29/Prohibition5/`
  currently takes two hops.
- `public/` is gitignored and any copy found there is a stale `hugo server -D` artifact
  with `localhost:1313` URLs. Structure is production-accurate; only the domain differs.
