# Gallery Pages Architecture

Documents the dark-gallery editorial layout used on portfolio pages (portraits, events, wildlife).

## Overview

Gallery pages use a dark-background, CSS Grid-based editorial layout with hover-reveal overlays. This matches the cinematic style of the homepage carousel while providing an optimal image browsing experience.

The `dark-gallery` class is also used on non-gallery pages (restoration, videos) for visual consistency. These pages don't use the `{{< gallery >}}` shortcode or photo grid — they rely on the dark-gallery typography, before-after slider, and iframe styles instead.

## How It Works

### Front Matter

Gallery pages add `page_class = "dark-gallery"` to their TOML front matter. The `single.html` template renders this as a class on the `#blog-post` div:

```html
<div id="blog-post" class="dark-gallery">
```

This class scopes all dark gallery CSS without affecting other pages.

### Shortcodes

#### `{{< gallery >}}...{{< /gallery >}}`

Wrapper shortcode (`layouts/shortcodes/gallery.html`) that creates a `.photo-gallery` div. This div becomes a CSS Grid container. Place `image-modal` calls inside it.

#### `{{< image-modal >}}` class parameter

The `image-modal` shortcode accepts an optional `class` param. The value is appended as a BEM modifier: `enlargeable-image--{value}`. Currently used values:
- `class="wide"` — makes the image span the full grid width (`grid-column: 1/-1`) with 16:9 aspect ratio. Use for group photos and panoramic shots.

### Content Structure Pattern

```markdown
+++
page_class = "dark-gallery"
+++

Intro text...

{{< fleximages >}}
{{< navbutton url="/contact" text="CTA text" >}}
{{< /fleximages >}}

<hr>

## Section Title
{{< gallery >}}
{{< image-modal src="..." title="..." alt="..." caption="..." button-url="..." >}}
{{< image-modal src="..." title="..." alt="..." caption="..." >}}
{{< /gallery >}}

<hr>
{{< fleximages >}}
{{< navbutton url="/contact" text="CTA text" >}}
{{< /fleximages >}}
```

Key rules:
- Image groups use `{{< gallery >}}`, NOT `{{< fleximages >}}`
- CTA button groups still use `{{< fleximages >}}`
- No `width="..."` on image-modals inside galleries (the grid handles sizing)
- Group/panoramic photos get `class="wide"`
- No `<br>` tags between images

## CSS Architecture

All gallery styles are in `static/css/custom.css`, scoped under `.dark-gallery` and `.photo-gallery`.

### Full-bleed dark background
Uses `calc(-50vw + 50%)` breakout technique on `#post-content::before` pseudo-element to extend the dark background (#1a1212) edge-to-edge regardless of container width.

### Grid Layout
- **Desktop (>991px)**: 3 columns, 6px gap
- **Tablet (≤991px)**: 2 columns, 6px gap
- **Mobile (≤767px)**: 1 column, 12px gap

### Image Cards
- `aspect-ratio: 4/5` (portrait orientation) with `object-fit: cover`
- Wide images: `aspect-ratio: 16/9`, `grid-column: 1/-1`
- Hover: 1.04 scale zoom over 0.5s

### Hover Overlays
- Gradient overlay via `::after` pseudo-element (transparent → dark bottom)
- Title and "view shoot" button fade in with translateY animation
- On mobile: hover overlays disabled, titles always visible below image

### Typography
- Section headers (h2): small uppercase, muted (`rgba(255,255,255,0.45)`), centered, with top-border divider
- Body text: Roboto 300, muted white, centered, max-width 640px
- CTA buttons: outline style (transparent bg, white border) matching carousel CTAs

## Modal Navigation

The `image-modal` shortcode includes prev/next navigation for images within a `.photo-gallery`:
- Prev/next arrow buttons appear when modal is opened from a gallery
- Keyboard: Left/Right arrows navigate, Escape closes
- Touch: swipe left/right to navigate
- Counter shows "X / Y" position
- Navigation wraps around (last → first, first → last)
- Non-gallery images (e.g., in blog posts) open the modal without navigation

## Files Involved

| File | Role |
|------|------|
| `layouts/shortcodes/gallery.html` | `.photo-gallery` wrapper div |
| `layouts/shortcodes/image-modal.html` | Image card + modal + navigation JS |
| `layouts/_default/single.html` | `page_class` front matter → class attribute |
| `static/css/custom.css` | All gallery CSS (search for "Dark Gallery") |
| `content/{fr,en}/photos/portraits.md` | Portrait gallery content |
| `content/{fr,en}/photos/events.md` | Events gallery content |
| `content/{fr,en}/photos/wildlife.md` | Wildlife gallery content |
| `content/{fr,en}/restoration.md` | Restoration service page (dark-gallery, before-after sliders) |
| `content/{fr,en}/videos.md` | Video portfolio page (dark-gallery, YouTube iframes) |
