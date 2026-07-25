# Site Styling Context

## CSS Variables / Color Scheme

Defined in `static/css/custom.css` under `:root`:

```css
--primary-accent: #c9a84c;      /* Gold */
--navbar-border-top: #8a7233;
--button-border: #a8893e;
--link-focus: #9a7d38;
--form-shadow: rgba(201, 168, 76, 0.6);
--pagination-bg: #e0d3a3;
--link-hover-bg: #b09542;
--navbar-focus: #d4bf7a;
```

> The palette is **gold**, not marsala. `custom.css` loads after
> `style.marsala.css` (see load order below), so these values win over the
> theme's `#955251` family. Earlier revisions of this doc listed the marsala
> values; they were never what the site rendered.

## CSS Load Order

1. **Bootstrap 3.3.7** — CDN (`maxcdn.bootstrapcdn.com`)
2. **Font Awesome 6.6.0** — CDN
3. **animate.css** — CSS animations library
4. **style.marsala.css** — theme stylesheet (3581 lines), includes all component styles
5. **custom.css** — project overrides (CSS variables, flex-images, nav-button, modal, carousel modern)
6. **Owl Carousel CSS** — `owl.carousel.css` (core) + `owl.theme.css` (pagination)

## JS Load Order

1. **jQuery 3.1.1** — CDN
2. **Bootstrap 3.3.7 JS** — CDN
3. **jQuery Cookie** — cookie handling
4. **Waypoints** — scroll-triggered events
5. **Counter-Up** — animated number counters
6. **jQuery Parallax** — parallax scrolling
7. **Owl Carousel 1.3.2** — carousel plugin
8. **front.js** — theme custom JS (386 lines), initializes all plugins

## Google Fonts

- **Roboto**: weights 100, 300, 400, 500, 700, 800

## Custom Components in `custom.css`

| Component | Purpose |
|-----------|---------|
| `.flex-images` | Flexible image grid layout (shortcode) |
| `.nav-button` | Styled CTA buttons with hover effects |
| `.modal` / `.modal-content` | Click-to-enlarge image overlay |
| `.click-to-enlarge` | Hover scale effect on modal triggers |
| `.home-carousel--modern *` | Modern carousel overrides (full-bleed, gradient, animations) |

## Theme Override Pattern

Files in `layouts/` override identically-pathed files in `themes/hugo-universal-theme/layouts/`. Key overrides:
- `layouts/index.html` — homepage
- `layouts/_default/single.html` — single page template
- `layouts/partials/carousel.html` — homepage carousel
- `layouts/partials/headers.html` — CSS/meta includes

## Key Partials

- **`headers.html`** — loads CSS, meta tags, Google Fonts, analytics
- **`scripts.html`** — loads JS at page bottom (jQuery, Bootstrap, plugins, front.js)
