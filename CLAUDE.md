
## Commands

```bash
hugo server -D          # Local dev server with drafts at http://localhost:1313
hugo --gc --minify      # Production build (outputs to public/)
```

- Hugo version: `0.147.4` (pinned in `netlify.toml`)
- Deployed via **Netlify** — pushes to `master` trigger automatic builds

## Architecture

### Bilingual Content System
- **Default language**: French (`fr`), English is secondary (`en`)
- Content lives in `content/fr/` and `content/en/` with matching file structures
- French URLs: `/blog/`, `/photos/portraits` — English URLs: `/en/blog/`, `/en/photos/portraits`
- UI strings in `i18n/en.yaml` and `i18n/fr.yaml`
- Data files (`data/carousel/`, `data/features/`, `data/testimonials/`) use nested keys for each language (e.g., `title.en`, `title.fr`)

### Theme & Template Overrides
- Base theme: `hugo-universal-theme` (git submodule in `themes/`), Bootstrap 3.3.7-based
- Overridden templates live in `layouts/` and take precedence over `themes/hugo-universal-theme/layouts/`
- Key overrides: `index.html`, `_default/single.html`, and partials: `breadcrumbs.html`, `carousel.html`, `headers.html`, `nav.html`, `features.html`, `testimonials.html`, `see_more.html`, `recent_posts.html`, `footer.html`

### Custom Shortcodes (`layouts/shortcodes/`)
- `image-modal` — click-to-enlarge image with modal (supports `class` param for BEM modifiers)
- `gallery` — wrapper shortcode for photo gallery grid (creates `.photo-gallery` CSS Grid container)
- `fleximages` — flexible image grid layout
- `before-after` — before/after image comparison slider
- `navbutton` — styled CTA buttons

### Data-Driven Homepage Sections
Homepage sections pull from YAML files in `data/`:
- `data/carousel/*.yaml` — homepage carousel slides (ordered by `weight`)
- `data/features/*.yaml` — service feature cards
- `data/testimonials/*.yaml` — client testimonials

### Styling
- Theme color scheme: "marsala" (configured in `hugo.toml` under `[params]`)
- Custom overrides in `static/css/custom.css` using CSS variables
- **Accent is `--primary-accent: #c9a84c` (gold).** `custom.css:3` overrides the marsala theme's `#955251` and loads last (`headers.html:65`), so gold is what renders. Any `#955251` reference elsewhere is stale.

## External Services
- **Cloudinary**: image hosting (images referenced via `res.cloudinary.com` URLs)
- **Formspree**: contact form backend (endpoint `mjkyajaa`)
- **Google Analytics** (G-DT1RL3KDNZ) and **Google Tag Manager** (GTM-TNS3FT57)

## Configuration
- Config directory: `config/_default/` — split into `hugo.toml` (core settings), `languages.toml`, `menus.toml` (menu structure per language), `params.toml` (site params), `permalinks.toml`
- Deployment: `netlify.toml` — build command, Hugo version, redirects
- Markdown rendering allows unsafe HTML (`[markup.goldmark.renderer] unsafe = true`) for embedded content (Facebook posts, iframes)

## Detailed Documentation
You **must** consult these files before launching any exploration related to these topics.
- `docs/carousel-implementation.md` — carousel architecture, data flow, JS init, and CSS details
- `docs/site-styling-context.md` — CSS/JS load order, color scheme, custom components, override patterns
- `docs/gallery-pages.md` — dark gallery layout, CSS Grid, hover overlays, modal navigation
- `docs/homepage-redesign.md` — dark homepage design tokens, section classes, CSS scoping, i18n keys
- `docs/blog-post-styling.md` — blog post rendering flow, dark-blog vs dark-gallery CSS, typography hierarchy
- `docs/nextjs-scaffold.md` — Next.js app in `web/`, static-export config, design token extraction and conventions
- `docs/content-migration.md` — Hugo→MDX migration script, the URL contract and why dates never become `Date` objects, shortcode/raw-HTML transforms, known data quirks
- `docs/bootstrap-dependency-map.md` — which Bootstrap 3 classes/JS the site actually uses, Tailwind mapping, dead code
- `docs/mdx-components.md` — the five MDX components replacing the Hugo shortcodes, the Cloudinary loader and dimension manifest, modal architecture, next-intl wiring, and the shortcode bugs fixed during the port
- `docs/routing-and-chrome.md` — the FR/EN route groups and why `app/en/` cannot work, the thin-shim pattern, why all of `next-intl/server` is unusable and what replaces it, the language switcher and the taxonomy gap, and the nav/footer/heading port (including the ~half of `nav.html` that is unreachable)
- `docs/seo-contract.md` — every head tag Hugo emits and under what condition, the sitemap/robots/RSS artifact shapes, the four analytics wirings, the dead code and live bugs, the deliberate deviations the Next port makes, and the `web/lib/seo/` implementation (including the four things Next's Metadata API cannot express and the taxonomy slug rules)
- `docs/blog-port.md` — the blog surface in Next: the MDX `evaluate()` seam and why the compiled component is called as a function, the four content readers and why they don't share a body, the slash-containing term slug, the percent-encoded-params trap that renders 404s into correctly-named files, Hugo's term title-casing (99 of 129 terms), the `page/1` alias redirects, and the full head-tag parity results
- `docs/homepage-port.md` — the five homepage sections in Next, why the Embla carousel toggles its active class imperatively (and the forced reflow that makes loop animations replay), Owl's real 5000ms autoplay interval vs the 2000ms transition, the three places `custom.css` disagrees with what actually renders (the gold section rule, testimonial padding, Bootstrap's line-heights — now in `globals.css`), the Bootstrap grid mapping, and the date formatter's timezone trap

## Rules

### Document-as-you-explore
When exploring a flow, system, or area of the codebase that is **not already covered** by an existing doc in `docs/`, you **must**:
1. Create a new Markdown file in `docs/` describing your findings (e.g., `docs/contact-form-flow.md`).
2. Add a reference to it in the **Detailed Documentation** section above.

This ensures future sessions can reuse the knowledge without re-exploring the same code.
