# Build-time validation and the link checker

Board item #10. Two gates that make bad content and broken internal links fail `npm run build`
instead of reaching production.

The motivation is `netlify.toml`: ~90 redirect rules, nearly all of them added because an
internal URL broke and nobody noticed until Google reported the 404 months later. Every one of
those is a bug a link crawl would have caught at build time. Content here is also largely
authored through Claude, where a machine-checkable constraint beats a convention.

## The chain

```jsonc
"prebuild":  "tsc --noEmit && tsx scripts/validate-content.ts && tsx scripts/build-seo-files.ts",
"build":     "next build",
"postbuild": "tsx scripts/check-links.ts",
```

`npm run build` *is* the whole chain — npm runs `pre`/`post` around it and stops on the first
non-zero exit. Each step also has a standalone alias: `typecheck`, `validate:content`,
`seo:build`, `check:links`.

**`netlify.toml` is deliberately untouched.** Its build command is still
`hugo --gc --minify`; the cutover to Next is item #12. Putting the checks inside
`npm run build` rather than in the Netlify command means the cutover inherits them by changing
one line, and nothing here can deploy the wrong site in the meantime. The consequence is that
"a broken link fails a deploy preview" is verified locally for now — the mechanism is the
build script, not Netlify config, so it will hold when the command flips.

## Content validation

### `lib/content/parse.ts` — the naming seam

`schema.parse(json)` throws a `ZodError` that lists paths *inside* the object and says nothing
about which of 258 files it came from. `parseContentFile(schema, value, file)` wraps
`safeParse` and throws a `ContentValidationError` carrying the path, relative to `web/`.

Every content reader goes through it — `blog-post.ts`, `blog-posts.ts`, `page.ts`,
`post-meta.ts`, `site-index.ts`, `content-dates.ts`, `homepage-data.ts` — so a bad file names
itself whether it surfaces in the pass below or three hundred pages into `next build`.

Two readers were not parsing through schemas at all before this and are the reason the item
mentions blank pages:

- `blog-posts.ts` had a hand-rolled `BlogMetaShape` and returned `null` for anything that did
  not match, so a malformed post silently vanished from the index, the footer and every term
  page that listed it.
- `content-dates.ts` plucked `date` off an untyped object, so a bad file quietly dropped out of
  the `lastmod` cascade — invisible on screen, wrong to crawlers.

### `scripts/validate-content.ts`

Walks all 77 post folders, 8 page folders and 3 data sets — 258 files — and reports **every**
failure in one run rather than dying on the first.

It is a separate pass from `build-seo-files.ts`, which already reads the same corpus through
the same schemas. Two things that one does not do:

- It stops at the first failure. `Promise.all` rejects on one rejection, so a run that broke
  six posts reports one, and fixing it reveals the next.
- It never reads `content/data/*.json`. Those reach a schema only when the homepage renders,
  deep inside `next build`, where the failure arrives as a React error.

The cost is re-reading ~250 small files, tens of milliseconds against a build measured in tens
of seconds. The alternative — a `collectAll` flag on `loadSiteIndex()` — saves that but makes
"is the content valid" a side effect of "emit the sitemap".

Only `ContentValidationError` becomes a finding. A missing file or malformed JSON is left to
crash with its stack: the corpus is generated, so either means the migration did not finish.
MDX *bodies* are not compiled here — `migrate-content.ts` gates on compilation and `next build`
executes every body seconds later.

The report class is `MigrationReport` from `scripts/lib/report.ts`, shared with
`migrate-content.ts` and `check-links.ts`. Despite the name it is not migration-specific: all
three are whole-corpus passes wanting every failure, grouped, with the file that caused each.

A corrupted `date`, a wrong type and an unrecognised key in one file produce:

```
ERROR (3)
  schema (3)
    content/blog/2025-10-29-prohibition/meta.json: date: Invalid string: must match pattern …
    content/blog/2025-10-29-prohibition/meta.json: tags: Invalid input: expected array, received string
    content/blog/2025-10-29-prohibition/meta.json: Unrecognized key: "surprise"
3 content error(s). Build stopped.
```

`next build` never starts.

## `scripts/check-links.ts`

Runs against `out/` after the export. ~20,700 references across 451 pages, well under a second.

Three assertions:

1. Every internal `href`, `src` and `srcset` resolves to something the export wrote.
2. Every URL advertised in the sitemaps and the RSS feeds resolves to a generated page.
3. Every generated page appears in a sitemap, unless deliberately excluded.

### Normalisation

References are resolved with `new URL(raw, pageUrl)` rather than string-matched. That handles
absolute, root-relative and document-relative forms in one step and drops `mailto:`, `tel:`,
`javascript:`, `data:` and cross-origin links for free — they simply do not land on this
origin. A bare `#anchor` resolves to the page it sits on and passes; fragments are not
verified.

Percent-encoding then has to be undone, because **the export is not consistent about it**. One
term page carries both:

```html
href="/authors/marc-laliberté/page/2/"      <!-- raw UTF-8 -->
href="/en/authors/marc-lalibert%C3%A9/"     <!-- percent-encoded -->
```

Both name the same directory. Paths are also NFC-normalised, since a decomposed `é` compares
unequal to a composed one while naming the same file.

`og:url` and `og:image` are not checked. The first is built from the same `absoluteUrl(permalink)`
as the canonical, which *is* checked (it is a `<link href>`); the second is always Cloudinary.
Scanning `content=` attributes for URL-ish strings would add false positives for no new coverage.

### Trailing slashes

`next.config.ts` sets `trailingSlash: true`, so every page is `<path>/index.html` and links end
in a slash. A link to the unslashed form still works — Netlify redirects it — but costs a hop.
So it resolves, and **warns**. Eighteen such links exist today; see below.

### What is excluded from "every page is in a sitemap"

`lib/seo/sitemap.ts` does not list paginated URLs, matching Hugo. So the reverse check skips:

| Excluded | Why |
| --- | --- |
| `*/page/N/` | Hugo never listed these and neither does the port |
| `/404/`, `/_not-found/` | not addressable content |
| `noindex` pages | **derived** by reading `meta.json`, not restated |
| `/tokens/` | the design-token scaffold page (below) |

The `noindex` set is derived rather than hardcoded because `build-seo-files.ts` skips those
entries by reading the same flag; restating the list would let the two drift. Today it is
`/smsprices/` and `/en/smsprices/`.

### The asset allowlist

`scripts/fixtures/missing-assets.txt` holds 27 local banner paths that the export references
but does not ship. `migrate-content.ts` copies banner paths into `meta.json` verbatim, but the
files still live only in Hugo's `static/img/` — booked as a later asset item in
`docs/content-migration.md`.

A broken `href` is **always** an error. A broken `src`/`srcset` is an error unless the path is
on that list, in which case it warns. So a *new* broken image fails the build while the known
queue does not hold the check hostage. Same shape as the migration's four-missing-banner
allowlist. The file is a queue, not a set of accepted defects: delete a line when its file
lands, delete the file when it is empty.

## What the first run found

**`/en/tokens/` — fixed.** `app/(fr)/tokens/page.tsx` is a French-only scaffold page (its own
header says it gets deleted at cutover), but `resolveCounterpart()` derived an English
counterpart for every path, so the language switcher advertised a URL the export never wrote.
`lib/locale-counterpart.ts` now carries a `FRENCH_ONLY_PATHS` set; the switcher's existing
`?? localeHref('/', target)` fallback handles the `null`. The `null` branch was documented as
deliberately reachable and had, until now, nothing reaching it.

**Eighteen redirect hops — four fixed, fourteen open.** Two unrelated causes:

- **`/contact` and `/restoration` authored without a trailing slash** in MDX, as
  `<NavButton url={"/contact"} />` — 52 calls across 13 posts. **Fixed** by
  `internalHref()` in `lib/links.ts`, applied by the two components that take a URL straight
  from content: `NavButton` and `ImageModal`'s `buttonUrl`. Framework-derived links
  (`lib/permalink.ts`, the nav, the feeds) already carried the slash and do not go through it.
- **Seven taxonomy terms containing a dot** (`fe-50mm-f1.8`, `magick.net`,
  `sigma-24-70mm-f2.8-dg-dn-ii-art`, `e-70350mm-f4.56.3-g-oss`, …) render as
  `href="/tags/fe-50mm-f1.8"` while their sitemap `<loc>` and canonical both say
  `/tags/fe-50mm-f1.8/`. Next's `trailingSlash: true` skips any path whose last segment
  contains a dot, treating it as a file. The page is served either way, but every internal link
  disagrees with the canonical. ×2 locales = 14, and **open**.

`internalHref()` declines to slash a dotted last segment for exactly the same reason Next
does, so the two can never disagree about a given href. That is why it does not fix the second
case: the rewrite happens inside the framework, not at the call site. Fixing it would mean
either renaming the terms — which changes live URLs, the one thing the migration must not do —
or post-processing the export.

Nothing here 404s, so both are warnings.

## Not done here

Checking external link liveness, accessibility, unit tests, or any browser-based E2E — all
explicitly out of scope for item #10. `robots.txt` and the generated `_redirects` targets are
not crawled either.
