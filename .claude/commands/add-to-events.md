Add a blog post's featured image to the events gallery pages.

## Input

The blog post filename (without `.md`) is: $ARGUMENTS

Example: `butterButtButlerLive`

## Steps

### 1. Read the blog post files

- Read `content/fr/blog/<filename>.md` and `content/en/blog/<filename>.md`.
- If either file doesn't exist, stop and report the error.

### 2. Extract data from the blog posts

From the French blog post, extract:
- **first image src**: The `src` of the first `image-modal` shortcode in the content body.
- **date**: The `date` field from frontmatter (needed to build the permalink).
- **title**: A short display title for the gallery entry (use the band/subject name, not the full header).
- **alt (FR)**: The `alt` of the first `image-modal` in the French post.
- **caption (FR)**: The `caption` of the first `image-modal` in the French post.

From the English blog post, extract:
- **alt (EN)**: The `alt` of the first `image-modal` in the English post.
- **caption (EN)**: The `caption` of the first `image-modal` in the English post.

### 3. Build the blog post permalink

The permalink pattern is `/blog/:year/:month/:day/:filename/`.

Using the `date` from frontmatter, construct the URL:
- `/blog/YYYY/MM/DD/<filename>/`

Example: date `2026-02-27T14:30:00-05:00` + filename `butterButtButlerLive` → `/blog/2026/02/27/butterButtButlerLive/`

### 4. Add entry to the French events page

- Open `content/fr/photos/events.md`.
- Insert a new `image-modal` block at the **top** of the `{{< gallery >}}` section (right after the `{{< gallery >}}` line), with:
  - `src` = first image src
  - `title` = short display title
  - `alt` = French alt text
  - `caption` = French caption text
  - `button-url` = blog post permalink

### 5. Add entry to the English events page

- Open `content/en/photos/events.md`.
- Insert a new `image-modal` block at the **top** of the `{{< gallery >}}` section, with:
  - `src` = first image src
  - `title` = same short display title
  - `alt` = English alt text
  - `caption` = English caption text
  - `button-url` = same blog post permalink

### 6. Report results

Output:
- Confirmation that both events pages were updated
- The image used and the permalink generated
- A reminder to preview both `/photos/events` and `/en/photos/events` pages

## Important rules

- Always insert at the **top** of the gallery (newest first).
- The `button-url` links to the blog post so visitors can see more photos.
- The `title` should be a short name (e.g. band name, event name), not the full descriptive header.
- Reuse the existing `alt` and `caption` from each language's blog post — do not invent new ones.
- Do NOT modify anything else in the events pages.
