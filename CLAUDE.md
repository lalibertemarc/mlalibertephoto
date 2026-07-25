## Commands

```bash
npm --prefix web run dev               # Local dev server at http://localhost:3000
npm --prefix web run build             # Production build → web/out/ (runs the full gate, below)
npm --prefix web run validate:content  # Schema-check every content file
npm --prefix web run check:links       # Internal link + sitemap check (needs a build first)
npm --prefix web run images:dimensions # Resolve pixel dimensions for images new to the manifest
```

`build` is gated on both sides: `prebuild` runs `tsc --noEmit`, then `validate-content.ts`, then
`build-seo-files.ts`; `postbuild` runs `check-links.ts`. A malformed `meta.json` or a broken
internal link fails the build rather than shipping.

## Status: mid-migration

The site is being ported from Hugo to Next.js on the `migrate/nextjs` branch. **Production is
still served by Hugo from `master` until the cutover** (board item #12).

The Hugo tree at the repo root — `content/`, `layouts/`, `themes/`, `data/`, `static/`,
`config/`, `hugo.toml` — is **frozen**. `web/content/` is the source of truth for the Next app
and is no longer regenerated from it. Do not author into `content/fr/` or `content/en/`.

## Architecture

The app lives in `web/`. Static export (`output: 'export'`, `trailingSlash: true`) — no
middleware, no route handlers, no server features, and no built-in image optimizer.

### Content model

Every page and post is a **folder** holding shared metadata plus one MDX file per language:

```
web/content/
├── blog/<YYYY-MM-DD>-<slug>/     # meta.json, fr.mdx, en.mdx
├── pages/<path>/                 # meta.json, fr.mdx, en.mdx  (nests: photos/portraits)
└── data/                         # carousel.json, features.json, testimonials.json
```

`meta.json` holds everything both languages share — date, permalinks, tags, categories, authors,
banner. The MDX frontmatter holds only what genuinely differs: `title`, `description`, and
optionally `meta_title` / `keywords`. Shared fields exist exactly once, so the two languages
cannot drift.

`web/lib/schema.ts` is the authority on all of it, and every schema is a `strictObject`: an
unrecognised key is a build error, not something dropped quietly.

### URLs

French is the default language and has no prefix; English is served under `/en`. Blog permalinks
are `/blog/:year/:month/:day/:slug/`, matching Hugo's old contract exactly — those URLs are
indexed.

`web/lib/permalink.ts` is the single implementation of that contract; routing and content both
import it rather than deriving URLs separately. The dates it reads never become `Date` objects —
the Y/M/D in a URL is the date as written in its own offset, and a round-trip through UTC moves
posts to URLs that never existed.

### Routing

Two route groups, `app/(fr)/` and `app/(en)/en/`, because a literal `app/en/` directory cannot
work alongside the unprefixed French routes. The English tree is thin shims over shared
implementations. i18n strings are in `web/messages/{fr,en}.json` via `next-intl`.

### MDX components

Six components in `web/components/mdx/` render content bodies: `Gallery`, `ImageModal`,
`FlexImages`, `BeforeAfter`, `NavButton` and `FaIcon`. The first five replace the Hugo
shortcodes one-for-one; `FaIcon` has no shortcode behind it and exists because content writes
bare Font Awesome `<i>` tags. Renaming any of them breaks every migrated content file at once.

Image dimensions come from the committed manifest `web/lib/image-dimensions.json`, since
`next/image` needs real pixel sizes to reserve a box and the content only carries CSS lengths.
Re-run `images:dimensions` whenever content adds an image.

### Styling

Tailwind v4 with the design tokens extracted from the old `custom.css` into
`web/app/globals.css`. The accent is `--primary-accent: #c9a84c` (gold); any `#955251` reference
anywhere is stale marsala-theme leftovers.

## Authoring

Blog posts are written through the `.claude/commands/` skills, in this order:

```
/new-blog-post <title> | <header FR> | <header EN>   # uploads photos, writes the post folder
/tag-blog-post <folder-name>                         # fills in tags + categories on meta.json
/add-to-events <folder-name>                         # adds the featured image to the events gallery
```

Plus `/migrate-to-gallery <folder-name>` to convert a post's `FlexImages` layout to the `Gallery`
grid, and `/photography-trends-report` for the periodic content-planning report.

`uploadBlogImages.sh` (repo root) is still current — it resizes to 1920px, uploads to Cloudinary
and prints the URLs, and `/new-blog-post` calls it as its first step.

New post slugs are **kebab-case**. The 77 migrated posts use run-together lowercase slugs because
Hugo derived them by lowercasing a camelCase filename; that rule is gone and the slug is now an
explicit field. Do not "fix" the old ones — their URLs are indexed.

See `docs/authoring-workflow.md` before changing any of these skills. It covers the four
mistakes that validation cannot catch.

## External Services
- **Cloudinary**: image hosting (images referenced via `res.cloudinary.com` URLs), resized on the fly by `web/lib/cloudinary-loader.ts`
- **Formspree**: contact form backend (endpoint `mjkyajaa`)
- **Google Analytics** (G-DT1RL3KDNZ) and **Google Tag Manager** (GTM-TNS3FT57)

## Configuration
- `web/next.config.ts` — static export, trailing slashes, the custom image loader and its width lists
- `web/lib/site-config.ts` — site-level constants for the SEO layer
- `netlify.toml` — build command, redirects. The redirect history matters: taxonomy URLs are load-bearing.

## Detailed Documentation
You **must** consult these files before launching any exploration related to these topics.
- `docs/authoring-workflow.md` — the five `.claude/commands` skills and what each writes, what changed from Hugo, the contract they must satisfy, and the four failures `validate:content` cannot catch (the date offset, the braced JSX prop form the dimension scraper needs, straight quotes in generated text, locale-crossed links)
- `docs/nextjs-scaffold.md` — Next.js app in `web/`, static-export config, design token extraction and conventions
- `docs/content-migration.md` — Hugo→MDX migration script, the URL contract and why dates never become `Date` objects, shortcode/raw-HTML transforms, known data quirks
- `docs/bootstrap-dependency-map.md` — which Bootstrap 3 classes/JS the site actually used, Tailwind mapping, dead code
- `docs/mdx-components.md` — the five MDX components replacing the Hugo shortcodes, the Cloudinary loader and dimension manifest, modal architecture, next-intl wiring, and the shortcode bugs fixed during the port
- `docs/routing-and-chrome.md` — the FR/EN route groups and why `app/en/` cannot work, the thin-shim pattern, why all of `next-intl/server` is unusable and what replaces it, the language switcher and the taxonomy gap, and the nav/footer/heading port (including the ~half of `nav.html` that is unreachable)
- `docs/seo-contract.md` — every head tag Hugo emits and under what condition, the sitemap/robots/RSS artifact shapes, the four analytics wirings, the dead code and live bugs, the deliberate deviations the Next port makes, and the `web/lib/seo/` implementation (including the four things Next's Metadata API cannot express and the taxonomy slug rules)
- `docs/blog-port.md` — the blog surface in Next: the MDX `evaluate()` seam and why the compiled component is called as a function, the four content readers and why they don't share a body, the slash-containing term slug, the percent-encoded-params trap that renders 404s into correctly-named files, Hugo's term title-casing (99 of 129 terms), the `page/1` alias redirects, and the full head-tag parity results
- `docs/pages-port.md` — the eight standalone pages in Next: the 16 literal route shims and why a catch-all was rejected, the one-skin decision that renders contact/photos/smsPrices dark against Hugo's light, the `.dark-gallery` CSS port (including the dropped full-bleed breakout and the list markers Tailwind's preflight zeroes), the two cross-module rules that were waiting on a page class, why the MDX component map cannot intercept literal `<i>` tags and where the Font Awesome rewrite lives instead, and why the contact form's Bootstrap classes ship as real CSS
- `docs/homepage-port.md` — the five homepage sections in Next, why the Embla carousel toggles its active class imperatively (and the forced reflow that makes loop animations replay), Owl's real 5000ms autoplay interval vs the 2000ms transition, the three places `custom.css` disagrees with what actually renders, and the date formatter's timezone trap
- `docs/build-validation.md` — the `prebuild`/`postbuild` chain that gates `npm run build`, the `parseContentFile` seam that makes a zod failure name its file, why `validate-content.ts` is a separate pass from `build-seo-files.ts`, and the link checker: URL-resolution normalisation, the export's inconsistent percent-encoding, the trailing-slash warning policy, what the sitemap reverse-check excludes and why `noindex` is derived rather than listed, the missing-asset allowlist, and the two open redirect-hop causes
- `docs/static-assets.md` — the `static/` → `web/public/` asset copy: why Hugo's theme-static merge left two assets outside the site's own `static/`, the full inventory of what is referenced vs. the six orphans (including the broken `site.webmanifest` icon paths), why the six space-containing banner filenames were copied verbatim rather than renamed, and the two pieces of dead code retired with the item
- `docs/bilingual-content-audit.md` — how the FR/EN tree is swept for fields carrying the other language's text: why byte-identity both over- and under-reports, the four passes, the translatable-vs-shared field list, the keywords convention, the full false-positive register, and the permalink-column extraction trap in `hugo list all`

### Hugo-era documentation (frozen tree)
These describe the Hugo implementation the port was derived from. Still accurate about `master`,
superseded by the port docs above for anything in `web/`.
- `docs/carousel-implementation.md` — carousel architecture, data flow, JS init, and CSS details
- `docs/site-styling-context.md` — CSS/JS load order, color scheme, custom components, override patterns
- `docs/gallery-pages.md` — dark gallery layout, CSS Grid, hover overlays, modal navigation
- `docs/homepage-redesign.md` — dark homepage design tokens, section classes, CSS scoping, i18n keys
- `docs/blog-post-styling.md` — blog post rendering flow, dark-blog vs dark-gallery CSS, typography hierarchy

## Rules

### Document-as-you-explore
When exploring a flow, system, or area of the codebase that is **not already covered** by an existing doc in `docs/`, you **must**:
1. Create a new Markdown file in `docs/` describing your findings (e.g., `docs/contact-form-flow.md`).
2. Add a reference to it in the **Detailed Documentation** section above.

This ensures future sessions can reuse the knowledge without re-exploring the same code.
