# Homepage Dark Redesign

Extends the dark editorial aesthetic from the carousel and gallery pages to all remaining homepage sections: navbar, features, testimonials, CTA, recent posts, and footer.

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Dark BG 1 | `#1a1212` | Features, CTA |
| Dark BG 2 | `#1e1414` | Testimonials, Recent Posts |
| Footer BG | `#151010` | Footer |
| Copyright BG | `#0f0b0b` | Copyright bar |
| Body text | `rgba(255,255,255,0.85)` | Primary text |
| Muted text | `rgba(255,255,255,0.6)` | Descriptions, subtitles |
| Label text | `rgba(255,255,255,0.45)` | Section headers |
| Accent | `var(--primary-accent)` / `#955251` | Icons, active states, hover |
| Border subtle | `rgba(255,255,255,0.06)` | Card borders, dividers |
| Border hover | `rgba(255,255,255,0.15)` | Hover states |

## Section Class Names

| Section | Root Class | BEM Children |
|---------|-----------|-------------|
| Navbar | `.navbar-default` (overridden) | Standard Bootstrap selectors |
| Features | `.hp-features` | `.hp-feature-card`, `__icon`, `__title`, `__text` |
| Testimonials | `.hp-testimonials` | `.hp-testimonial-card`, `__quote-icon`, `__text`, `__author` |
| CTA | `.hp-cta` | `__title`, `__subtitle`, `__button` |
| Recent Posts | `.hp-recent-posts` | `.hp-blog-card`, `__image`, `__overlay`, `__content`, `__meta`, `__summary` |
| Footer | `.hp-footer` | `__contact-btn` |
| Copyright | `.hp-copyright` | — |
| Shared | `.hp-section-label`, `.hp-section-subtitle`, `.hp-outline-button` | — |

## CSS Scoping Strategy

All homepage dark styles live in `static/css/custom.css`, appended after the existing carousel and gallery sections. Sections use unique class names (`hp-*`) to avoid collisions with theme defaults. The navbar overrides target Bootstrap's `.navbar-default` directly since the navbar is global.

Footer and copyright use combined selectors (`#footer.hp-footer`, `#copyright.hp-copyright`) to ensure specificity over theme defaults without `!important`.

## i18n Keys

Added to both `i18n/fr.yaml` and `i18n/en.yaml`:

- `featuresTitle` / `featuresSubtitle` — Features section header
- `ctaTitle` / `ctaSubtitle` / `ctaLink` / `ctaButtonText` — CTA section

## Config Changes

In `config/_default/params.toml`:
- `[features] enable = true`
- `[see_more] enable = true` (stripped of default English text; now uses i18n keys)

## Template Overrides

| File | Notes |
|------|-------|
| `layouts/partials/features.html` | Replaced `background-white` with `hp-features`, added BEM cards, i18n section header |
| `layouts/partials/testimonials.html` | Replaced `background-pentagon` with `hp-testimonials`, removed empty avatar img, restructured card layout |
| `layouts/partials/see_more.html` | New override — minimal centered CTA, all text from i18n |
| `layouts/partials/recent_posts.html` | Replaced with `hp-recent-posts`, new blog card structure with image overlay |
| `layouts/partials/footer.html` | New override — added `hp-footer` and `hp-copyright` classes |
