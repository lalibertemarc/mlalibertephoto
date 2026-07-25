Convert a blog post's photo layout from the `FlexImages` component to the `Gallery` grid.

## Input

The argument is: $ARGUMENTS

Format: `<folder-name>` — the post's folder under `web/content/blog/`, e.g. `2025-05-30-cedarwaxwing2`.
A bare slug is also accepted; match it against the folder names.

## Why this still exists

`FlexImages` and `Gallery` are both live components (`web/components/mdx/`), not legacy
shortcodes. `FlexImages` is a flex row; `Gallery` is the 3/2/1-column CSS grid with hover
overlays and modal navigation between its images. About 29 migrated posts still lay their photos
out with `FlexImages` because that is what they used in Hugo, and converting one to `Gallery` is
still a real editorial choice.

`FlexImages` is **not** dead, though, which is what makes this a judgement call rather than a
find-and-replace: it is also the wrapper around the standalone `<NavButton>` call-to-action on
the restoration, videos, smsPrices and photos pages, and on several blog posts. Swapping one of
those to `Gallery` would put a lone button in a photo grid.

## Steps

### 1. Locate the post

Read `web/content/blog/<folder>/fr.mdx` and `en.mdx`. If the folder does not exist, list the
folders whose name contains the argument and stop.

### 2. Classify every `FlexImages` block

For each `<FlexImages>` … `</FlexImages>` block in each file, decide what it holds:

- **Contains one or more `<ImageModal>`** → a photo layout. Convert it.
- **Contains only a `<NavButton>`** (and whitespace) → a call-to-action wrapper. **Leave it alone.**

Blocks can nest — `2025-10-08-butterbuttbutler` has a `FlexImages` inside a `FlexImages` — so
match opening and closing tags by depth rather than by line order, and report what you found
before changing anything.

If a file has no convertible block, say so and skip that file rather than editing it.

### 3. Convert

In each convertible block:

- Replace the opening `<FlexImages>` with `<Gallery>` and its matching `</FlexImages>` with `</Gallery>`.
- **Delete any `<br />` sitting between the `ImageModal` calls.** They were spacers for the flex row; `Gallery` is a grid that spaces its own cells, and a stray `<br />` becomes an empty grid cell.
- Leave every `ImageModal` prop untouched. `width` and `height` are inert inside a `Gallery` — the cell owns the box — so removing them changes nothing and only makes the diff harder to read.
- Change nothing outside the block: no frontmatter, no body text, no `meta.json`.

Convert the French and English files the same way. They should end up with the same structure —
if one has a convertible block and the other does not, stop and report it, because the two
languages have drifted and that is worth a human look.

### 4. Validate

```bash
npm --prefix web run validate:content
```

Frontmatter is untouched by this operation, so the real check is that the bodies still compile —
`npm --prefix web run build` does that, or view the post in `npm --prefix web run dev`.

### 5. Report results

Output:
- Which files were converted, and how many blocks in each
- Which blocks were deliberately left as `FlexImages`, and why (NavButton wrapper)
- Which files were skipped entirely
- How many `<br />` spacers were removed
