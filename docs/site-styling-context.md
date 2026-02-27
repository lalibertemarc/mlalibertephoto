# Site Styling Context

## CSS Variables / Color Scheme

Defined in `static/css/custom.css` under `:root`:

```css
--primary-accent: #955251;      /* Marsala */
--navbar-border-top: #532e2d;
--button-border: #6d3c3b;
--link-focus: #633736;
--form-shadow: rgba(149, 82, 81, 0.6);
--pagination-bg: #d2adad;
--link-hover-bg: #74403f;
--navbar-focus: #c08c8c;
```

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
