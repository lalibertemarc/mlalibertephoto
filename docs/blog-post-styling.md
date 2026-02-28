# Blog Post Styling — Dark Blog System

## Rendering Flow

1. `layouts/_default/single.html` renders all single-content pages
2. `layouts/partials/breadcrumbs.html` renders the heading banner (overrides theme version)
3. Blog section pages auto-detect via `{{ eq .Section "blog" }}`

## Class Application

### `dark-blog` on `#blog-post`
- Applied automatically in `single.html` when the page is in the `blog` section and no `page_class` frontmatter is set
- Template logic: if `page_class` is empty and section is `blog`, sets `page_class = "dark-blog"`
- Pages with explicit `page_class` (e.g., `dark-gallery`) keep their own class

### `dark-heading` on `#heading-breadcrumbs`
- Applied in `layouts/partials/breadcrumbs.html` when section is `blog` or `page_class` contains `"dark"`
- Replaces the theme's gray textured banner with solid `#1a1212` background

## `dark-blog` vs `dark-gallery`

| Element | `dark-gallery` | `dark-blog` |
|---------|---------------|-------------|
| h2 | 0.8rem uppercase muted label | 1.5rem prominent section header |
| Paragraphs | Centered, max-width 640px | Left-aligned, full content flow |
| Images | CSS Grid (`.photo-gallery`) | Flexbox (`.flex-images`) |
| Background | `::before` pseudo on `#post-content` | `::before` pseudo on `#blog-post` (fixed, full viewport) |
| Purpose | Portfolio/gallery showcase | Editorial blog content |

## CSS Sections (in `custom.css`)

All appended after the homepage responsive rules:

- **A. Dark heading** — `#heading-breadcrumbs.dark-heading`: solid dark bg, white Roboto 300 title, no texture
- **B. Full-bleed background** — `#blog-post.dark-blog::before` and `#blog-post.dark-gallery::before`: fixed pseudo-element covers viewport
- **C. Blog typography** — `.dark-blog #post-content`: left-aligned paragraphs, prominent h2/h3, gold links, gold-bordered blockquotes
- **D. Metadata** — `.dark-blog .text-muted`: muted author/date line
- **E. Media** — `.dark-blog .flex-images img`, `.dark-blog iframe`: shadows for depth on dark bg
- **F. Responsive** — Mobile adjustments for font sizes

## Typography Hierarchy

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Page title (breadcrumbs h1) | 2rem | 300 | `#fff` |
| Section header (h2) | 1.5rem | 400 | `rgba(255,255,255,0.9)` |
| Subsection (h3) | 1.15rem | 400 | `rgba(255,255,255,0.8)` |
| Body text (p) | 1.05rem | 300 | `rgba(255,255,255,0.75)` |
| Metadata | 0.8rem | 300 | `rgba(255,255,255,0.45)` |
| Bold/strong | inherit | inherit | `#fff` |
| Links | inherit | inherit | `var(--primary-accent)` gold |

## Files Involved

- `layouts/_default/single.html` — template with dark-blog auto-detection
- `layouts/partials/breadcrumbs.html` — override with dark-heading conditional
- `static/css/custom.css` — all dark-blog styles (appended at end)
