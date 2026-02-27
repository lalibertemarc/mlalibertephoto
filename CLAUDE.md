# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Professional photography portfolio for Marc Laliberte (marclaliberte.photos). Built with **Hugo** static site generator, deployed on **Netlify**. Bilingual site (French primary, English secondary).

## Build & Development Commands

```bash
# Local dev server
hugo server

# Production build (same as Netlify)
hugo --gc --minify --environment production

# Create new bilingual blog post
./newBlog.sh post-slug-name

# Create new bilingual page
./newPage.sh path/page-name
```

Hugo version: **0.147.4** (pinned in netlify.toml).

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
- Key overrides: `index.html`, `_default/single.html`, `partials/carousel.html`, `partials/headers.html`

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
- Custom overrides in `static/css/custom.css` using CSS variables (e.g., `--primary-accent: #955251`)

## External Services
- **Cloudinary**: image hosting (images referenced via `res.cloudinary.com` URLs)
- **Formspree**: contact form backend (endpoint `mjkyajaa`)
- **Google Analytics** (G-DT1RL3KDNZ) and **Google Tag Manager** (GTM-TNS3FT57)

## Configuration
- Main config: `hugo.toml` — contains site params, menu structure per language, taxonomy settings
- Deployment: `netlify.toml` — build command, Hugo version, redirects
- Markdown rendering allows unsafe HTML (`[markup.goldmark.renderer] unsafe = true`) for embedded content (Facebook posts, iframes)

## Detailed Documentation
- `docs/carousel-implementation.md` — carousel architecture, data flow, JS init, and CSS details
- `docs/site-styling-context.md` — CSS/JS load order, color scheme, custom components, override patterns
- `docs/gallery-pages.md` — dark gallery layout, CSS Grid, hover overlays, modal navigation

## Rules

### Document-as-you-explore
When exploring a flow, system, or area of the codebase that is **not already covered** by an existing doc in `docs/`, you **must**:
1. Create a new Markdown file in `docs/` describing your findings (e.g., `docs/contact-form-flow.md`).
2. Add a reference to it in the **Detailed Documentation** section above.

This ensures future sessions can reuse the knowledge without re-exploring the same code.
