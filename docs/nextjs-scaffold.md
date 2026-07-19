# Next.js Scaffold & Design Tokens

The `web/` directory holds the Next.js app that will replace the Hugo site.
Board item #2. Both stacks coexist until item #12 removes Hugo.

## Layout

```
mlalibertephoto/
├─ content/  layouts/  static/  themes/   Hugo — untouched, still builds
├─ public/                                Hugo output (gitignored)
└─ web/                                   Next.js
   ├─ app/
   │  ├─ globals.css      design tokens — the deliverable
   │  ├─ layout.tsx       root layout, Roboto via next/font
   │  ├─ page.tsx         placeholder
   │  └─ tokens/page.tsx  live token reference
   ├─ next.config.ts
   ├─ tsconfig.json
   └─ out/                next build output (gitignored)
```

`web/` is a subdirectory rather than the repo root because Hugo publishes to
`public/`, which is also Next's static-asset directory. At the root the two would
fight: run `hugo` then `next build` and the Hugo output gets bundled as Next
assets. Item #12 promotes `web/` to the root once Hugo is gone.

## Commands

```bash
cd web
npm run dev        # dev server, http://localhost:3000
npm run build      # static export to web/out/
npm run typecheck  # tsc --noEmit
npm run lint       # eslint (flat config, eslint-config-next 16)
```

`eslint.config.mjs` imports `eslint-config-next/core-web-vitals` and
`/typescript` **directly**. Do not route them through `FlatCompat` — v16 ships
native flat configs, and the compat shim re-validates them against the legacy
eslintrc schema and dies on circular plugin references.

Hugo commands are unchanged and still run from the repo root.

## Configuration

Three settings in `next.config.ts` that are not optional:

- **`output: 'export'`** — static export. Disables middleware, the `next/image`
  optimizer, route handlers and every other server feature. Nothing added to
  this app may depend on them.
- **`trailingSlash: true`** — Hugo emits every URL with a trailing slash
  (`/blog/2025/10/29/prohibition/`). Without this, export writes `blog.html`
  instead of `blog/index.html` and **every indexed URL 404s**.
- **`images.loader: 'custom'`** — `output: 'export'` has no optimizer to run, so
  without a loader `next build` hard-fails on any `next/image`. This started as
  `images.unoptimized: true`; board item #4 replaced it with
  `lib/cloudinary-loader.ts`, which injects `f_auto,q_auto,w_*,c_limit`. See
  `docs/mdx-components.md`.

`tsconfig.json` sets `strict: true` and `noUncheckedIndexedAccess: true`.

## The 10px root

**Bootstrap 3 sets `html { font-size: 10px }`**, and the Hugo site loads Bootstrap 3. Every
`rem` in `custom.css` was therefore authored against a 10px root: `--text-page-title: 2rem`
means **20px**, and the footer headings at `0.75rem` are genuinely **7.5px**.

The original extraction copied those values across verbatim — correct in itself — into an app
whose root was the browser default 16px, so all 39 `--text-*` tokens rendered **1.6× too
large**. This was invisible until item #5 compared computed styles against a running Hugo
server; nothing about the CSS looks wrong on its own.

`globals.css` now sets `font-size: 62.5%` on `html`, reproducing Bootstrap's root. That fixes
the tokens *and* aligns Tailwind's own rem-based utilities with the source, which matters for
the vertical rhythm below.

**Consequence for component work:** stock Tailwind steps no longer carry their familiar pixel
values — `text-sm` is 8.75px, `p-4` is 10px. When a component needs an exact size, state it
(`text-[14px]`) rather than reaching for the step that "looks like 14px".

## Design tokens

`web/app/globals.css` is the design system, extracted from
`static/css/custom.css` (still present as the reference until item #12).

**Values are verbatim.** Nothing is rounded to a Tailwind scale step — if the
source says 22px, the token says 22px. This is the point of the exercise: the
failure mode of a Tailwind rewrite is slow drift toward generic defaults, and
extracting first makes the existing design the vocabulary. Write `bg-accent`,
never `bg-yellow-600`.

### Conventions

- **Role-based names.** `--color-surface-page`, not `--color-dark-1a1212`.
  `custom.css` is organised by role (`.home-carousel--modern`, `.dark-gallery`,
  `.dark-blog`, `.hp-*`), so a token name points at where it came from.
- **Shared values keep separate tokens.** `0.8rem` covers five roles; each has
  its own token so a change to one cannot silently move the others.
- **Responsive suffixes** track the source's media queries: `-md` is the
  `@media (max-width: 991px)` value, `-sm` is the `@media (max-width: 767px)`
  value.
- **`@theme static`** — emits every token even when unused. Plain `@theme`
  tree-shakes, which would leave the design system half-existing until some
  component happened to reference each value.

### What is deliberately not tokenised

The source uses `rgba(255, 255, 255, a)` at **19 distinct alphas** for text and
hairline borders. Tailwind's opacity modifier reproduces all of them exactly:

| custom.css | Tailwind |
|---|---|
| `rgba(255,255,255,0.85)` | `text-white/85` |
| `rgba(255,255,255,0.45)` | `text-white/45` |
| `rgba(255,255,255,0.06)` | `border-white/6` |

Nineteen tokens avoided, no fidelity lost.

Gradient stops are similar. `--color-scrim-hero` (`#160e0e`) and
`--color-scrim-gallery` (`#1a1212`) are the opaque bases; rebuild the source's
gradients with opacity modifiers off those.

**Vertical rhythm is also not tokenised.** `custom.css` sets dozens of rem-based
margins and paddings on headings, paragraphs, lists, `hr` and `blockquote`
(`margin: 2.5rem 0 1rem`, `padding-top: 2rem`, `margin: 3rem 0 1.5rem`, …).
Every one of these lands exactly on Tailwind's default 0.25rem spacing scale —
`2rem` is `8`, `2.5rem` is `10`, `1.5rem` is `6`, `3rem` is `12` — so tokenising
them would produce ~40 single-use tokens that each alias a number Tailwind
already has. The handful of em-based ones (`0.3em`, `0.4em` list-item margins)
are font-relative and belong in arbitrary values: `mb-[0.3em]`.

This mapping is only true because both sides are `rem` **and both resolve against the same
root**. It held by luck until item #5 set the root to 62.5%; before that, `2rem` in the source
meant 20px while Tailwind's `8` emitted 32px, and the equivalence above was off by 1.6× — see
"The 10px root".

The tokens exist for values Tailwind *cannot* express: brand colours, the
role-specific type scale, Bootstrap's stepped container, custom easings, and the
odd literal spacings (22px, 42px, 58px) that fall between scale steps.

### Groups

| Group | Count | Notes |
|---|---|---|
| Accent | 9 | the `:root` block (`custom.css:2-11`) + the blog link underline. `--color-accent` is **`#c9a84c`** |
| Surface | 8 | 5 opaque tones + translucent navbar/dropdown fills |
| Scrim | 2 | gradient bases |
| Modal chrome | 3 | backdrop, caption, close |
| Type size | 41 | role-named, with `-md` / `-sm` responsive variants |
| Letter spacing | 8 | `--tracking-body` (0.015em) → `--tracking-eyebrow` (0.18em) |
| Line height | 7 | |
| Radius | 4 | 2px button, 3px card, 4px embed, 50% round |
| Shadow | 9 + 2 text | |
| Spacing | 47 | verbatim px/em, incl. button padding and component sizes |
| Content width | 9 | incl. Bootstrap's 750/970/1170 |
| Hero dimension | 7 | |
| Aspect ratio | 3 | 4/5 portrait, 16/9 wide, 16/10 card |
| Easing | 2 | |
| Blur | 2 | backdrop-filter |
| Animation | 4 | `kenBurns` + three staggered `carouselFadeUp` variants |

213 custom properties in the built CSS. `/tokens` renders them live.

### Namespace traps

Tailwind v4 only generates utilities for values in a **recognised theme
namespace**. Three of these bit during the extraction and are worth knowing:

- **There is no `--size-*` namespace.** Component sizes (modal nav, close
  button, carousel indicators) live under `--spacing-*`, which generates
  `w-*`/`h-*`/`p-*`/`gap-*`. Declared as `--size-close`, the token would emit as
  a CSS variable and generate *nothing* — silently.
- **Do not reuse a built-in token name** unless you intend to repoint every
  existing use of it. `--container-prose` (Tailwind: 65ch) and `--tracking-wide`
  (Tailwind: 0.025em) are both live built-ins; the extracted values are named
  `--container-gallery-prose` and `--tracking-emphasis` to avoid hijacking them.
- **Undefined variants fail silently.** `xl:` and `2xl:` no longer exist, since
  `--breakpoint-*: initial` clears the defaults and only `sm`/`md`/`lg` are
  re-added. `xl:grid-cols-4` emits no CSS and raises no error.

### Button padding

Every CTA variant pads more on the right than the left
(`0.7em 1.8em 0.7em 1.4em` and friends). That asymmetry is deliberate — it
balances the `"\00a0\203A"` chevron `.nav-button::after` appends
(`custom.css:45-49`). Preserve it, or the chevron sits flush against the edge.

### Breakpoints

Tailwind's defaults are cleared and redefined to Bootstrap's values, because the
source's media queries are Bootstrap's boundaries:

| Token | Value | Source |
|---|---|---|
| `sm` | 768px | above `@media (max-width: 767px)` |
| `md` | 992px | above `@media (max-width: 991px)` |
| `lg` | 1200px | Bootstrap lg |

So `col-md-4` → `md:w-1/3` lands on the same pixel. Tailwind's defaults
(640/768/1024/1280) would silently shift every breakpoint.

### `.container`

Defined with `@utility container`, which **replaces** Tailwind's built-in
container. Defining it in a component layer instead would lose — Tailwind's own
container (`width:100%` plus max-width caps) is emitted in the utilities layer,
which outranks components, and every page would get the wrong measure.

## Accent colour

**`--primary-accent` is `#c9a84c` (gold), not `#955251` (marsala).**

`static/css/custom.css:3` overrides the theme's value and loads last
(`layouts/partials/headers.html:65`), so gold is what the site renders. The
theme's marsala `#955251` in `style.marsala.css:3` is dead.

`CLAUDE.md` and several files in `docs/` claimed marsala for a long time; they
were corrected alongside this scaffold. If you see `#955251` anywhere, it is
stale.

## Deferred

- **Netlify** — no `netlify.toml` changes, no branch push. The site stays local
  until the migration is ready to deploy as a whole. Board item #2's acceptance
  criterion "deploy preview responds `X-Robots-Tag: noindex, nofollow`" is
  deferred to that point. When it happens, note that `[[headers]]` in
  `netlify.toml` are **not** context-scoped — a preview-only noindex needs an
  `out/_headers` file generated at build time off the `CONTEXT` env var, and
  branch deploys enabled in the Netlify UI.
- **`app/(fr)/tokens/`** is scaffold tooling for items #4–#9, not public site
  content. Delete it or move it behind a dev-only route before launch.

**Settled since:** the FR/EN route structure was the open question here, and item
#5 resolved it — two top-level route groups, `app/(fr)/*` and `app/(en)/en/*`,
each with its own root layout and `<html lang>`, and no `app/layout.tsx`. Note
the English tree needs the group *and* a literal `en` segment: `app/en/` alone is
not a route group and would have inherited `lang="fr"`. See
`docs/routing-and-chrome.md`.

## Known warnings

- `next build` reports an additional lockfile at the repo root. Harmless — that
  `package.json` is the unrelated GSC indexing tooling.
- `npm audit` flags a moderate postcss advisory inside Next's own vendored
  dependency. `npm audit fix --force` would downgrade Next to 9.3.3; there is no
  real fix path short of an upstream Next release.
- `hugo` warns that the `:filename` permalink token is deprecated (use
  `:contentbasename`). Pre-existing, unrelated to this work.
