# Static assets: `static/` → `web/public/`

Board item #14. Every locally-hosted image the site serves now lives in `web/public/img/`, so
the Next static export resolves the paths that item #3 recorded in `web/content/**/meta.json`.

Before this, those paths resolved *only* because Hugo was serving `static/`. Item #12 deletes
Hugo, at which point all 27 local blog banners would have 404'd.

## Why a copy rather than a shared directory

Hugo publishes the **union** of `static/` and `themes/hugo-universal-theme/static/`, with the
site's own files winning on conflict. Next has no such merge — `output: 'export'` serves
`web/public/` and nothing else.

That merge is the reason two assets the site depends on were never in the site's own
`static/`: `placeholder.png` (the no-banner fallback, `footer.html:28` and
`recent_posts.html:27`) and `texture-bw.png` (the light heading band). Both were lifted out of
the submodule into `web/public/img/` back in commit `efe6a3e`, which is why item #14 did not
need to touch them — they are already independent of the theme and survive its removal.

## Inventory

`static/img/` holds 36 files. `web/public/img/` now holds 38: those 36 plus the two
theme-derived ones above.

| Group | Files | Referenced by |
| --- | --- | --- |
| Blog banners | 27 JPEGs, 4.3 MB | `banner.src` in `content/blog/*/meta.json` |
| Favicon / touch icon | `favicon.ico`, `apple-touch-icon.png` | `metadata.ts:131-134`, `headers.html:76-77` |
| Sharing image | `logo.png` | `DEFAULT_SHARING_IMAGE` (`lib/seo/constants.ts:54`) |
| No-banner fallback | `placeholder.png` | `blog-posts.ts:24` |
| Heading band | `texture-bw.png` | `components/chrome/page-heading.tsx:46` |
| **Unreferenced** | `favicon-16x16.png`, `favicon-32x32.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`, `logo-small.png`, `site.webmanifest` | nothing |

`favicon.ico`, `apple-touch-icon.png` and `logo.png` were already in `web/public/img/` and hash
**identical** to the `static/` copies, so the copy added 33 files, not 36.

### The six unreferenced files

They ship anyway — ~44 KB, and the alternative is losing them when `static/` goes. But nothing
requests them today, and two are broken in ways worth recording before someone wires them up:

- **`site.webmanifest` is not linked from any page**, and its `icons[].src` values point at
  `/android-chrome-192x192.png` — site root, while the files it names are served from `/img/`.
  Adding a `<link rel="manifest">` without fixing those paths would yield two 404s.
- **`logo-small.png` is referenced only by `layouts/partials/schema/org.jsonld`**, which
  `docs/seo-contract.md` documents as unrenderable — no output format registers it. The nav's
  small logo comes from `params.toml:26`, a Cloudinary URL.

Wiring them up is a head-tag deviation from Hugo, which the port has otherwise held strictly,
so it was left for a later item to decide deliberately.

## Filenames with spaces

Six banners carry spaces: `_DSC7310 - insta.jpg`, `_DSC7377-001 - insta.jpg`,
`_DSC7410 - insta.jpg`, `_DSC7455 - insta.jpg`, `DSC00622 - insta.jpg`, `DSC00645 - insta.jpg`.

**They were copied verbatim, not renamed.** Renaming would have meant editing 12 frontmatter
lines across `content/{fr,en}/blog/` and re-running the migration — but it would also have
killed the live URLs of six images that production has served for months, for a purely
cosmetic gain. That is the one thing the migration's URL contract exists to prevent.

Nothing needs encoding at authoring time, because both generators already emit the same thing:

```html
<!-- Hugo, public/blog/2025/04/05/blackbird/index.html -->
content="https://marclaliberte.photos/img/_DSC7310%20-%20insta.jpg"
<!-- Next, out/blog/2025/04/05/blackbird/index.html -->
src="/img/_DSC7310%20-%20insta.jpg"
```

`meta.json` stores the raw form (`/img/_DSC7310 - insta.jpg`); React percent-encodes it on
render, and `check-links.ts` decodes and NFC-normalises before resolving, so the checker
verifies these six like any other path.

> Two docs previously said **nine** names contain spaces. It is six — the other three
> (`_DSC7374-001-Edit-Edit - insta.jpg`, `_DSC6905 - insta.jpg`, `_DSC7107 - insta.jpg`) belong
> to the four posts whose banner files have never existed, so they never reach `meta.json`.

## Two pieces of dead code removed

**`img/sharing-default.png`** never existed and never could have been requested.
`headers.html:90` read
`cond $has_image .Params.banner (.Site.Params.default_sharing_image | default "img/sharing-default.png")`,
but `params.toml:9` always sets `default_sharing_image = "img/logo.png"`, so the `| default`
branch was unreachable. The Next port had already hardcoded `/img/logo.png`. Rather than invent
an asset for a branch that cannot execute, the fallback was deleted from the template. Hugo's
output is byte-identical either way — verified on a banner-less page (`/contact/`), which still
emits `og:image` = `https://marclaliberte.photos/img/logo.png`.

**`scripts/fixtures/missing-assets.txt`** was the 27-entry queue that downgraded exactly these
banners from error to warning in the link checker. With the files shipped the queue is empty,
so the fixture and its machinery in `check-links.ts` — `ALLOWLIST_FILE`, `readAllowlist()`, the
`knownMissing` bucket and its report line — are gone. **Every broken `src` is now a hard build
failure**, with no branch to fall through. See `docs/build-validation.md`.

## Verification

The link checker is the proof, not a manual grep: `check-links.ts` crawls `out/` on every
`postbuild` and resolves every `src`/`srcset` against what the export actually wrote.

```bash
cd web && npm run build     # prebuild → next build → postbuild (check-links)
```

Post-item run: **20,721 references across 451 pages, 0 errors.** The only warnings are the 14
pre-existing dotted-taxonomy redirect hops. `hugo --gc --minify` and
`npm run migrate:content:check` both still pass — the latter with its usual 7 warnings,
including the 4 deliberately banner-less posts.

## Not done here

Re-hosting the ~44 Cloudinary banners or any in-post image; image optimisation or format
conversion (`output: 'export'` has no `next/image` optimizer); sourcing replacement photos for
the four posts with missing banners; and wiring up the six unreferenced icon files.
