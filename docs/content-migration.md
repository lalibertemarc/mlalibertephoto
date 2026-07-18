# Hugo → MDX Content Migration

`web/scripts/migrate-content.ts` converts the Hugo content tree into the folder-per-post
model the Next.js app consumes. Board item #3. It is **re-runnable**: content keeps changing
on `master`, so the migration branch re-imports at cutover rather than forking content.

```bash
cd web
npm run migrate:content         # migrate
npm run migrate:content:check   # verify output matches disk, write nothing
```

## Shape

```
content/fr/blog/prohibition.md  ─┐
content/en/blog/prohibition.md  ─┴─→ web/content/blog/2025-10-29-prohibition/
                                        ├─ meta.json   shared metadata
                                        ├─ fr.mdx      title/description + body
                                        └─ en.mdx
content/fr/photos/portraits.md  ─┐
content/en/photos/portraits.md  ─┴─→ web/content/pages/photos/portraits/{meta.json,fr.mdx,en.mdx}
data/carousel/*.yaml            ───→ web/content/data/carousel.json
```

Output lives under `web/`, not the repo root: root `content/` is Hugo's live source and stays
untouched until item #12. 258 files: 77 posts × 3, 8 pages × 3, 3 data collections.

Page folders mirror the URL path, so `pages/photos/portraits/` serves `/photos/portraits/`.

## The URL contract

This is the part that cannot be got wrong — a changed slug is a dead indexed URL.

`config/_default/permalinks.toml` sets `blog = "/blog/:year/:month/:day/:filename/"`.

**Slug is `basename.toLowerCase()`, nothing more.** Hugo's `:filename` token lowercases and
does not insert hyphens. 41 of the 77 filenames are camelCase, so
`imagemagickScriptsRelease.md` serves `/blog/2026/03/04/imagemagickscriptsrelease/`. No
filename contains accents, spaces or punctuation, so no fuller urlize port is needed — but
that is a property of the current corpus, not a guarantee, which is why every derived URL is
cross-checked (below).

**Y/M/D comes from the literal `YYYY-MM-DD` string prefix, never a `Date`.** Frontmatter
dates carry offsets (`-04:00` / `-05:00`) and Hugo uses the date *as written in that offset*.
`motherRockersValentinesDayPart2` is `2026-03-02T…-05:00`, whose UTC date is 2026-03-03, but
whose live URL is `/2026/03/02/`. `new Date(raw).toISOString().slice(0, 10)` moves that post
to a URL that has never existed. `lib/permalink.ts` reads the prefix with a regex, no schema
uses `z.date()`, and the frontmatter parser deliberately keeps datetimes as strings — which
is the main reason it is hand-rolled rather than delegated to a TOML library, since every
spec-compliant TOML parser returns a `Date` for exactly that field.

**Verification.** Every run derives all 170 URLs and diffs them against ground truth from
`hugo list all`, falling back to `web/scripts/fixtures/hugo-urls.csv` when Hugo is not on
PATH. Regenerate the fixture with `hugo list all > web/scripts/fixtures/hugo-urls.csv`.

## Shortcodes

Six names exist across all content; the universe is closed and an unrecognised one is a hard
error, because passing it through would leave a literal `{{<` that fails the MDX build later
and is far harder to trace back.

| Shortcode | Calls (fr+en) | Becomes |
|---|---|---|
| `image-modal` | 492 | `<ImageModal>` self-closing |
| `fleximages` | 65 | `<FlexImages>` paired |
| `navbutton` | 62 | `<NavButton>` self-closing |
| `gallery` | 35 | `<Gallery>` paired |
| `before-after` | 12 | `<BeforeAfter>` self-closing |
| `ref` | 6 | resolved to a URL string |

Three parsing hazards, all real and all present in the corpus:

- **Multi-line calls are the norm.** Most `image-modal` calls put each parameter on its own
  line with `>}}` far below the opening tag.
- **Two closing spellings.** `{{< /name >}}` (92 uses) and `{{</ name >}}` (8). The tokeniser
  normalises both.
- **Same-name double nesting.** `blog/butterbuttbutler.md` opens `fleximages` at line 23 and
  again at 59 before closing either. Pairing each open with the textually nearest close
  matches the outer open to the inner close and silently produces wrong nesting. A
  last-opened-first-closed stack is the only pairing that survives this.

`class` means two different things and is not renamed uniformly: on `image-modal` it is a
BEM modifier (`enlargeable-image--wide`) so it becomes `variant`; on `navbutton` and
`fleximages` it is a raw class list so it becomes `className`.

Props are emitted as JSX **expressions** (`src={"…"}`), not quoted attributes. A JSX string
attribute decodes HTML entities; values here contain bare `&` in query strings and no
entities at all, so the expression form preserves them exactly.

`ref` is resolved by substitution before tokenising rather than modelled as a node — it takes
a positional argument, only ever appears inside markdown link syntax, and yields a URL rather
than an element.

## Raw HTML

Goldmark runs with `unsafe = true`, so content embeds raw HTML that MDX parses as JSX, where
lenient-HTML habits become hard errors. `scripts/lib/html-jsx.ts` handles this:

- **Void elements self-closed** — 124 `<br>`, 66 `<hr>`, 4 `<input>`. (The brief for this
  work said 55 `<br>` and did not mention `<hr>` at all; both counts are measured.)
- **Attribute renames** — `class`→`className`, `for`→`htmlFor`, `enctype`→`encType`,
  `frameborder`→`frameBorder`, `allowfullscreen`→`allowFullScreen`, and the rest.
- **`style` strings to objects** — `style="border:none"` → `style={{"border": "none"}}`.
- **`<script>` bodies** moved into `dangerouslySetInnerHTML` with a template literal, because
  MDX reads their braces as expressions.

Only `contact.md` contains `<script>`/`<form>`; it converts to a working Bootstrap form plus
the Google Ads conversion script. Note the script tag relies on `gtag` being present — if the
Next app loads GTM differently, that call needs revisiting.

Fenced code blocks and script bodies are masked out before tag rewriting and restored after,
so example markup inside a fence is never rewritten.

## Known data quirks

- **Four posts have no banner.** `restoration`, `sonumMotherRockers`, `sonumDiamonCobra` and
  `sonumGuitBassDrom` reference local files that do not exist under `static/`; their banners
  are already broken in production. The four paths are an explicit allowlist, so any *other*
  missing banner is an error rather than quietly joining the accepted set.
- **Two posts' FR/EN dates differ by seconds** (`pigeons`, `simonShadow`). Same calendar day,
  so URLs are unaffected; FR is canonical and the run warns.
- **`contact.md` has `id` in French only.** FR is canonical; the run warns.
- Local banner paths are written both with and without a leading slash and are normalised.

## The MDX compile gate

Every generated `.mdx` is compiled with `@mdx-js/mdx` before anything is written. A run with
a single uncompilable file writes nothing.

This exists because "zero `{{<` remain" proves the shortcodes were consumed but says nothing
about whether the result is valid MDX, and real defects live in exactly that gap. The gate
caught three on its first run that every other check passed: `ruins1.md` opened `<p>` twice
and closed it never (HTML tolerates the implicit close, MDX does not — fixed at source), and
`en/videos.md` contained HTML comments, which MDX treats as a syntax error rather than a
no-op (now converted to `{/* … */}`).

`web/package.json` sets `"type": "module"` because `@mdx-js/mdx` is ESM-only and fails to
load under CJS transpilation. `next build` was re-verified after that change.

## Idempotency

Two runs produce byte-identical output — verified by `npm run migrate:content:check`, which
re-derives everything and diffs against disk without writing. Determinism comes from sorted
directory iteration, fixed key order, and `JSON.stringify(x, null, 2)`. `.gitattributes` pins
`web/content/**` to `eol=lf`, without which a fresh clone on Windows rewrites every file and
the check reports spurious differences.

A run with any error writes nothing at all, so a partially-migrated tree cannot land.

Files present under `web/content/` that the current run did not produce are reported as
orphans but never deleted automatically.

## Not done here

Rendering (items #4–#9) and build-time schema enforcement (item #10). The five components
named above do not exist yet — `web/lib/schema.ts` is the runtime contract item #10 imports.

**Local banner images are not copied.** `meta.json` records paths like `/img/foo.jpg` that
today resolve only through Hugo's `static/`. Moving those 27 files into `web/public/` is an
asset-pipeline task for a later item. Note nine of those filenames contain spaces, which will
need URL-encoding or renaming before Next serves them.
