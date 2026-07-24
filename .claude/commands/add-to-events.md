Add a blog post's featured image to the events gallery pages.

## Input

The post's folder name under `web/content/blog/` is: $ARGUMENTS

Example: `2026-02-27-butterbuttbutlerlive`

A bare slug is also accepted — match it against the folder names and use the one that ends with it.

## Steps

### 1. Read the post

Read all three files in `web/content/blog/<folder>/`:
- `meta.json` — for the permalinks
- `fr.mdx` — for the French alt and caption
- `en.mdx` — for the English alt and caption

If the folder does not exist, list the folders whose name contains the argument and stop.

### 2. Extract the data

From `meta.json`:
- **permalink (FR)**: the `permalink.fr` value, e.g. `/blog/2026/02/27/butterbuttbutlerlive/`
- **permalink (EN)**: the `permalink.en` value, e.g. `/en/blog/2026/02/27/butterbuttbutlerlive/`

Use these **verbatim**. Do not rebuild a URL from the date and slug: the stored permalink is what
the route actually serves, and re-deriving it is how a Y/M/D drifts by a day across a timezone
offset.

From `fr.mdx`:
- **first image src**: the `src` of the first `<ImageModal>` in the body
- **alt (FR)** and **caption (FR)**: that same `ImageModal`'s `alt` and `caption`

From `en.mdx`:
- **alt (EN)** and **caption (EN)**: the corresponding `ImageModal`'s `alt` and `caption`

Also decide a short **display title** for the gallery cell — the band or event name (e.g.
`ButterButtButler`), not the full descriptive header.

### 3. Add the entry to the French events page

Open `web/content/pages/photos/events/fr.mdx`. Insert a new line immediately after the
`<Gallery>` opening tag — newest first:

```mdx
<ImageModal src={"<first image src>"} title={"<display title>"} alt={"<alt FR>"} caption={"<caption FR>"} buttonUrl={"<permalink.fr>"} />
```

Every prop is a JSX expression wrapping a double-quoted string — `src={"…"}`, never
`src="…"`. `web/scripts/fetch-image-dimensions.ts` harvests image URLs by matching that exact
form, and the prop is `buttonUrl`, not Hugo's `button-url`.

The events page also contains a `<FlexImages>` block holding a `<NavButton>` near the top. That
is not the gallery — insert into the `<Gallery>` further down.

### 4. Add the entry to the English events page

Same insertion in `web/content/pages/photos/events/en.mdx`, at the top of its `<Gallery>`, with:
- the same `src` and the same `title`
- `alt` and `caption` from `en.mdx`
- `buttonUrl` = **`permalink.en`** (the `/en/`-prefixed one)

Linking the English cell at the French URL is the easy mistake here; it costs the reader a
language switch mid-visit.

### 5. Validate

```bash
npm --prefix web run validate:content
```

The image already entered `web/lib/image-dimensions.json` when the post was created, so no
dimension refresh is needed. If the URL is somehow absent from that manifest, run
`npm --prefix web run images:dimensions`.

### 6. Report results

Output:
- Confirmation that both events pages were updated
- The image used and both permalinks
- A reminder to preview `/photos/events/` and `/en/photos/events/`

## Important rules

- Always insert at the **top** of the gallery (newest first).
- `buttonUrl` links to the blog post so visitors can see more photos — French page to the French URL, English page to the English URL.
- The `title` should be a short name (e.g. band name, event name), not the full descriptive header.
- Reuse the existing `alt` and `caption` from each language's MDX file — do not invent new ones.
- Do NOT modify anything else in the events pages.
