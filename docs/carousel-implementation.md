# Carousel Implementation Details

## Template Structure

**File:** `layouts/partials/carousel.html` (overrides theme)

The carousel is gated by `site.Params.CarouselHomepage.enable`. It iterates over all YAML files in `data/carousel/`, sorts by `weight`, and renders bilingual content using `site.Language.Lang` to index into nested title/description/alt/contactText maps.

### Modern Layout (as of Feb 2026)

Each slide is a full-bleed image with text overlay at bottom-left:
- `.carousel-slide` — relative container
- `.carousel-image` — `object-fit: cover` full-bleed background image
- `.carousel-gradient` — bottom-heavy gradient for text readability
- `.carousel-overlay` — absolutely positioned text block (bottom-left)
- `.home-carousel--modern` modifier class scopes all CSS overrides

Uses `container-fluid` for edge-to-edge imagery. The `.dark-mask` and two-column Bootstrap grid from the old layout have been removed.

## Data Files

**Location:** `data/carousel/*.yaml`

4 slides:
| File | Weight | Title (FR) |
|------|--------|------------|
| portraits.yaml | 1 | Portraits |
| events.yaml | 2 | Evenements |
| resauration.yaml | 3 | Restauration de photos |
| videos.yaml | 4 | Videos |

**Fields per slide:**
- `weight` — sort order
- `title.fr` / `title.en` — slide heading
- `description.fr` / `description.en` — HTML (typically `<ul>` list)
- `contactText.fr` / `contactText.en` — CTA button text
- `image` — Cloudinary URL
- `alt.fr` / `alt.en` — image alt text
- `href` — link target (relative URL, opens in same tab for internal links)

Images should be high-resolution landscape photos (at least 1920px wide) since they display full-bleed at up to 75vh height. Use Cloudinary transformations (e.g. `w_1920,c_fill,g_auto,q_auto,f_auto`) for optimization.

## JS Initialization

**File:** `themes/hugo-universal-theme/static/js/front.js` (lines ~96-136)

Uses **Owl Carousel 1.3.2** jQuery plugin:
- Reads `data-autoplay`, `data-slide-speed`, `data-pagination-speed` from the `.homepage` div
- Config: `singleItem: true`, `autoPlay` (speed from data attr), `stopOnHover: true`
- Pagination dots enabled, navigation arrows disabled
- The `.active` class is added to the current slide by Owl Carousel

## Carousel Params

**File:** `config/_default/params.toml`

```toml
[carouselHomepage]
enable = true
auto_play = true
slide_speed = 2000
pagination_speed = 1000
```

## CSS Architecture

### Theme base CSS
**File:** `themes/hugo-universal-theme/static/css/style.marsala.css` (lines 1159-1240)

Defines `.home-carousel` base styles, `.dark-mask` overlay (0.9 opacity marsala), owl-carousel padding, heading typography (uppercase, bold, large), and responsive breakpoints.

### Modern overrides
**File:** `static/css/custom.css`

All modern carousel styles are scoped under `.home-carousel--modern` to avoid conflicts with base theme CSS. Includes:
- Full-bleed image layout with `object-fit: cover`
- Bottom-heavy gradient (replaces flat marsala mask)
- Ken Burns slow zoom effect on active slides
- Staggered entrance animations for text elements
- Line-style pagination indicators (replaces round dots)
- Responsive breakpoints for mobile/tablet/desktop

### Owl Carousel CSS
- `owl.carousel.css` — v1.3.2 core styles
- `owl.theme.css` — pagination dot styles (overridden by modern CSS)
